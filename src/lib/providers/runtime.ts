import "server-only";
/**
 * Process-wide provider runtime for API routes: adapters from the registry + the internal catalogue,
 * one polite HTTP client (shared per-host rate limits), one aggregator (cache + health), and the
 * admin's enable/disable decisions read from the `providers` table (public, non-secret; cached 60 s).
 */
import { Aggregator } from "./aggregator";
import { PoliteHttp } from "./http";
import { buildAdapters, REGISTRY_ONLY } from "./registry";
import { catalogAdapter } from "./adapters/catalog";
import { catalogRepository } from "@/lib/catalog/repo";
import type { ProviderAdapter } from "./types";

let runtime: { adapters: ProviderAdapter[]; http: PoliteHttp; aggregator: Aggregator } | null = null;
let enabledCache: { at: number; map: Map<string, boolean> | null } = { at: 0, map: null };

export async function providerSettings(): Promise<Map<string, boolean> | null> {
  if (Date.now() - enabledCache.at < 60_000) return enabledCache.map;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let map: Map<string, boolean> | null = null;
  if (url && anon) {
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/providers?select=id,enabled`, { headers: { apikey: anon, authorization: `Bearer ${anon}` }, cache: "no-store", signal: AbortSignal.timeout(3000) });
      if (r.ok) map = new Map(((await r.json()) as Array<{ id: string; enabled: boolean }>).map((p) => [p.id, p.enabled]));
    } catch { /* database unavailable: registry defaults apply */ }
  }
  enabledCache = { at: Date.now(), map };
  return map;
}
export const invalidateProviderSettings = () => { enabledCache = { at: 0, map: null }; };

export function providerRuntime() {
  if (!runtime) {
    const http = new PoliteHttp();
    const catalog = catalogAdapter(async (q, limit) => (await catalogRepository().searchComponents({ q, pageSize: limit })).items);
    const adapters = [catalog, ...buildAdapters(process.env)];
    const aggregator = new Aggregator(adapters, http, {
      timeoutMs: 8000,
      isEnabled: (a) => enabledCache.map?.get(a.meta.id) ?? a.meta.defaultEnabled,
    });
    runtime = { adapters, http, aggregator };
  }
  return runtime;
}

export const registryOnly = () => REGISTRY_ONLY;
