import "server-only";
/**
 * Catalogue repository (server side). Two interchangeable implementations:
 *   static   — the bundled, versioned catalogue in src/data (default; works with no database)
 *   database — PostgreSQL via PostgREST (Supabase-compatible), public read through RLS
 * Select with VELOX_CATALOG_SOURCE=database (requires NEXT_PUBLIC_SUPABASE_URL + anon key).
 */
import { COMPONENTS } from "@/data/components";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { buildIndex, search, type SearchHit } from "@/lib/search";
import type { Component, ComponentType, Discipline, PriceEntry, Tier } from "@/lib/types";
import type { ComponentPage, ComponentSummary } from "./types";
export type { ComponentPage, ComponentSummary } from "./types";

export type ComponentSort = "relevance" | "price-asc" | "price-desc" | "weight";

export interface ComponentQuery {
  q?: string;
  types?: ComponentType[];
  brand?: string | null;
  discipline?: Discipline | null;
  tier?: Tier | null;
  sort?: ComponentSort;
  page?: number; // 1-based
  pageSize?: number;
}

export interface CatalogRepository {
  readonly source: "static" | "database";
  searchComponents(q: ComponentQuery): Promise<ComponentPage>;
  globalSearch(q: string, limit: number): Promise<SearchHit[]>;
  stats(): Promise<CatalogStats>;
}

export interface CatalogStats { brands: number; bikes: number; components: number }

const clampSize = (n?: number) => Math.min(Math.max(Math.floor(n ?? 50), 1), 100);
const clampPage = (n?: number) => Math.max(Math.floor(n ?? 1), 1);
const summary = (c: Component): ComponentSummary => ({ id: c.id, manufacturer: c.manufacturer, manufacturerSlug: c.manufacturerSlug, name: c.name, type: c.type, discipline: c.discipline, tier: c.tier, material: c.material ?? null, weightG: c.weightG ?? null, price: c.price ?? null });

/* --------------------------------- static --------------------------------- */

let staticState: { live: Component[]; componentIndex: ReturnType<typeof buildIndex>; fullIndex: ReturnType<typeof buildIndex> } | null = null;
function staticData() {
  if (!staticState) {
    const live = COMPONENTS.filter((c) => c.provenance.status !== "archived");
    const brandById = new Map(BRANDS.map((b) => [b.id, b]));
    staticState = {
      live,
      componentIndex: buildIndex({ brands: [], bikes: [], categories: [], components: live, brandById }),
      fullIndex: buildIndex({ brands: BRANDS.filter((b) => b.provenance.status !== "archived"), bikes: BIKES.filter((b) => b.provenance.status !== "archived"), categories: CATEGORIES, components: live, brandById }),
    };
  }
  return staticState;
}

