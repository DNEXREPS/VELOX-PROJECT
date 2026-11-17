#!/usr/bin/env node
// Export the current VELOX catalogue (src/data/*.ts) as JSON lines for scripts/catalog/load-seed.sh.
// Pure transformation of existing, sourced records — it never invents values. Unknown → null.
import fs from "node:fs";
import path from "node:path";
import { withModules } from "../lib/load-ts.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const out = process.argv[2] ?? path.join(root, ".cache/catalog-seed");
fs.mkdirSync(out, { recursive: true });

const COUNTRY = { Indonesia: "ID", China: "CN", Taiwan: "TW", "United States": "US", Germany: "DE", Switzerland: "CH", Canada: "CA", Italy: "IT", Spain: "ES", France: "FR", Belgium: "BE", "United Kingdom": "GB", Japan: "JP", Andorra: "AD", Iceland: "IS", Netherlands: "NL", Austria: "AT", "South Korea": "KR", Denmark: "DK", Sweden: "SE" };

function bikeCategory(b) {
  const s = b.subcategory;
  switch (b.category) {
    case "road": return s === "time-trial" || s === "triathlon" ? "bikes/tt-triathlon" : s === "track" ? "bikes/track" : "bikes/road";
    case "mtb": return "bikes/mountain";
    case "gravel": return "bikes/gravel";
    case "urban": return s === "hybrid" || s === "fitness" ? "bikes/hybrid" : s === "touring" || s === "trekking" ? "bikes/touring" : "bikes/city";
    case "electric": return "bikes/electric";
    case "folding": return "bikes/folding";
    case "bmx": return "bikes/bmx";
    default: return s === "kids" || s === "balance-bikes" ? "bikes/kids" : s === "fixed-gear" ? "bikes/track" : "bikes/other";
  }
}

function componentCategory(c) {
  const a = c.compat ?? {};
  if (/\brotors?\b/i.test(c.name)) return "brakes/rotors";
  switch (c.type) {
    case "frame": return "frames/frames";
    case "fork": return a.travelMm > 0 ? "frames/forks-suspension" : a.travelMm === 0 ? "frames/forks-rigid" : "frames";
    case "groupset": return "drivetrain/groupsets";
    case "shifters": return "drivetrain/shifters";
    case "front-derailleur": return "drivetrain/front-derailleurs";
    case "rear-derailleur": return "drivetrain/rear-derailleurs";
    case "crankset": return "drivetrain/cranksets";
    case "cassette": return "drivetrain/cassettes";
    case "chain": return "drivetrain/chains";
    case "brakes": return /disc/.test(a.brakeType ?? "") ? "brakes/disc-brakes" : /rim|v-brake/.test(a.brakeType ?? "") ? "brakes/rim-brakes" : "brakes";
    case "wheelset": return "wheels/wheelsets";
    case "rim": return "wheels/rims";
    case "tires": return "wheels/tires";
    case "hub": return "wheels/hubs";
    case "handlebar": return "cockpit/handlebars";
    case "stem": return "cockpit/stems";
    case "saddle": return "cockpit/saddles";
    case "seatpost": return "cockpit/seatposts";
    case "pedals": return "cockpit/pedals";
    case "bearing": return "bearings";
    default: return "accessories/other";
  }
}

function price(p) {
  if (!p) return { msrp_amount: null, msrp_currency: null, price_idr: null, price_basis: "unavailable", price_source_url: null, price_observed_on: null };
  const base = { price_idr: p.amount, price_source_url: p.sourceUrl ?? null, price_observed_on: p.date ?? null };
  if (p.type === "retailer" || p.type === "distributor") return { msrp_amount: null, msrp_currency: null, price_idr: null, price_basis: "unavailable", price_source_url: null, price_observed_on: null }; // a seller's price is an offer, not the product's MSRP
  if (p.type === "estimated") return { ...base, msrp_amount: null, msrp_currency: null, price_basis: "estimate" };
  if (!p.sourceUrl) return { ...base, msrp_amount: null, msrp_currency: null, price_idr: null, price_basis: "unavailable" }; // unsourced non-estimate: not shown as a price
  if (p.original) return { ...base, msrp_amount: p.original.amount, msrp_currency: p.original.currency, price_basis: "converted-msrp" };
  return { ...base, msrp_amount: p.amount, msrp_currency: "IDR", price_basis: "msrp" };
}

