import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { rateLimit } from "@/lib/ratelimit";
import { invalidateProviderSettings, providerRuntime } from "@/lib/providers/runtime";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("test"), id: z.string().max(120) }),
  z.object({ action: z.literal("set-enabled"), id: z.string().max(120), enabled: z.boolean() }),
]);

/** POST /api/admin/providers — admin only: test connectivity, or enable/disable a provider. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "admin-providers", 30);
  if (limited) return limited;
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { adapters, http } = providerRuntime();
  const adapter = adapters.find((a) => a.meta.id === parsed.data.id);

  if (parsed.data.action === "set-enabled") {
    const res = await admin.db(`providers?id=eq.${encodeURIComponent(parsed.data.id)}`, { method: "PATCH", body: { enabled: parsed.data.enabled, updated_at: new Date().toISOString() }, prefer: "return=representation" });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) return Response.json({ error: "Provider not registered in the database yet — run the sync job's --register step." }, { status: 404 });
    invalidateProviderSettings();
    return Response.json({ id: parsed.data.id, enabled: parsed.data.enabled });
  }

  if (!adapter) return Response.json({ error: "This source has no automated adapter (agreement or manual research only)." }, { status: 400 });
  const conf = adapter.configured();
  const started = new Date();
  let result: { ok: boolean; detail: string };
  const before = http.requests;
  if (!conf.ok) result = { ok: false, detail: `${conf.reason}${conf.missing.length ? ` — set ${conf.missing.join(", ")} on the server` : ""}` };
  else {
    try {
      const ctx = { signal: AbortSignal.timeout(15_000), http, now: () => new Date() };
      if (adapter.test) result = await adapter.test(ctx);
      else if (adapter.search) { const r = await adapter.search({ q: "wheelset", limit: 3 }, ctx); result = { ok: true, detail: `Search answered with ${r.length} results` }; }
      else if (adapter.research) { const r = await adapter.research("bicycle wheelset", ctx); result = { ok: true, detail: `Research answered with ${r.length} mentions` }; }
      else result = { ok: true, detail: "Configured (sync-only source; run the sync job to test end to end)" };
    } catch (e) { result = { ok: false, detail: (e as Error).message.slice(0, 300) }; }
  }
  // every test is logged, including "not configured", so Admin can see the provider's history
  await admin.db("provider_runs", { method: "POST", body: { provider_id: adapter.meta.id, kind: "test", started_at: started.toISOString(), finished_at: new Date().toISOString(),
    status: !conf.ok ? "not-configured" : result.ok ? "ok" : "error", http_requests: http.requests - before, error: result.ok ? null : result.detail, details: { detail: result.detail } } }).catch(() => {});
  return Response.json({ id: adapter.meta.id, ...result });
}
