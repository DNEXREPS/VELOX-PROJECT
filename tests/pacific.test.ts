import { describe, expect, it } from "vitest";
import { BIKES } from "@/data/bikes";
import { COMPONENTS } from "@/data/components";
import { BRANDS } from "@/data/brands";
import { PACIFIC_BIKES, PACIFIC_COMPONENTS } from "@/data/pacific";
import { imageCoverage, imageForBike } from "@/data/product-images";

const byName = (n: string) => PACIFIC_BIKES.find((b) => b.name === n);
const compIds = new Set(COMPONENTS.map((c) => c.id));

describe("Pacific Bike integration", () => {
  it("represents every requested Primum model and Magnus 5.0", () => {
    for (const n of ["Primum 3.3", "Primum 3.5", "Primum 5.3", "Primum 5.5", "Primum 9.0", "Primum Pro", "Primum Pro SE", "Magnus 5.0"]) {
      const b = byName(n);
      expect(b, n).toBeTruthy();
      expect(b!.officialUrl, n).toMatch(/^https:\/\/pacific-bike\.com\/product\//);
      expect(BIKES.some((x) => x.id === b!.id), n).toBe(true);
    }
  });
  it("keeps Primum variants distinct rather than copying one spec", () => {
    const g = (n: string) => byName(n)!.groupset;
    expect(new Set([g("Primum 3.3"), g("Primum 5.5"), g("Primum 9.0"), g("Primum Pro SE")]).size).toBe(4);
    expect(byName("Primum 3.5")!.brakeType).toBe("hydraulic-disc");
    expect(byName("Primum 9.0")!.brakeType).toBe("rim-caliper");
  });
  it("matches the Magnus 5.0 official specification and links its parts", () => {
    const m = byName("Magnus 5.0")!;
    const spec = Object.fromEntries(m.componentSpec!.map((r) => [r.label, r]));
    expect(spec.Shifters.value).toMatch(/105 R7000, 2×11/);
    expect(spec.Crankset.value).toMatch(/Prowheel Victor/);
    expect(spec.Hubs.componentId).toBe("syte-chronos-hubs");
    expect(spec.Rims.componentId).toBe("syte-chronos-alloy-rim");
    expect(spec.Tyres.value).toMatch(/CST Czar 700×25C/);
    expect(spec.Seatpost.value).toMatch(/Magnus carbon/);
  });
  it("links bike spec rows only to existing component records", () => {
    for (const b of BIKES) for (const r of b.componentSpec ?? []) if (r.componentId) expect(compIds.has(r.componentId), `${b.id} → ${r.componentId}`).toBe(true);
  });
  it("never invents a bearing for the SYTE Chronos hub", () => {
    const hub = COMPONENTS.find((c) => c.id === "syte-chronos-hubs")!;
    expect(hub.specs["Bearing designation"]).toBeNull();
    expect(hub.bearing ?? null).toBeNull();
  });
  it("separates SYTE, Pacific and other brands' products, each with an official source", () => {
    const makers = new Set(PACIFIC_COMPONENTS.map((c) => c.manufacturer));
    expect(makers.has("SYTE") && makers.has("Pacific")).toBe(true);
    expect(PACIFIC_COMPONENTS.filter((c) => c.manufacturer === "SYTE" && c.type === "accessory").length).toBeGreaterThan(4);
    for (const c of PACIFIC_COMPONENTS) expect(c.provenance.sources[0].url, c.id).toMatch(/pacific-bike\.com/);
    expect(BRANDS.some((b) => b.name === "SYTE")).toBe(true);
  });
  it("does not claim model years Pacific does not publish", () => {
    for (const b of PACIFIC_BIKES) if (b.yearBasis !== "undated") expect(b.provenance.reviewerNotes, b.id).toMatch(/\b(20\d\d)\b/);
  });
  it("marks Pacific models without a validated image as missing — never a stand-in", () => {
    for (const b of PACIFIC_BIKES) if (!imageForBike(b.id)) expect(imageCoverage(b)).toBe("missing");
  });
});