const origin = (pv) => (pv.demo ? "velox-seed" : pv.status === "verified-official" || pv.status === "verified-distributor" ? "official-import" : "researched");
const conf = (pv) => pv.confidence ?? "low";
const jsonl = (name, rows) => { fs.writeFileSync(path.join(out, name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n"); return rows.length; };

await withModules(async (load) => {
  const { BIKES } = await load("/src/data/bikes.ts");
  const { COMPONENTS } = await load("/src/data/components.ts");
  const { BRANDS } = await load("/src/data/brands.ts");
  const { imageForBike, imageForComponent } = await load("/src/data/product-images.ts");

  const brands = BRANDS.map((b) => ({
    id: b.id, name: b.name, country_code: COUNTRY[b.country] ?? null, country_name: COUNTRY[b.country] ? b.country : null, founded: b.founded ?? null, website: b.website ?? null, description: b.description ?? "",
    history: b.history ?? null, logo_url: b.logoUrl ?? null, mark_color: b.mark?.color ?? null, kinds: b.kinds?.length ? b.kinds : ["bicycles"],
    parent_company: b.parentCompany ?? null, headquarters: b.headquarters ?? null, status: b.provenance.status, confidence: conf(b.provenance),
    original_manufacturer: b.provenance.originalManufacturer ?? null, reviewer_notes: b.provenance.reviewerNotes ?? null, is_demo: !!b.provenance.demo,
    region: b.region, categories: b.categories,
  }));
  const known = new Set(brands.map((b) => b.id));
  for (const c of COMPONENTS) if (!known.has(c.manufacturerSlug)) {
    known.add(c.manufacturerSlug);
    brands.push({ id: c.manufacturerSlug, name: c.manufacturer, country_code: null, founded: null, website: null,
      description: c.manufacturerSlug === "standard" ? "Generic parts defined by an industry standard (e.g. ISO bearing sizes) rather than a brand." : "",
      history: null, logo_url: null, mark_color: null, kinds: ["components"], parent_company: null, headquarters: null, status: "unverified", confidence: "low",
      original_manufacturer: null, reviewer_notes: "Created from component records during the Phase 2 catalogue migration.", is_demo: false, region: null, categories: [] });
  }

  const products = [], sources = [], variants = [], offers = [];
  const addOffer = (id, title, p) => {
    if (!p || (p.type !== "retailer" && p.type !== "distributor") || !p.sourceUrl) return;
    const host = new URL(p.sourceUrl).host.replace(/^www\./, "");
    offers.push({ product_id: id, provider_id: "velox-research", seller_id: host, seller_name: (p.source ?? host).replace(/\s*\(.*\)$/, ""),
      seller_kind: p.type === "distributor" ? "authorized-distributor" : "retailer", url: p.sourceUrl, title_as_listed: title,
      price: p.original ? p.original.amount : p.amount, currency: p.original ? p.original.currency : "IDR", condition: "new", observed_at: p.date ?? null });
  };
  const addSources = (id, pv) => { for (const s of pv.sources ?? []) sources.push({ product_id: id, field: null, label: s.label, url: s.url ?? null, source_type: s.type ?? "editorial-seed", retrieved_at: s.retrievedAt ?? null }); };

  for (const b of BIKES) {
    const img = imageForBike(b.id);
    products.push({
      id: b.id, kind: "bike", brand_id: b.brandId, name: b.name, model: b.variant ?? null, family: b.family ?? null,
      model_year: b.yearBasis === "undated" ? null : b.year, year_basis: b.yearBasis ?? "model-year", category_id: bikeCategory(b), subcategory: b.subcategory ?? null,
      description: b.ridingStyle ?? null,
      specs: Object.fromEntries(Object.entries({ groupset: b.groupset, drivetrain: b.drivetrain, brakes: b.brakes, brakeType: b.brakeType, wheelset: b.wheelset, tires: b.tires,
        wheelSize: b.wheelSize, tireClearanceMm: b.tireClearanceMm, suspension: b.suspension, travel: b.travel ?? null, frameMaterial: b.frameMaterial }).filter(([, v]) => v != null)),
      compat: b.compat ?? {}, weight_g: b.weightKg ? Math.round(b.weightKg * 1000) : null, material: b.frameMaterial ?? null, official_url: b.officialUrl ?? null,
      primary_image: img?.primary_image_url ?? null, ...price(b.price),
      verification: b.provenance.status, identity_confidence: conf(b.provenance), specs_confidence: conf(b.provenance), manufacturer_confidence: conf(b.provenance),
      last_verified_at: b.provenance.updatedAt || null, data_origin: origin(b.provenance),
      details: { legacy: "bike", category: b.category, componentSpec: b.componentSpec ?? null, geometry: b.geometry ?? null, sizes: b.sizes, colors: b.colors ?? null,
        usage: b.usage, experience: b.experience, highlights: b.highlights, drawbacks: b.drawbacks, electric: b.electric ?? null, generation: b.generation ?? null,
        frameColor: b.frameColor ?? null, priceEntry: b.price ?? null, priceHistory: b.priceHistory ?? null, originalManufacturer: b.provenance.originalManufacturer ?? null,
        reviewerNotes: b.provenance.reviewerNotes ?? null, imageUrl: b.imageUrl ?? null },
    });
    addOffer(b.id, b.name, b.price);
    addSources(b.id, b.provenance);
  }

  for (const c of COMPONENTS) {
    const img = imageForComponent(c.id);
    products.push({
      id: c.id, kind: c.type === "accessory" ? "accessory" : "component", brand_id: c.manufacturerSlug, name: c.name, model: null, family: c.series ?? null,
      model_year: c.modelYear ?? null, year_basis: c.modelYear ? "model-year" : "undated", category_id: componentCategory(c), subcategory: c.type,
      description: (c.benefits ?? []).join(" ") || null, specs: c.specs ?? {}, compat: c.compat ?? {}, weight_g: c.weightG ?? null, material: c.material ?? null,
      official_url: c.officialUrl ?? null, primary_image: img?.primary_image_url ?? null, ...price(c.price),
      verification: c.provenance.status, identity_confidence: conf(c.provenance), specs_confidence: conf(c.provenance), manufacturer_confidence: conf(c.provenance),
      last_verified_at: c.provenance.updatedAt || null, data_origin: origin(c.provenance),
      details: { legacy: "component", type: c.type, tier: c.tier, discipline: c.discipline, kit: c.kit ?? null, benefits: c.benefits ?? [], wheel: c.wheel ?? null,
        bearing: c.bearing ?? null, priceEntry: c.price ?? null, originalManufacturer: c.provenance.originalManufacturer ?? null, reviewerNotes: c.provenance.reviewerNotes ?? null, imageUrl: c.imageUrl ?? null },
    });
    addOffer(c.id, c.name, c.price);
    if (c.productId) variants.push({ product_id: c.id, label: "Standard", mpn: c.productId });
    addSources(c.id, c.provenance);
  }

  console.log(`brands ${jsonl("brands.jsonl", brands)}, products ${jsonl("products.jsonl", products)}, sources ${jsonl("sources.jsonl", sources)}, variants ${jsonl("variants.jsonl", variants)}, offers ${jsonl("offers.jsonl", offers)} → ${out}`);
});
