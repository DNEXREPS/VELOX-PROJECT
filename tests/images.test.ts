import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BIKES } from "@/data/bikes";
import { MEDIA_LIST } from "@/data/media";
import { PRODUCT_IMAGES, imageForBike, isDisplayable } from "@/data/product-images";
import { BRANDS } from "@/data/brands";

const bikeIds = new Set(BIKES.map((b) => b.id));
const categoryFiles = new Set(MEDIA_LIST.map((m) => m.src));

describe("product image registry", () => {
  it("attaches every image to an existing catalogue record", () => {
    for (const img of PRODUCT_IMAGES) if (img.subjectKind === "bike") expect(bikeIds.has(img.subjectId), img.id).toBe(true);
  });
  it("stores images locally with matching checksum and full licence metadata", () => {
    for (const img of PRODUCT_IMAGES) {
      expect(img.primary_image_url).toMatch(/^\/media\/products\//);
      const buf = fs.readFileSync(path.join(process.cwd(), "public", img.primary_image_url));
      expect(crypto.createHash("sha256").update(buf).digest("hex"), img.id).toBe(img.sha256);
      expect(img.image_source_url).toMatch(/^https:\/\//);
      expect(img.license).toBeTruthy();
      expect(img.matchNotes.length).toBeGreaterThan(40);
      expect(img.last_image_verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("never assigns one photo to two different models", () => {
    for (const key of ["sha256", "primary_image_url", "image_source_url"] as const) {
      const seen = new Map<string, string>();
      for (const img of PRODUCT_IMAGES) {
        const prev = seen.get(img[key]);
        if (prev) expect(prev, `${key} reused by ${img.subjectId}`).toBe(img.subjectId);
        seen.set(img[key], img.subjectId);
      }
    }
  });
  it("never uses category or cyclist photography as a product image", () => {
    for (const img of PRODUCT_IMAGES) expect(categoryFiles.has(img.primary_image_url)).toBe(false);
    for (const b of BIKES) if (b.imageUrl) expect(categoryFiles.has(b.imageUrl), b.id).toBe(false);
  });
  it("only displays licensed, verified, same-model-or-generation photos", () => {
    const fake = { ...PRODUCT_IMAGES[0] };
    expect(isDisplayable({ ...fake, image_license_status: "permission-required" })).toBe(false);
    expect(isDisplayable({ ...fake, image_license_status: "unknown" })).toBe(false);
    expect(isDisplayable({ ...fake, image_verification_status: "pending-review" })).toBe(false);
    expect(isDisplayable({ ...fake, image_model_match: "family" })).toBe(false);
    expect(isDisplayable(fake)).toBe(true);
  });
  it("returns no image (placeholder) for models without a verified photo — no fallback", () => {
    const without = BIKES.filter((b) => !PRODUCT_IMAGES.some((i) => i.subjectId === b.id));
    expect(without.length).toBeGreaterThan(0);
    for (const b of without) expect(imageForBike(b.id)).toBeNull();
  });
  it("keeps the bike image component independent of category photography", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/BikeImage.tsx"), "utf8");
    expect(src).not.toMatch(/data\/media/);
    for (const f of ["src/components/catalog.tsx", "src/app/bikes/[slug]/BikeDetail.tsx"]) {
      expect(fs.readFileSync(path.join(process.cwd(), f), "utf8")).not.toMatch(/mediaFor/);
    }
  });
});

describe("expanded catalogue integrity", () => {
  const brandIds = new Set(BRANDS.map((b) => b.id));
  it("every model references a known brand and has a unique identity", () => {
    const keys = new Set<string>();
    for (const b of BIKES) {
      expect(brandIds.has(b.brandId), b.id).toBe(true);
      const k = `${b.brandId}|${b.name.toLowerCase()}|${b.year}|${b.variant ?? ""}|${b.yearBasis ?? ""}`;
      expect(keys.has(k), `duplicate ${k}`).toBe(false);
      keys.add(k);
    }
  });
  it("every official import cites its official product page and a retrieval date", () => {
    const official = BIKES.filter((b) => b.provenance.status === "verified-official");
    expect(official.length).toBeGreaterThan(300);
    for (const b of official) {
      expect(b.officialUrl, b.id).toMatch(/^https:\/\//);
      expect(b.provenance.sources[0].url, b.id).toBe(b.officialUrl);
      expect(b.provenance.sources[0].type).toBe("official-website");
      expect(b.provenance.sources[0].retrievedAt).toBe("2026-11-16");
    }
  });
  it("never shows a model year the manufacturer did not publish without saying so", () => {
    for (const b of BIKES.filter((x) => ["specialized", "tern"].includes(x.brandId) && x.provenance.status === "verified-official")) {
      expect(b.yearBasis, b.id).toBe("listed-in-range");
    }
  });
  it("labels converted prices with the original published amount and rate", () => {
    for (const b of BIKES) if (b.price?.original) {
      expect(b.price.original.rate).toBe(18148);
      expect(Math.abs(b.price.amount - b.price.original.amount * b.price.original.rate)).toBeLessThan(1000);
      expect(b.price.note).toMatch(/converted/i);
    }
  });
});
