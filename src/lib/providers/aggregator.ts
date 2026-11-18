/**
 * Query every enabled provider in parallel. One provider failing, timing out or lacking credentials
 * never blocks the others; each outcome is reported so the UI can say which sources were searched.
 * No fallback results are invented.
 */
import { TtlCache } from "./cache";
import { PoliteHttp } from "./http";
import type { ProviderAdapter, ProviderQuery } from "./types";
import type { Offer, ProviderOutcome } from "@/lib/parts/types";

export interface Health { lastSuccessAt: string | null; lastError: string | null; lastErrorAt: string | null; ok: number; failed: number }

const CACHE_TTL: Record<string, number> = { "manufacturer-store": 6 * 3600e3, "retailer-feed": 6 * 3600e3, "distributor-feed": 6 * 3600e3, "web-search": 3600e3, "marketplace-api": 15 * 60e3, "internal-catalog": 60e3 };

export class Aggregator {
  readonly health = new Map<string, Health>();
  private readonly cache = new TtlCache<Offer[]>(1000);
  constructor(private readonly adapters: ProviderAdapter[], private readonly http = new PoliteHttp(), private readonly opts: { timeoutMs?: number; isEnabled?: (a: ProviderAdapter) => boolean; onRun?: (providerId: string, outcome: ProviderOutcome) => void } = {}) {}

  private record(id: string, ok: boolean, error?: string) {
    const h = this.health.get(id) ?? { lastSuccessAt: null, lastError: null, lastErrorAt: null, ok: 0, failed: 0 };
    const now = new Date().toISOString();
    if (ok) { h.ok++; h.lastSuccessAt = now; } else { h.failed++; h.lastError = error ?? "error"; h.lastErrorAt = now; }
    this.health.set(id, h);
  }

  async search(query: ProviderQuery, outer?: AbortSignal): Promise<{ offers: Offer[]; sources: ProviderOutcome[] }> {
    const timeoutMs = this.opts.timeoutMs ?? 8000;
    const searchable = this.adapters.filter((a) => a.search);
    const runs = searchable.map(async (a): Promise<{ offers: Offer[]; outcome: ProviderOutcome }> => {
      const id = a.meta.id;
      if (!(this.opts.isEnabled?.(a) ?? a.meta.defaultEnabled)) return { offers: [], outcome: { providerId: id, status: "skipped", reason: "disabled" } };
      const conf = a.configured();
      if (!conf.ok) return { offers: [], outcome: { providerId: id, status: "not-configured", missing: conf.missing } };
      const key = `${id}|${query.q.toLowerCase().trim()}|${query.category ?? ""}|${query.includeUsed ? 1 : 0}|${query.limit}`;
      const hit = this.cache.get(key, CACHE_TTL[a.meta.type] ?? 3600e3);
      if (hit) return { offers: hit.value, outcome: { providerId: id, status: "ok", count: hit.value.length, ms: 0, cached: true } };
      const ctrl = new AbortController();
      const onOuter = () => ctrl.abort();
      outer?.addEventListener("abort", onOuter);
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const t0 = Date.now();
      try {
        const offers = await Promise.race([
          a.search!(query, { signal: ctrl.signal, http: this.http, now: () => new Date() }),
          new Promise<never>((_, rej) => ctrl.signal.addEventListener("abort", () => rej(Object.assign(new Error("timeout"), { name: "TimeoutError" })))),
        ]);
        this.cache.set(key, offers);
        this.record(id, true);
        return { offers, outcome: { providerId: id, status: "ok", count: offers.length, ms: Date.now() - t0, cached: false } };
      } catch (e) {
        const timedOut = ctrl.signal.aborted && !outer?.aborted;
        this.record(id, false, timedOut ? "timeout" : (e as Error).message);
        return { offers: [], outcome: timedOut ? { providerId: id, status: "timeout", ms: Date.now() - t0 } : { providerId: id, status: "error", error: (e as Error).message.slice(0, 200), ms: Date.now() - t0 } };
      } finally { clearTimeout(timer); outer?.removeEventListener("abort", onOuter); }
    });
    const settled = await Promise.all(runs);
    for (const s of settled) this.opts.onRun?.(s.outcome.providerId, s.outcome);
    // exact duplicates only (same provider + same URL); different sellers of one product stay separate offers
    const seen = new Set<string>();
    const offers = settled.flatMap((s) => s.offers).filter((o) => { const k = `${o.providerId}|${o.url}`; if (seen.has(k)) return false; seen.add(k); return true; });
    return { offers, sources: settled.map((s) => s.outcome) };
  }
}
