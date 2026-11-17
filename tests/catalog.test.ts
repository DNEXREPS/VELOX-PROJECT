import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));
const { staticRepository, databaseRepository } = await import("@/lib/catalog/repo");
const { COMPONENTS } = await import("@/data/components");

const root = process.cwd();
const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
const sql = migrations.map((f) => fs.readFileSync(path.join(root, "supabase/migrations", f), "utf8")).join("\n");

describe("catalogue repository (static)", () => {
  it("pages results and reports the full total", async () => {
    const p1 = await staticRepository.searchComponents({ types: ["wheelset", "rim"], pageSize: 50, page: 1 });
    const p2 = await staticRepository.searchComponents({ types: ["wheelset", "rim"], pageSize: 50, page: 2 });
    expect(p1.items).toHaveLength(50);
    expect(p1.total).toBe(COMPONENTS.filter((c) => (c.type === "wheelset" || c.type === "rim") && c.provenance.status !== "archived").length);
    expect(new Set([...p1.items, ...p2.items].map((c) => c.id)).size).toBe(p1.items.length + p2.items.length); // no overlap
  });
  it("combines text, manufacturer and tier filters", async () => {
    const r = await staticRepository.searchComponents({ q: "105", brand: "shimano", tier: "mid", pageSize: 100 });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((c) => c.manufacturerSlug === "shimano" && c.tier === "mid")).toBe(true);
  });
  it("sorts by price without hiding unpriced items", async () => {
    const r = await staticRepository.searchComponents({ types: ["wheelset"], sort: "price-asc", pageSize: 100 });
    const priced = r.items.filter((c) => c.price).map((c) => c.price!.amount);
    expect(priced).toEqual([...priced].sort((a, b) => a - b));
  });
  it("returns list summaries only (not whole records)", async () => {
    const r = await staticRepository.searchComponents({ pageSize: 1 });
    expect(Object.keys(r.items[0]).sort()).toEqual(["discipline", "id", "manufacturer", "manufacturerSlug", "material", "name", "price", "tier", "type", "weightG"]);
  });
  it("global search tolerates typos", async () => {
    const hits = await staticRepository.globalSearch("polgon", 5);
    expect(hits[0].title).toBe("Polygon");
  });
});

describe("catalogue repository (database adapter)", () => {
  it("maps database rows to the same summary shape and forwards filters as RPC parameters", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      if (url.endsWith("/search_components")) return Response.json([{ id: "x", brand_id: "shimano", brand_name: "Shimano", name: "105", type: "groupset", discipline: ["road"], tier: "mid", material: null, weight_g: 2400, price_entry: null, total: 7 }]);
      return Response.json([{ brand_id: "shimano", brand_name: "Shimano", n: 7 }]);
    }) as unknown as typeof fetch;
    const repo = databaseRepository("http://db.local", "anon", fake);
    const r = await repo.searchComponents({ q: "105", types: ["groupset"], brand: "shimano", page: 2, pageSize: 10 });
    expect(r).toMatchObject({ total: 7, page: 2, pageSize: 10, source: "database", manufacturers: [{ id: "shimano", name: "Shimano", count: 7 }] });
    expect(r.items[0]).toEqual({ id: "x", manufacturer: "Shimano", manufacturerSlug: "shimano", name: "105", type: "groupset", discipline: ["road"], tier: "mid", material: null, weightG: 2400, price: null });
    expect(calls[0].body).toMatchObject({ p_q: "105", p_types: ["groupset"], p_brand: "shimano", p_limit: 10, p_offset: 10 });
  });
  it("reports database failures instead of returning invented results", async () => {
    const repo = databaseRepository("http://db.local", "anon", (async () => new Response("down", { status: 503 })) as unknown as typeof fetch);
    await expect(repo.searchComponents({})).rejects.toThrow(/HTTP 503/);
  });
});

describe("catalogue migrations", () => {
  it("are additive: no dropped tables, truncation or deletes", () => {
    expect(sql).not.toMatch(/drop\s+table|truncate\s|delete\s+from/i);
  });
  it("enable row-level security on every new table, with admin-only writes", () => {
    const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(5);
    for (const t of tables) expect(sql, t).toMatch(new RegExp(`alter table ${t}\\s+enable row level security`));
    expect(sql).toMatch(/create policy "admin write" on %I for all using \(is_admin\(\)\) with check \(is_admin\(\)\)/);
  });
  it("keep products separate from offers, and never store provider secrets", () => {
    expect(sql).toMatch(/create table if not exists offers[\s\S]*product_id\s+text references products\(id\)/);
    expect(sql).toMatch(/check \(not \(config \?\| array\['key','secret','token','password','api_key','client_secret'\]\)\)/);
  });
  it("reject synthetic performance data in the real catalogue", () => {
    expect(sql).toMatch(/products_no_synthetic check \(data_origin <> 'synthetic-test'\)/);
  });
  it("build search SQL from bound parameters only", () => {
    const fn = fs.readFileSync(path.join(root, "supabase/migrations/20261118000500_search_plpgsql.sql"), "utf8");
    expect(fn).toMatch(/using tsq, raw, p_kind, p_category, p_brands/);
    expect(fn).not.toMatch(/\|\|\s*p_q\b|quote_literal\(p_/); // user input is never concatenated into SQL text
  });
});
