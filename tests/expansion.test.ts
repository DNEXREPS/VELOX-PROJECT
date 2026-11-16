import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BRANDS } from "@/data/brands";
import { BIKES } from "@/data/bikes";
import { COMPONENTS } from "@/data/components";
import { MEDIA_LIST, mediaForCategory } from "@/data/media";
import { PENDING_BRANDS } from "@/data/research";
import { CATEGORIES } from "@/data/categories";
import { diagnose } from "@/lib/mechanic/engine";
import { matchBearings, parseShis } from "@/lib/mechanic/standards";
import { simulate } from "@/lib/simulator";
import { csvAdapter, detectDuplicates, schemaOrgProductAdapter, stage } from "@/lib/ingest";
import { buildConceptPrompt } from "@/lib/visualizer";
import { profileFromModel } from "@/lib/upgrade";
import { isVerified } from "@/lib/format";

const bearings = COMPONENTS.filter((c) => c.type === "bearing");

describe("database integrity after expansion", () => {
  it("has unique ids across brands, bikes and components", () => {
    for (const list of [BRANDS, BIKES, COMPONENTS]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
  });
  it("every bike references a brand and a known category/subcategory", () => {
    const brandIds = new Set(BRANDS.map((b) => b.id));
    for (const b of BIKES) {
      expect(brandIds.has(b.brandId), b.id).toBe(true);
      const cat = CATEGORIES.find((c) => c.id === b.category)!;
      expect(cat.subcategories.some((s) => s.id === b.subcategory), `${b.id} → ${b.subcategory}`).toBe(true);
    }
  });
  it("labels every brand with what it actually does", () => {
    for (const b of BRANDS) expect(b.kinds?.length, b.name).toBeGreaterThan(0);
  });
  it("never marks a record verified without a source", () => {
    for (const r of [...BRANDS, ...BIKES, ...COMPONENTS]) if (isVerified(r.provenance.status)) expect(r.provenance.sources.length, r.id).toBeGreaterThan(0);
  });
  it("researched records cite real URLs and a retrieval date", () => {
    const researched = BRANDS.filter((b) => b.provenance.sources.some((s) => s.type && s.type !== "editorial-seed"));
    expect(researched.length).toBeGreaterThan(25);
    for (const b of researched) for (const s of b.provenance.sources) { expect(s.url).toMatch(/^https:\/\//); expect(s.retrievedAt).toBe("2026-11-16"); }
  });
  it("keeps unsubstantiated names out of the catalogue", () => {
    const names = new Set(BRANDS.map((b) => b.name.toLowerCase()));
    for (const p of PENDING_BRANDS) expect(names.has(p.name.toLowerCase()), p.name).toBe(false);
  });
  it("records the United Bike domain only with its confirming official source", () => {
    const u = BRANDS.find((b) => b.id === "united-bike")!;
    expect(u.website).toBe("https://www.unitedbike.com");
    expect(u.provenance.sources.some((s) => s.url === "https://www.unitedbike.com/" && s.type === "official-website")).toBe(true);
  });
  it("covers all requested subcategories with at least one model", () => {
    for (const sub of ["time-trial", "triathlon", "track", "fat-bike", "downhill", "dirt-jump", "e-road", "e-gravel", "e-folding", "e-cargo", "tandem", "recumbent", "kids", "balance-bikes", "adaptive-bikes", "beach-cruisers", "cyclocross"]) {
      expect(BIKES.some((b) => b.subcategory === sub), sub).toBe(true);
    }
  });
});

describe("media registry", () => {
  it("every image exists on disk with licence data", () => {
    for (const m of MEDIA_LIST) {
      expect(fs.existsSync(path.join(process.cwd(), "public", m.src)), m.src).toBe(true);
      expect(m.license).toBeTruthy();
      expect(m.sourceUrl).toMatch(/^https:\/\/www\.pexels\.com\/photo\/\d+\/$/);
    }
  });
  it("gives distinct imagery to unrelated categories", () => {
    const ids = ["road", "mtb", "gravel", "urban", "electric", "folding", "bmx"].map((c) => mediaForCategory(c as never).id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("AI Mechanic engine", () => {
  it("routes a bottom-bracket click to BB/crank causes and asks targeted questions", () => {
    const d = diagnose({ text: "my bottom bracket makes a clicking noise when pedalling", answers: {} });
    expect(d.systems[0].system).toBe("bottom-bracket");
    expect([...d.likely, ...d.possible].some((c) => c.system === "bottom-bracket")).toBe(true);
    expect(d.followUps.length).toBeGreaterThan(0);
    expect(d.bearingRelated).toBe(true);
  });
  it("answers re-rank causes (worn chain confirmed by checker)", () => {
    const before = diagnose({ text: "derailleur skips gears", answers: {} });
    const after = diagnose({ text: "derailleur skips gears", answers: { "chain-wear": "Checker shows worn (≥0.5–0.75%)" } });
    const top = after.likely[0] ?? after.possible[0];
    expect(top.id).toBe("chain-worn");
    expect(after.confirmed.length).toBeGreaterThan(before.confirmed.length);
  });
  it("tells the rider to stop riding for braking problems", () => {
    const d = diagnose({ text: "brake lever feels spongy and goes to the bar", answers: { "brake-lever": "Spongy / pulls toward the bar" } });
    expect(d.safety.level).toBe("stop");
    expect(d.likely[0].id).toBe("brake-air");
  });
  it("understands common Indonesian terms", () => {
    const d = diagnose({ text: "rem cakram gesek", answers: {} });
    expect(d.systems.map((s) => s.system)).toContain("rotors");
  });
  it("never claims to identify parts from photos", () => {
    const d = diagnose({ text: "rear hub grinding when coasting", answers: {}, imageCount: 2 });
    expect(d.unknown.join(" ")).toMatch(/no part is identified from a photo alone/);
  });
});

describe("bearing identification", () => {
  it("matches markings, including seal suffixes and ISO 618xx naming", () => {
    expect(matchBearings({ marking: "6802-2RS" }, bearings)[0].bearing.name).toBe("6802");
    expect(matchBearings({ marking: "61803" }, bearings)[0].bearing.name).toBe("6803");
  });
  it("matches by measurement and reports exactness", () => {
    const m = matchBearings({ innerMm: 15, outerMm: 28, widthMm: 7 }, bearings);
    expect(m[0].bearing.name).toBe("6902");
    expect(m[0].exact).toBe(true);
  });
  it("returns several candidates when only one dimension is given", () => {
    expect(matchBearings({ innerMm: 15 }, bearings).length).toBeGreaterThan(1);
  });
  it("decodes SHIS headset codes", () => {
    const p = parseShis("ZS44/28.6 | EC44/40")!;
    expect(p[0].type).toMatch(/Zero-stack/);
    expect(p[1].steerer).toBe(40);
    expect(parseShis("nonsense")).toBeNull();
  });
});

describe("upgrade simulator", () => {
  const wheel = COMPONENTS.find((c) => c.id === "wheel-zipp-303-firecrest")!;
  it("computes deltas only when both weights are known", () => {
    const r = simulate([{ slot: "wheelset", original: { name: "Stock", weightG: 1900, source: "catalogue" }, replacement: wheel }], 9.5);
    expect(r.knownDeltaG).toBe(1530 - 1900);
    expect(r.bikeWeightAfterKg).toBe(9.13);
  });
  it("refuses to compute a new total when any weight is unknown", () => {
    const r = simulate([{ slot: "wheelset", original: { name: "Stock", weightG: null, source: "unknown" }, replacement: wheel }], 9.5);
    expect(r.deltasUnknown).toBe(1);
    expect(r.bikeWeightAfterKg).toBeNull();
    expect(r.method.join(" ")).toMatch(/No speed, watt or time savings/);
  });
});

describe("ingestion pipeline", () => {
  const existing = BIKES;
  it("stages CSV records as unverified and flags duplicates", () => {
    const csv = "brand,name,year,category,subcategory\nPolygon,Strattos S4,2024,road,endurance\nPolygon,Strattos S3,2024,road,endurance";
    const { staged, errors } = stage({ kind: "bike", adapter: csvAdapter, input: csv, sourceUrl: "https://example.com", existing });
    expect(errors).toHaveLength(0);
    expect(staged).toHaveLength(2);
    expect(staged.every((s) => s.record.provenance.status === "unverified")).toBe(true);
    expect(staged[0].duplicates[0].certainty).toBe("exact");
    expect(staged[1].duplicates.some((d) => d.certainty === "possible")).toBe(true); // near-identical name, same brand and year
  });
  it("detects product-identifier duplicates", () => {
    const a = { ...COMPONENTS[0], id: "x", productId: "ABC-123" };
    const b = { ...COMPONENTS[1], id: "y", productId: "abc 123" };
    expect(detectDuplicates("component", a, [b])[0].certainty).toBe("exact");
  });
  it("extracts schema.org Product JSON-LD from an official page", () => {
    const html = `<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Test Wheel 45","brand":{"@type":"Brand","name":"Acme"},"sku":"AW45","offers":{"price":"9500000","priceCurrency":"IDR"}}</script></html>`;
    const rows = schemaOrgProductAdapter.parse(html);
    expect(rows[0]).toMatchObject({ name: "Test Wheel 45", brand: "Acme", productId: "AW45", priceType: "msrp" });
    expect(() => schemaOrgProductAdapter.parse("<html></html>")).toThrow();
  });
});

describe("visualizer brief", () => {
  it("preserves geometry, excludes brand logos and names no manufacturer", () => {
    const bike = BIKES.find((b) => b.id === "polygon-strattos-s4-2024")!;
    const wheel = COMPONENTS.find((c) => c.id === "wheel-zipp-303-firecrest")!;
    const b = buildConceptPrompt({ profile: profileFromModel(bike, "Polygon"), frameMaterial: bike.frameMaterial, parts: { wheelset: wheel }, frameColor: "", scene: "studio-dark", concept: "custom", hasReferencePhoto: true });
    expect(b.prompt).toMatch(/keep the exact frame silhouette/);
    expect(b.prompt).toMatch(/No text, no brand logos/);
    expect(b.prompt).not.toMatch(/Polygon/);
    expect(b.prompt).not.toMatch(/Zipp|Firecrest/);
    expect(b.negativePrompt).toMatch(/wireframe/);
  });
});
