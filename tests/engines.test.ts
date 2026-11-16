import { describe, expect, it } from "vitest";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { COMPONENTS } from "@/data/components";
import { CATEGORIES } from "@/data/categories";
import { findBikes } from "@/lib/finder";
import { adviseUpgrades, profileFromModel } from "@/lib/upgrade";
import { buildIndex, search } from "@/lib/search";
import { parseCsv, toCsv } from "@/lib/csv";
import { normalizeModel } from "@/lib/importers";

const brandById = new Map(BRANDS.map((b) => [b.id, b]));
const componentById = new Map(COMPONENTS.map((c) => [c.id, c]));

describe("data integrity", () => {
  it("every bike references an existing brand and has unique ids", () => {
    for (const b of BIKES) expect(brandById.has(b.brandId), b.id).toBe(true);
    expect(new Set(BIKES.map((b) => b.id)).size).toBe(BIKES.length);
    expect(new Set(BRANDS.map((b) => b.id)).size).toBe(BRANDS.length);
  });
  it("never labels seed prices as official", () => {
    // seed prices stay estimates; any non-estimate price must cite where it was published
    for (const b of BIKES) if (b.price && b.price.type !== "estimated") {
      expect(b.price.sourceUrl, b.id).toMatch(/^https:\/\//);
      expect(b.price.date, b.id).toBeTruthy();
      if (b.price.original) expect(b.price.original.rate).toBeGreaterThan(0);
    }
    for (const b of BIKES) if (b.price?.type === "estimated") expect(b.provenance.demo ?? b.provenance.status !== "verified-official", b.id).toBeTruthy();
    for (const c of COMPONENTS) if (c.price && c.price.type !== "estimated") { expect(c.price.sourceUrl, c.id).toMatch(/^https:\/\//); expect(c.price.date, c.id).toBeTruthy(); }
  });
});

describe("bike finder", () => {
  it("respects budget and category", () => {
    const r = findBikes(BIKES, brandById, { budgetMax: 15_000_000, category: "road" });
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) { expect(x.bike.category).toBe("road"); expect(x.bike.price!.amount).toBeLessThanOrEqual(15_000_000); }
  });
  it("filters local brands", () => {
    const r = findBikes(BIKES, brandById, { region: "Indonesia" });
    expect(r.every((x) => x.brand?.region === "Indonesia")).toBe(true);
  });
  it("does not rank the most expensive bike first just because it is expensive", () => {
    const r = findBikes(BIKES, brandById, { category: "road", experience: "beginner", usage: ["fitness"] });
    const top = r[0].bike.price!.amount;
    const max = Math.max(...r.map((x) => x.bike.price?.amount ?? 0));
    expect(top).toBeLessThan(max);
  });
});

describe("upgrade advisor", () => {
  it("produces compatible, budget-respecting tiers for a rim-brake Strattos", () => {
    const bike = BIKES.find((b) => b.id === "polygon-strattos-s4-2024")!;
    const res = adviseUpgrades({ profile: profileFromModel(bike, "Polygon"), budget: 8_000_000, goals: ["speed", "comfort"], catalog: COMPONENTS, componentById });
    expect(res.plans).toHaveLength(3);
    for (const p of res.plans) {
      expect(p.total).toBeLessThanOrEqual(p.cap);
      for (const i of p.items) {
        expect(i.compatibility).not.toBe("incompatible");
        if (i.area === "wheelset") expect(i.component.compat.brakeInterface).toBe("rim");
      }
    }
    expect(res.plans[2].items.length).toBeGreaterThan(0);
  });
});

describe("search", () => {
  const index = buildIndex({ brands: BRANDS, bikes: BIKES, components: COMPONENTS, categories: CATEGORIES, brandById });
  it("finds Indonesian brands and tolerates typos", () => {
    expect(search(index, "polygon")[0].title).toBe("Polygon");
    expect(search(index, "polgon").some((h) => h.title === "Polygon")).toBe(true);
    expect(search(index, "ultegra di2").some((h) => h.kind === "component")).toBe(true);
  });
});

describe("import", () => {
  it("round-trips CSV and normalises a model", () => {
    const csv = toCsv([{ brand: "Polygon", name: "Test, Model", year: 2025, category: "road", priceIdr: "12000000" }]);
    const rows = parseCsv(csv);
    expect(rows[0].name).toBe("Test, Model");
    const m = normalizeModel(rows[0]);
    expect(m.brandId).toBe("polygon");
    expect(m.weightKg).toBeNull();
    expect(m.price?.type).toBe("estimated");
  });
});
