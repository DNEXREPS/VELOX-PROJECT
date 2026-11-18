import { requireAdmin } from "@/lib/supabase/server-auth";
import { rateLimit } from "@/lib/ratelimit";
import { providerRuntime, providerSettings } from "@/lib/providers/runtime";
import type { Mention } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

/** GET /api/admin/research?q=… — public mentions from configured research sources (admin only). Mentions are leads, not facts. */
export async function GET(request: Request) {
  const limited = rateLimit(request, "admin-research", 20);
  if (limited) return limited;
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 200).trim();
  if (!q) return Response.json({ mentions: [], sources: [] });
  const { adapters, http } = providerRuntime();
  const enabled = await providerSettings();
  const sources: Array<{ id: string; status: string; detail?: string }> = [];
  const mentions: Mention[] = [];
  await Promise.all(adapters.filter((a) => a.research).map(async (a) => {
    if (!(enabled?.get(a.meta.id) ?? a.meta.defaultEnabled)) return void sources.push({ id: a.meta.id, status: "disabled" });
    const c = a.configured();
    if (!c.ok) return void sources.push({ id: a.meta.id, status: "not-configured", detail: c.missing.join(", ") });
    try { const m = await a.research!(q, { signal: AbortSignal.timeout(10_000), http, now: () => new Date() }); mentions.push(...m); sources.push({ id: a.meta.id, status: "ok", detail: String(m.length) }); }
    catch (e) { sources.push({ id: a.meta.id, status: "error", detail: (e as Error).message.slice(0, 200) }); }
  }));
  return Response.json({ mentions, sources });
}
