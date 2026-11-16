import type { Component, Discipline, SourceRef, Tier, WheelSize, WheelsetSpec } from "@/lib/types";
import { DEMO_PROVENANCE } from "./provenance";
import { slugify } from "./brands";

/**
 * Additional wheelsets, hubs and bearings.
 *
 * Wheelsets from the 2026-11-16 research pass carry the sources where the model name and the
 * listed facts appeared. Only facts stated by those sources are filled in; everything else is null.
 * Prices are left null — the only prices found were foreign-currency retailer listings.
 *
 * Bearings use published ISO 15 / manufacturer-standard boundary dimensions for each designation.
 */

const R = "2026-11-16";
const s = (label: string, url: string, type: SourceRef["type"] = "publication"): SourceRef => ({ label, url, type, retrievedAt: R });

interface WheelDef {
  id: string; mfr: string; name: string; disc: Discipline[]; tier: Tier;
  size?: WheelSize; brake: "disc" | "rim";
  spec: WheelsetSpec; g?: number | null; sources?: SourceRef[]; notes?: string; productId?: string | null;
}

function wheel(d: WheelDef): Component {
  return {
    id: d.id, type: "wheelset", manufacturer: d.mfr, manufacturerSlug: slugify(d.mfr), name: d.name,
    discipline: d.disc, tier: d.tier, series: null, weightG: d.g ?? null, material: d.spec.rimMaterial ?? null, price: null,
    specs: { Depth: d.spec.rimDepthMm != null ? `${d.spec.rimDepthMm} mm` : null, "Internal width": d.spec.internalWidthMm != null ? `${d.spec.internalWidthMm} mm` : null },
    compat: { wheelSize: d.size ?? "700c", brakeInterface: d.brake, internalRimMm: d.spec.internalWidthMm ?? null, frontAxle: null, rearAxle: null, freehubOptions: null, rotorMount: null, tubeless: null },
    wheel: d.spec, productId: d.productId ?? null, imageUrl: null, officialUrl: null, benefits: [],
    provenance: d.sources?.length
      ? { status: "unverified", sources: d.sources, updatedAt: R, confidence: "medium", reviewerNotes: d.notes ?? "Model and listed facts from the cited sources; remaining specs await the official spec sheet." }
      : { ...DEMO_PROVENANCE, confidence: "low" },
  };
}

