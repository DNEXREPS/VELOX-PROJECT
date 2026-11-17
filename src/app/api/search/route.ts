import { rateLimit } from "@/lib/ratelimit";
import { catalogRepository } from "@/lib/catalog/repo";

export const dynamic = "force-dynamic";

/** GET /api/search?q=…&limit=… — global search across brands, bikes, components and categories. */
export async function GET(request: Request) {
  const limited = rateLimit(request, "search", 240);
  if (limited) return limited;
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 200).trim();
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 12, 1), 300);
  if (!q) {
    if (sp.get("stats") !== "1") return Response.json({ hits: [] });
    try { return Response.json({ hits: [], stats: await catalogRepository().stats() }, { headers: { "cache-control": "public, max-age=300, s-maxage=600" } }); }
    catch { return Response.json({ hits: [] }); }
  }
  try {
    const hits = (await catalogRepository().globalSearch(q, limit)).map(({ tokens: _t, titleTokens: _tt, ...h }) => h);
    return Response.json({ hits }, { headers: { "cache-control": "public, max-age=30, s-maxage=60" } });
  } catch (e) {
    console.error("search", e);
    return Response.json({ error: "Search is temporarily unavailable." }, { status: 503 });
  }
}
