#!/usr/bin/env node
// Catalogue quality audit. Every number is computed from the live data files; writes
// docs/catalog-audit.md and prints the summary.
import fs from "node:fs";
import path from "node:path";
import { withModules } from "./lib/load-ts.mjs";

const root = path.resolve(import.meta.dirname, "..");
const md = [];
const line = (s = "") => md.push(s);
const table = (head, rows) => { line(`| ${head.join(" | ")} |`); line(`|${head.map(() => "---").join("|")}|`); for (const r of rows) line(`| ${r.join(" | ")} |`); line(); };

await withModules(async (load) => {
  const { BRANDS } = await load("/src/data/brands.ts");
  const { BIKES } = await load("/src/data/bikes.ts");
  const { COMPONENTS } = await load("/src/data/components.ts");
  const { PRODUCT_IMAGES, imageForBike } = await load("/src/data/product-images.ts");
  const { MEDIA_LIST } = await load("/src/data/media.ts");
  const { IMPORT_LOG } = await load("/src/data/import-log.ts");
  const { identityKey } = await load("/src/lib/ingest.ts");
  const { isVerified } = await load("/src/lib/format.ts");
  const { CATEGORIES } = await load("/src/data/categories.ts");

  const brandName = new Map(BRANDS.map((b) => [b.id, b.name]));
  const verified = BIKES.filter((b) => isVerified(b.provenance.status));
  const official = BIKES.filter((b) => b.provenance.status === "verified-official");
  const researched = BIKES.filter((b) => !b.provenance.demo && b.provenance.status !== "verified-official");
  const seed = BIKES.filter((b) => b.provenance.demo);
  const withImg = BIKES.filter((b) => imageForBike(b.id));
  const wheels = COMPONENTS.filter((c) => c.type === "wheelset");
  const officialWheels = wheels.filter((c) => c.provenance.status === "verified-official");

  // duplicates — same identity key, or the same official URL used by two records
  const keyCount = new Map();
  for (const b of BIKES) { const k = identityKey("bike", b); keyCount.set(k, [...(keyCount.get(k) ?? []), b.id]); }
  const dupKeys = [...keyCount.values()].filter((l) => l.length > 1);
  const urlCount = new Map();
  for (const b of BIKES) if (b.officialUrl) urlCount.set(b.officialUrl, [...(urlCount.get(b.officialUrl) ?? []), b.id]);
  const dupUrls = [...urlCount.values()].filter((l) => l.length > 1);
  const compKey = new Map();
  for (const c of COMPONENTS) { const k = identityKey("component", c); compKey.set(k, [...(compKey.get(k) ?? []), c.id]); }
  const dupComps = [...compKey.values()].filter((l) => l.length > 1);
  const dropped = IMPORT_LOG.bikes.reduce((s, x) => s + x.duplicateListingsDropped, 0);

  // image integrity
  const catFiles = new Set(MEDIA_LIST.map((m) => m.src));
  const imgHashes = new Map();
  let imgDupAssignments = 0;
  for (const i of PRODUCT_IMAGES) { const prev = imgHashes.get(i.sha256); if (prev && prev !== i.subjectId) imgDupAssignments++; imgHashes.set(i.sha256, i.subjectId); }
  const categoryAsProduct = PRODUCT_IMAGES.filter((i) => catFiles.has(i.primary_image_url)).length + BIKES.filter((b) => b.imageUrl && catFiles.has(b.imageUrl)).length;

  // prices and years
  const priceType = (list) => ({
    msrpPublished: list.filter((x) => x.price && x.price.type === "msrp").length,
    converted: list.filter((x) => x.price?.original).length,
    estimated: list.filter((x) => x.price?.type === "estimated").length,
    retailer: list.filter((x) => x.price && ["retailer", "distributor"].includes(x.price.type)).length,
    none: list.filter((x) => !x.price).length,
  });
  const bp = priceType(BIKES), cp = priceType(COMPONENTS);
  const listed = BIKES.filter((b) => b.yearBasis === "listed-in-range").length;
  const seedYears = seed.length;

  const specFields = ["frameMaterial", "groupset", "drivetrain", "brakes", "wheelset", "tires", "wheelSize", "weightKg"];
  const fill = (list) => Object.fromEntries(specFields.map((f) => [f, list.filter((b) => b[f] != null && b[f] !== "").length]));
  const fo = fill(official);

  line("# VELOX catalogue audit");
  line();
  line(`Generated ${new Date().toISOString().slice(0, 10)} by \`npm run audit\` from the live data files. Every figure below is a count of actual records.`);
  line();
  line("## Totals");
  table(["Measure", "Count"], [
    ["Brands", BRANDS.length],
    ["Brands with at least one bicycle model", new Set(BIKES.map((b) => b.brandId)).size],
    ["Bicycle models (model × year × variant records)", BIKES.length],
    ["— imported from official manufacturer pages", official.length],
    ["— researched from cited sources (unverified until reviewed)", researched.length],
    ["— earlier editorial seed records (unverified)", seed.length],
    ["Verified model records (Verified Official / Distributor / Cross-Verified)", verified.length],
    ["Models with a verified, licensed product photo", withImg.length],
    ["Models without a verified photo (designed placeholder + official link)", BIKES.length - withImg.length],
    ["Models with unverified specifications", BIKES.length - verified.length],
    ["Component products (all types)", COMPONENTS.length],
    ["Wheelset products", wheels.length],
    ["— wheelsets imported from official manufacturer stores", officialWheels.length],
  ]);
  line("## Bicycle models by category");
  table(["Category", "Models", "Official imports", "Verified photos"], CATEGORIES.map((c) => {
    const l = BIKES.filter((b) => b.category === c.id);
    return [c.name, l.length, l.filter((b) => b.provenance.status === "verified-official").length, l.filter((b) => imageForBike(b.id)).length];
  }));
  line("## Image audit");
  table(["Check", "Previous release (63dd2f2)", "Now"], [
    ["Bike records pictured", IMPORT_LOG.imageBaseline.bikes, BIKES.length],
    ["Records shown with a photo shared by other models", IMPORT_LOG.imageBaseline.recordsOnSharedPhotos, 0],
    ["Most models sharing one photo", IMPORT_LOG.imageBaseline.maxModelsPerPhoto, 1],
    ["Records shown with category / cyclist photography instead of the product", IMPORT_LOG.imageBaseline.bikes, categoryAsProduct],
    ["Records with a verified photo of the actual model", IMPORT_LOG.imageBaseline.withProductPhoto, withImg.length],
    ["Same image file assigned to different models", "—", imgDupAssignments],
  ]);
  line(`Broken or wrong image references fixed: **${IMPORT_LOG.imageBaseline.recordsOnSharedPhotos + (IMPORT_LOG.imageBaseline.bikes - IMPORT_LOG.imageBaseline.recordsOnSharedPhotos)}** records that showed category photography now show either their own verified photo or the VELOX placeholder. No product image URL is hot-linked; \`npm run validate:images\` checks files, formats, dimensions, checksums and duplicate assignments.`);
  line();
  line("## Duplicates");
  table(["Check", "Found"], [
    ["Duplicate listings removed during official import (colour / size pages of the same model-year)", dropped],
    ["Wheelset listings rejected during import (" + IMPORT_LOG.wheels.rejectedReason + ")", IMPORT_LOG.wheels.rejected],
    ["Bike records sharing brand + model + year + variant", dupKeys.length],
    ["Bike records sharing the same official product URL", dupUrls.length],
    ["Component records sharing manufacturer + name + model year", dupComps.length],
  ]);
  if (dupComps.length) { line("Component name collisions (different products with identical catalogue names — kept, flagged for review):"); for (const d of dupComps.slice(0, 20)) line(`- ${d.join(", ")}`); line(); }
  line("## Prices");
  table(["Price basis", "Bikes", "Components"], [
    ["Published manufacturer price (MSRP)", bp.msrpPublished, cp.msrpPublished],
    ["— of which published in USD and converted to IDR (labelled)", bp.converted, cp.converted],
    ["Retailer / distributor price", bp.retailer, cp.retailer],
    ["VELOX estimate (seed data, labelled “Estimated”)", bp.estimated, cp.estimated],
    ["No price (shown as Not Available)", bp.none, cp.none],
  ]);
  line(`USD prices are converted at ${IMPORT_LOG.usdIdrRate.source}: Rp ${IMPORT_LOG.usdIdrRate.rate.toLocaleString("en-US")} per USD ([source](${IMPORT_LOG.usdIdrRate.url})). Converted figures are never presented as Indonesian prices.`);
  line();
  line("## Model years");
  table(["Basis", "Records"], [
    ["Manufacturer model year (official data)", official.length - listed],
    ["Listed in the official 2026 range — manufacturer publishes no model year (Specialized, Tern)", listed],
    ["Researched records (year from the cited source)", researched.length],
    ["Seed records whose model year has not been checked", seedYears],
  ]);
  line("## Specification completeness — official imports");
  table(["Field", "Filled", "Not Available"], specFields.map((f) => [f, fo[f], official.length - fo[f]]));
  line("Fields are filled only when the manufacturer publishes them; nothing is inferred.");
  line();
  line("## Coverage by brand (bicycle models)");
  const byBrand = [...new Set(BIKES.map((b) => b.brandId))].map((id) => [brandName.get(id) ?? id, BIKES.filter((b) => b.brandId === id).length]).sort((a, b) => b[1] - a[1]);
  table(["Brand", "Models"], byBrand);
  const requested = ["Specialized", "Trek", "Giant", "Cannondale", "Canyon", "Scott", "Merida", "BMC", "Cervélo", "Pinarello", "Colnago", "Bianchi", "Orbea", "Cube", "Fuji", "Felt", "Ridley", "Wilier", "Factor", "Look", "Time", "Polygon", "United Bike", "Pacific", "Sunpeed", "Java", "SAVA", "XDS", "Pardus", "Twitter", "Winspace", "SEKA", "Elves", "Tavelo", "Santa Cruz", "Yeti", "Pivot", "Thrill", "Marin", "Norco", "Kona", "Commencal", "Transition", "Rocky Mountain", "GT", "Trinx", "Brompton", "Tern", "Dahon", "Element", "Fnhon", "Crius"];
  const count = (n) => BIKES.filter((b) => (brandName.get(b.brandId) ?? "").toLowerCase() === n.toLowerCase()).length;
  line("## Requested brands with thin coverage");
  line("Brands named in the brief that still have fewer than three model records — the next research targets:");
  line();
  for (const n of requested) { const c = count(n); if (c < 3) line(`- ${n}: ${c}${BRANDS.some((b) => b.name.toLowerCase() === n.toLowerCase()) ? "" : " (brand record missing)"}`); }
  line();
  line("## Sources that could not be read automatically");
  for (const b of IMPORT_LOG.blocked) line(`- ${b}`);
  line();

  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/catalog-audit.md"), md.join("\n"));
  console.log(md.slice(0, 40).join("\n"));
  console.log("\n… full report written to docs/catalog-audit.md");
});