export const EXTRA_WHEELS: Component[] = [
  wheel({ id: "wheel-light-bicycle-wr40-disc", mfr: "Light Bicycle", name: "WR40 Disc (X Flow)", disc: ["gravel", "road"], tier: "mid", brake: "disc",
    spec: { rimMaterial: "Carbon", rimDepthMm: 40, externalWidthMm: 32, warranty: "2 years (carbon rims and wheels, per manufacturer)" },
    sources: [s("Light Bicycle — WR40 Disc product page", "https://www.lightbicycle.com/700C-tubeless-bicycle-wheels-32mm-wide-40mm-deep-clincher-for-cyclocross-road-and-gravel-bikes.html", "official-website"), s("LightCarbon — About", "https://lightcarbon.com/about-lc_d1", "official-website")] }),
  wheel({ id: "wheel-exar-db58-pro-2022", mfr: "EXAR", name: "DB58 Pro (2022) Disc", disc: ["road"], tier: "mid", brake: "disc",
    spec: { rimMaterial: "Carbon (T800)", rimDepthMm: 58, hubManufacturer: "EXAR", warranty: "2 years (Pro line)" },
    sources: [s("Panda Podium — Magene EXAR DB58 Pro 2022", "https://pandapodium.cc/product/magene-exar-db58-pro-2022-carbon-disc-brake-wheelset", "retailer"), s("Magene support — EXAR wheelset Pro 2022", "https://support.magene.com/hc/en-us/categories/25599277850137-Carbon-Fiber-Wheelset-Pro-2022", "official-website")] }),
  wheel({ id: "wheel-exar-rb45-pro-2022", mfr: "EXAR", name: "RB45 Pro (2022) Rim Brake", disc: ["road"], tier: "mid", brake: "rim",
    spec: { rimMaterial: "Carbon (T800)", rimDepthMm: 45, hubManufacturer: "EXAR", warranty: "2 years (Pro line)" },
    sources: [s("Panda Podium — Magene EXAR RB45 Pro 2022", "https://pandapodium.cc/product/magene-exar-rb45-pro-2022-carbon-rim-brake-wheelset", "retailer")] }),
  wheel({ id: "wheel-yoeleo-sat-c50-db-pro", mfr: "Yoeleo", name: "SAT C50 DB Pro", disc: ["road"], tier: "mid", brake: "disc", g: 1290,
    spec: { rimMaterial: "Carbon (T800)", rimDepthMm: 50 },
    sources: [s("Cyclists Hub — Chinese carbon wheels", "https://www.cyclistshub.com/chinese-carbon/chinese-wheels/")], notes: "1,290 g is the manufacturer's claimed weight as quoted by a review site." }),
  wheel({ id: "wheel-nepest-nova", mfr: "Nepest", name: "Nova", disc: ["road"], tier: "mid", brake: "disc",
    spec: { rimMaterial: "Carbon", spokeType: "Vonoa, titanium T-head", warranty: "3 years" },
    sources: [s("Cyclists Hub — Nepest Nova review", "https://www.cyclistshub.com/nepest-nova-review/"), s("Hambini — Nepest Nova review", "https://www.hambini.com/?p=25490")] }),
  wheel({ id: "wheel-superteam-classic-38", mfr: "Superteam", name: "Classic Series 38", disc: ["road"], tier: "entry", brake: "disc",
    spec: { rimMaterial: "Carbon", rimDepthMm: 38 },
    sources: [s("Ride On — Superteam Classic Series 38mm tested", "https://rideonmagazine.com.au/tested-superteam-classic-series-38mm-carbon-wheels/")], notes: "Brake type on the tested set not confirmed in the snippet — verify." }),
  wheel({ id: "wheel-upvine-pro-plus-2", mfr: "UPVINE", name: "Pro+ 2", disc: ["road"], tier: "mid", brake: "disc",
    spec: { rimMaterial: "Carbon" },
    sources: [s("Cyclists Hub — UPVINE Pro+ 2 review", "https://www.cyclistshub.com/upvine-pro-plus-2-review/")] }),
  wheel({ id: "wheel-lun-hyper", mfr: "Lún", name: "HYPER Series", disc: ["road"], tier: "performance", brake: "disc",
    spec: { rimMaterial: "Carbon" },
    sources: [s("Cyclists Hub — Lún Hyper Light", "https://www.cyclistshub.com/lun-hyper-light-wheels/")], notes: "Series-level record; individual depths/variants to be split into separate records once the official spec sheet is imported." }),
  wheel({ id: "wheel-elitewheels-drive-helix-68d", mfr: "Elitewheels", name: "Drive Helix 68D CS", disc: ["road"], tier: "performance", brake: "disc",
    spec: { rimMaterial: "Carbon", rimDepthMm: 68 },
    sources: [s("Mantel — Elitewheels Drive Helix 68D CS", "https://www.mantel.com/ie/elitewheels-drive-helix-68d-cs-road-bike-wheels", "retailer")] }),
  wheel({ id: "wheel-cadex-36-disc", mfr: "Cadex", name: "36 Tubeless Disc", disc: ["road"], tier: "pro", brake: "disc",
    spec: { rimMaterial: "Carbon", rimDepthMm: 36 },
    sources: [s("BikeTiresDirect — Cadex 36", "https://www.biketiresdirect.com/product/cadex-36-tubeless-carbon-disc-brake-wheels", "retailer")] }),
  wheel({ id: "wheel-cadex-50-ultra-disc", mfr: "Cadex", name: "50 Ultra Tubeless Disc", disc: ["road"], tier: "pro", brake: "disc",
    spec: { rimMaterial: "Carbon", rimDepthMm: 50 },
    sources: [s("BikeTiresDirect — Cadex 50 Ultra", "https://www.biketiresdirect.com/product/cadex-50-ultra-tubeless-carbon-disc-brake-wheels", "retailer")] }),
  wheel({ id: "wheel-cadex-max-xc", mfr: "Cadex", name: "Max XC WheelSystem", disc: ["mtb"], tier: "pro", size: "29", brake: "disc", g: 1248,
    spec: { rimMaterial: "Carbon", spokeType: "Bonded carbon" },
    sources: [s("BikeRadar — Cadex Max XC", "https://www.bikeradar.com/news/cadex-max-xc-wheelsystem")], notes: "1,248 g as reported in the launch coverage (claimed)." }),
  wheel({ id: "wheel-avian-ar740", mfr: "Avian", name: "AR740 Carbon (BMX race)", disc: ["bmx"], tier: "pro", size: "20", brake: "rim",
    spec: { rimMaterial: "Carbon", spokeCount: "24/24" },
    sources: [s("Mojo BMX — Avian AR740", "https://reach.dog/shop/mojo-bmx/products/avian-ar740-carbon-wheelset-sram-black-24h", "retailer")], notes: "BMX race wheel; '24h' from listing title. Wheel diameter assumed 20\" from BMX race context — verify (some race sizes differ)." }),
  // seed records (well-known models; specs pending verification)
  wheel({ id: "wheel-roval-rapide-clx-ii", mfr: "Roval", name: "Rapide CLX II", disc: ["road"], tier: "pro", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-dt-swiss-arc-1100-50", mfr: "DT Swiss", name: "ARC 1100 DICUT 50 Disc", disc: ["road"], tier: "pro", brake: "disc", spec: { rimMaterial: "Carbon", rimDepthMm: 50, hubManufacturer: "DT Swiss" } }),
  wheel({ id: "wheel-campagnolo-bora-ultra-wto", mfr: "Campagnolo", name: "Bora Ultra WTO", disc: ["road"], tier: "pro", brake: "disc", spec: { rimMaterial: "Carbon", hubManufacturer: "Campagnolo" } }),
  wheel({ id: "wheel-reynolds-ar", mfr: "Reynolds", name: "AR Disc", disc: ["road"], tier: "performance", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-industry-nine-enduro-s", mfr: "Industry Nine", name: "Enduro S Hydra", disc: ["mtb"], tier: "performance", size: "29", brake: "disc", spec: { rimMaterial: "Aluminium", hubManufacturer: "Industry Nine", hubModel: "Hydra" } }),
  wheel({ id: "wheel-reserve-30-hd", mfr: "Reserve", name: "30|HD", disc: ["mtb"], tier: "performance", size: "29", brake: "disc", spec: { rimMaterial: "Carbon", internalWidthMm: 30 } }),
  wheel({ id: "wheel-scope-r5", mfr: "Scope Cycling", name: "R5", disc: ["road"], tier: "performance", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-ffwd-ryot-55", mfr: "FFWD", name: "RYOT 55", disc: ["road"], tier: "performance", brake: "disc", spec: { rimMaterial: "Carbon", rimDepthMm: 55 } }),
  wheel({ id: "wheel-princeton-grit-4540", mfr: "Princeton CarbonWorks", name: "Grit 4540", disc: ["gravel"], tier: "pro", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-boyd-pisgah", mfr: "Boyd Cycling", name: "Pisgah", disc: ["gravel"], tier: "mid", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-easton-ec90-sl", mfr: "Easton", name: "EC90 SL Disc", disc: ["road"], tier: "performance", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-syncros-capital-1-0", mfr: "Syncros", name: "Capital 1.0 Disc", disc: ["road"], tier: "performance", brake: "disc", spec: { rimMaterial: "Carbon" } }),
  wheel({ id: "wheel-mavic-ksyrium-sl-disc", mfr: "Mavic", name: "Ksyrium SL Disc", disc: ["road"], tier: "mid", brake: "disc", spec: { rimMaterial: "Aluminium" } }),
  wheel({ id: "wheel-bontrager-aeolus-pro-51", mfr: "Bontrager", name: "Aeolus Pro 51", disc: ["road"], tier: "performance", brake: "disc", spec: { rimMaterial: "Carbon", rimDepthMm: 51 } }),
];

/* ------------------------------- hubs ------------------------------- */

const hub = (id: string, mfr: string, name: string, disc: Discipline[], tier: Tier, specs: Record<string, string | null> = {}): Component => ({
  id, type: "hub", manufacturer: mfr, manufacturerSlug: slugify(mfr), name, discipline: disc, tier, series: null, weightG: null, material: null, price: null,
  specs: { ...specs, "Bearing sizes": null }, compat: {}, benefits: [], imageUrl: null, officialUrl: null,
  provenance: { ...DEMO_PROVENANCE, confidence: "low", reviewerNotes: "Bearing sizes deliberately not recorded — use the manufacturer's service documentation or measure the bearing." },
});

export const HUBS: Component[] = [
  hub("hub-dt-swiss-240-exp", "DT Swiss", "240 EXP", ["road", "gravel", "mtb"], "performance", { Freehub: "Ratchet EXP" }),
  hub("hub-dt-swiss-350", "DT Swiss", "350", ["road", "gravel", "mtb"], "mid", { Freehub: "Ratchet" }),
  hub("hub-dt-swiss-180-exp", "DT Swiss", "180 EXP", ["road", "gravel", "mtb"], "pro", { Freehub: "Ratchet EXP" }),
  hub("hub-chris-king-r45d", "Chris King", "R45D", ["road", "gravel"], "pro"),
  hub("hub-hope-pro-5", "Hope", "Pro 5", ["mtb", "gravel"], "performance"),
  hub("hub-industry-nine-hydra", "Industry Nine", "Hydra", ["mtb", "gravel"], "pro"),
  hub("hub-novatec-road", "Novatec", "Road disc hub (series)", ["road"], "mid"),
  hub("hub-bitex-road", "Bitex", "Road hub (series)", ["road"], "mid"),
  hub("hub-powerway-road", "Powerway", "Road hub (series)", ["road"], "entry"),
  hub("hub-chosen-road", "Chosen", "Road hub (series)", ["road"], "entry"),
  hub("hub-shimano-fh-r7070", "Shimano", "105 FH-R7070 (rear, disc)", ["road"], "mid", { Freehub: "HG 11/12-speed road" }),
];

/* ------------------------------ bearings ------------------------------ */

type BDef = [designation: string, inner: number, outer: number, width: number, kind: "deep-groove" | "angular-contact" | "headset-acb", uses: string[], angle?: string];
const STD = "ISO 15 boundary dimensions";

/** Deep-groove designations below follow ISO 15 standard boundary dimensions. */
const BEARING_DEFS: BDef[] = [
  ["608", 8, 22, 7, "deep-groove", ["Pedal axles", "Older jockey wheels"]],
  ["688", 8, 16, 5, "deep-groove", ["Pedals", "Small pivots"]],
  ["6000", 10, 26, 8, "deep-groove", ["Hubs", "Suspension pivots"]],
  ["6001", 12, 28, 8, "deep-groove", ["Hubs", "Suspension pivots"]],
  ["6002", 15, 32, 9, "deep-groove", ["Hubs"]],
  ["6003", 17, 35, 10, "deep-groove", ["Hubs"]],
  ["6800", 10, 19, 5, "deep-groove", ["Suspension pivots"]],
  ["6801", 12, 21, 5, "deep-groove", ["Suspension pivots", "Hubs"]],
  ["6802", 15, 24, 5, "deep-groove", ["Hubs (15 mm axles)", "Freehub bodies"]],
  ["6803", 17, 26, 5, "deep-groove", ["Hubs", "Freehub bodies"]],
  ["6804", 20, 32, 7, "deep-groove", ["Hubs", "Rear hub drive side"]],
  ["6805", 25, 37, 7, "deep-groove", ["Bottom brackets", "Hubs"]],
  ["6806", 30, 42, 7, "deep-groove", ["BB30 bottom brackets (pressed directly into the shell)", "PF30 cups"]],
  ["6900", 10, 22, 6, "deep-groove", ["Suspension pivots"]],
  ["6901", 12, 24, 6, "deep-groove", ["Suspension pivots", "Hubs"]],
  ["6902", 15, 28, 7, "deep-groove", ["Hubs (15 mm axles)"]],
  ["6903", 17, 30, 7, "deep-groove", ["Hubs", "Freehub bodies"]],
  ["6904", 20, 37, 9, "deep-groove", ["Hubs"]],
  ["MR15267", 15, 26, 7, "deep-groove", ["Hubs (15 mm axles)", "Freehub bodies"]],
  ["MR17287", 17, 28, 7, "deep-groove", ["Hubs", "Freehub bodies"]],
  ["MR2437", 24, 37, 7, "deep-groove", ["24 mm-spindle external / press-fit bottom brackets"]],
  ["ACB 30.15×41.8×8 45×45°", 30.15, 41.8, 8, "headset-acb", ["1-1/8\" headsets (IS42 / ZS44 cups)"], "45×45"],
  ["ACB 30.15×41×6.5 36×45°", 30.15, 41, 6.5, "headset-acb", ["1-1/8\" headsets (36° variant)"], "36×45"],
  ["ACB 40×52×7 45×45°", 40, 52, 7, "headset-acb", ["1.5\" lower headsets (IS52 / ZS56 cups)"], "45×45"],
  ["ACB 30.5×41.8×8 36×45°", 30.5, 41.8, 8, "headset-acb", ["Campagnolo-standard 1-1/8\" headsets"], "36×45"],
];

export const BEARINGS: Component[] = BEARING_DEFS.map(([designation, inner, outer, width, kind, uses, angle]) => ({
  id: `bearing-${slugify(designation)}`, type: "bearing", manufacturer: "Standard", manufacturerSlug: "standard", name: designation,
  discipline: ["universal"], tier: "mid", series: null, weightG: null, material: null, price: null,
  specs: { "Inner Ø": `${inner} mm`, "Outer Ø": `${outer} mm`, Width: `${width} mm`, Type: kind === "headset-acb" ? "Angular-contact headset" : "Deep-groove radial", "Contact angle": angle ?? null },
  compat: {}, benefits: [], imageUrl: null, officialUrl: null, productId: designation,
  bearing: { designation, innerMm: inner, outerMm: outer, widthMm: width, kind, contactAngle: angle ?? null, sealing: null, typicalUse: uses },
  provenance: kind === "headset-acb"
    ? { status: "unverified", sources: [{ label: "Common headset bearing dimensions (industry practice)", type: "standard", retrievedAt: R }], updatedAt: R, confidence: "medium", reviewerNotes: "Headset bearing dimensions are common industry sizes, not an ISO designation — always measure the old bearing; manufacturers vary." }
    : { status: "cross-verified", sources: [{ label: STD, type: "standard", retrievedAt: R }], updatedAt: R, confidence: "high", reviewerNotes: "Dimensions are fixed by the bearing designation. Sealing, grade and load rating depend on the specific manufacturer's part." },
}));
