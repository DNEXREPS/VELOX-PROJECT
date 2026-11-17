import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";
import { catalogRepository } from "@/lib/catalog/repo";
import { COMPONENT_GROUPS } from "@/lib/catalog/groups";

export const dynamic = "force-dynamic";

const Query = z.object({
  q: z.string().max(200).optional(),
  group: z.string().max(40).optional(),
  brand: z.string().max(80).regex(/^[a-z0-9-]*$/).optional(),
  disc: z.enum(["road", "gravel", "mtb", "urban", "bmx"]).optional(),
  tier: z.enum(["entry", "mid", "performance", "pro"]).optional(),
  sort: z.enum(["relevance", "price-asc", "price-desc", "weight"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** GET /api/catalog/components — paged component search with manufacturer facets. */
export async function GET(request: Request) {
  const limited = rateLimit(request, "catalog-components", 240);
  if (limited) return limited;
  const params = Object.fromEntries([...new URL(request.url).searchParams].filter(([, v]) => v !== ""));
  const parsed = Query.safeParse(params);
  if (!parsed.success) return Response.json({ error: "Invalid query", issues: parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message) }, { status: 400 });
  const { q, group, brand, disc, tier, sort, page, pageSize } = parsed.data;
  const types = COMPONENT_GROUPS.find((g) => g.id === (group ?? "all"))?.types;
  if (!types) return Response.json({ error: "Unknown group" }, { status: 400 });
  try {
    const result = await catalogRepository().searchComponents({ q, types, brand, discipline: disc, tier, sort, page, pageSize });
    return Response.json(result, { headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("catalog components", e);
    return Response.json({ error: "The catalogue is temporarily unavailable." }, { status: 503 });
  }
}
