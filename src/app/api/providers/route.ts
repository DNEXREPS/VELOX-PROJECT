import { rateLimit } from "@/lib/ratelimit";
import { providerRuntime, providerSettings, registryOnly } from "@/lib/providers/runtime";

export const dynamic = "force-dynamic";

/**
 * GET /api/providers — public transparency list: every source VELOX knows, whether it is enabled,
 * configured and permitted, and its recent health. Contains no secrets (credential env var NAMES only).
 */
export async function GET(request: Request) {
  const limited = rateLimit(request, "providers", 60);
  if (limited) return limited;
  const { adapters, aggregator } = providerRuntime();
  const enabled = await providerSettings();
  const providers = [
    ...adapters.map((a) => {
      const c = a.configured();
      return { ...a.meta, enabled: enabled?.get(a.meta.id) ?? a.meta.defaultEnabled, configured: c.ok, missing: c.ok ? [] : c.missing, configNote: c.ok ? null : c.reason, health: aggregator.health.get(a.meta.id) ?? null, hasAdapter: true };
    }),
    ...registryOnly().map((m) => ({ ...m, enabled: false, configured: false, missing: [], configNote: m.notes ?? null, health: null, hasAdapter: false })),
  ];
  return Response.json({ providers, settingsSource: enabled ? "database" : "defaults" }, { headers: { "cache-control": "no-store" } });
}