export const staticRepository: CatalogRepository = {
  source: "static",
  async searchComponents(query) {
    const { live, componentIndex } = staticData();
    const types = query.types ?? [];
    const pageSize = clampSize(query.pageSize), page = clampPage(query.page);
    let items = live;
    if (query.q?.trim()) {
      const rank = new Map(search(componentIndex, query.q, { kinds: ["component"], limit: 5000 }).map((h, i) => [h.id, i]));
      items = items.filter((c) => rank.has(c.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }
    const inGroup = (c: Component) => !types.length || types.includes(c.type);
    items = items.filter((c) => inGroup(c) && (!query.brand || c.manufacturerSlug === query.brand)
      && (!query.discipline || c.discipline.includes(query.discipline) || c.discipline.includes("universal")) && (!query.tier || c.tier === query.tier));
    if (query.sort === "price-asc") items = [...items].sort((a, b) => (a.price?.amount || Infinity) - (b.price?.amount || Infinity));
    if (query.sort === "price-desc") items = [...items].sort((a, b) => (b.price?.amount ?? -1) - (a.price?.amount ?? -1));
    if (query.sort === "weight") items = [...items].sort((a, b) => (a.weightG ?? Infinity) - (b.weightG ?? Infinity));
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const c of live) if (inGroup(c)) { const e = m.get(c.manufacturerSlug) ?? { id: c.manufacturerSlug, name: c.manufacturer, count: 0 }; e.count++; m.set(c.manufacturerSlug, e); }
    return { items: items.slice((page - 1) * pageSize, page * pageSize).map(summary), total: items.length, page, pageSize, manufacturers: [...m.values()].sort((a, b) => a.name.localeCompare(b.name)), source: "static" };
  },
  async globalSearch(q, limit) {
    return search(staticData().fullIndex, q, { limit });
  },
  async stats() {
    const live = <T extends { provenance: { status: string } }>(xs: T[]) => xs.filter((x) => x.provenance.status !== "archived").length;
    return { brands: live(BRANDS), bikes: live(BIKES), components: staticData().live.length };
  },
};

/* -------------------------------- database -------------------------------- */

interface ComponentRowDb { id: string; brand_id: string; brand_name: string; name: string; type: ComponentType; discipline: Discipline[] | null; tier: Tier | null; material: string | null; weight_g: number | null; price_entry: PriceEntry | null; total: number }

export function databaseRepository(url: string, anonKey: string, fetchImpl: typeof fetch = fetch): CatalogRepository {
  const rpc = async <T,>(fn: string, body: Record<string, unknown>): Promise<T> => {
    const res = await fetchImpl(`${url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
      method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (!res.ok) throw new Error(`catalogue database ${fn}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  };
  const count = async (filter: string): Promise<number> => {
    const res = await fetchImpl(`${url.replace(/\/$/, "")}/rest/v1/${filter}`, { method: "HEAD", headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, prefer: "count=exact" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(`catalogue database count: HTTP ${res.status}`);
    return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
  };
  return {
    source: "database",
    async stats() {
      const [brands, bikes, components] = await Promise.all([count("brands?select=id"), count("products?select=id&kind=eq.bike&verification=neq.archived"), count("products?select=id&kind=neq.bike&verification=neq.archived")]);
      return { brands, bikes, components };
    },
    async searchComponents(query) {
      const pageSize = clampSize(query.pageSize), page = clampPage(query.page);
      const types = query.types?.length ? query.types : null;
      const [rows, facets] = await Promise.all([
        rpc<ComponentRowDb[]>("search_components", { p_q: query.q?.trim() || null, p_types: types, p_brand: query.brand || null, p_discipline: query.discipline || null, p_tier: query.tier || null, p_sort: query.sort ?? "relevance", p_limit: pageSize, p_offset: (page - 1) * pageSize }),
        rpc<Array<{ brand_id: string; brand_name: string; n: number }>>("component_brand_facets", { p_types: types }),
      ]);
      return {
        items: rows.map((r) => ({ id: r.id, manufacturer: r.brand_name, manufacturerSlug: r.brand_id, name: r.name, type: r.type, discipline: r.discipline ?? ["universal"], tier: r.tier ?? "entry", material: r.material, weightG: r.weight_g, price: r.price_entry })),
        total: rows[0]?.total ?? 0, page, pageSize,
        manufacturers: facets.map((f) => ({ id: f.brand_id, name: f.brand_name, count: Number(f.n) })), source: "database",
      };
    },
    async globalSearch(q, limit) {
      // brands and categories are small reference data; products come from the database
      const local = search(staticData().fullIndex, q, { limit, kinds: ["brand", "category"] });
      const rows = await rpc<Array<{ id: string; kind: string; brand_id: string; brand_name: string; name: string; model_year: number | null; category_id: string; rank: number }>>("search_products", { p_q: q, p_limit: limit });
      const slugById = new Map(BIKES.map((b) => [b.id, b.slug]));
      const products: SearchHit[] = rows.map((r) => ({
        kind: r.kind === "bike" ? "bike" : "component", id: r.id, title: `${r.brand_name} ${r.name}`, subtitle: [r.model_year, r.category_id].filter(Boolean).join(" · "),
        meta: (r.kind === "bike" ? { brand: r.brand_id, brandName: r.brand_name } : { manufacturer: r.brand_id }) as Record<string, string>,
        href: r.kind === "bike" ? `/bikes/${slugById.get(r.id) ?? r.id}` : `/components/${r.id}`, tokens: [], titleTokens: [], score: r.rank,
      }));
      // scores from the two systems are not comparable: show the best brand/category matches first, then products
      return [...local.slice(0, 3), ...products].slice(0, limit);
    },
  };
}

export function catalogRepository(): CatalogRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.VELOX_CATALOG_SOURCE === "database" && url && key) return databaseRepository(url, key);
  return staticRepository;
}
