import type { BikeModel, CategoryId, Component, ComponentType, Discipline, Experience, PriceEntry, SourceRef, Suspension, Tier, Usage, WheelSize } from "@/lib/types";

/**
 * PACIFIC BIKE (PT Roda Pacific Mandiri) — official-catalogue integration, 2026-11-16.
 *
 * Source policy
 * - Primary source: the product's own page on pacific-bike.com (or exotic.pacific-bike.com).
 * - pacific-bike.com answers every automated request — including robots.txt, its sitemaps and the
 *   WooCommerce Store API — with a Cloudflare block page (HTTP 403). VELOX does not work around that.
 *   The official pages' text was therefore read from the search-engine index of those exact URLs;
 *   every value below is one the indexed official page states unless the row's note names another
 *   source. Records stay "unverified" until a reviewer opens the page in a browser.
 * - Official product photos could not be downloaded or validated for the same reason, so no Pacific
 *   image is shown; the detail page links to the official page instead.
 * - Prices are the official listed price (Pacific notes "Harga berlaku di Pulau Jawa" — valid on Java).
 *   Indexed pages were up to ~600 days old, so prices may have changed.
 * - Pacific does not publish model years. A year is shown only where a dated source gives the launch
 *   or model year; otherwise the record is marked "model year not published".
 */

const R = "2026-11-16";
const PAC = "Pacific Bike official product page";
const src = (url: string, label = PAC, type: SourceRef["type"] = "official-website"): SourceRef => ({ label, url, type, retrievedAt: R });

const price = (idr: number, url: string, note?: string, type: PriceEntry["type"] = "msrp"): PriceEntry => ({
  amount: idr, currency: "IDR", type, source: type === "msrp" ? "Pacific Bike official listed price (Java)" : "Published price", sourceUrl: url, date: R,
  note: note ?? "Official price as listed on pacific-bike.com (valid on Java); read from the indexed official page, which may be out of date — confirm with a Pacific dealer.",
});

interface Def {
  slug: string; name: string; family: string; url: string; brand?: "pacific" | "exotic" | "dahon-syte";
  cat: CategoryId; sub: string; year?: number; yearNote?: string;
  frame?: string | null; groupset?: string | null; drivetrain?: string | null; brakes?: string | null; brakeType?: BikeModel["brakeType"];
  wheelset?: string | null; tires?: string | null; wheelSize?: WheelSize | null; suspension?: Suspension; travel?: string | null; weightKg?: number | null;
  idr?: number | null; priceNote?: string; priceType?: PriceEntry["type"]; priceUrl?: string;
  sizes?: string[]; colors?: string[]; style: string; usage: Usage[]; exp: Experience[];
  spec?: Array<[string, string, string?]>; highlights?: string[]; electric?: BikeModel["electric"];
  extra?: SourceRef[]; notes?: string; geometry?: BikeModel["geometry"]; compat?: BikeModel["compat"];
}

function bike(d: Def): BikeModel {
  const brandId = d.brand ?? "pacific";
  const id = `${brandId}-${d.slug}${d.year ? `-${d.year}` : ""}`;
  return {
    id, slug: id, brandId, family: d.family, name: d.name, variant: null, year: d.year ?? 2026, yearBasis: d.year ? "model-year" : "undated",
    generation: null, category: d.cat, subcategory: d.sub,
    frameMaterial: d.frame ?? null, groupset: d.groupset ?? null, drivetrain: d.drivetrain ?? null, brakes: d.brakes ?? null, brakeType: d.brakeType ?? null,
    wheelset: d.wheelset ?? null, tires: d.tires ?? null, wheelSize: d.wheelSize ?? null, tireClearanceMm: null, suspension: d.suspension ?? "rigid", travel: d.travel ?? null,
    weightKg: d.weightKg ?? null, price: d.idr ? price(d.idr, d.priceUrl ?? d.url, d.priceNote, d.priceType) : null, priceHistory: [],
    sizes: d.sizes ?? [], colors: d.colors, ridingStyle: d.style, usage: d.usage, experience: d.exp,
    electric: d.electric ?? (d.cat === "electric" ? { motor: null, batteryWh: null } : null),
    highlights: d.highlights ?? [], drawbacks: [], geometry: d.geometry ?? null,
    componentSpec: d.spec?.map(([label, value, componentId]) => ({ label, value, componentId: componentId ?? null })),
    compat: d.compat ?? {}, officialUrl: d.url, imageUrl: null,
    provenance: {
      status: "unverified", updatedAt: R, confidence: d.spec?.length ? "medium" : "low",
      sources: [src(d.url), ...(d.extra ?? [])],
      reviewerNotes: [
        "Values from the official Pacific product page as indexed by search (the site blocks automated access); verify on the live page before marking Verified Official.",
        d.year ? (d.yearNote ?? null) : "Pacific does not publish a model year for this product.",
        d.notes ?? null,
      ].filter(Boolean).join(" "),
    },
  };
}

const P = (p: string) => `https://pacific-bike.com/product/${p}/`;
const X = (p: string) => `https://exotic.pacific-bike.com/product/${p}/`;

/* -------------------------------------------------------------------------- */
/* SYTE and part records referenced by the bikes (ids used in componentSpec)  */
/* -------------------------------------------------------------------------- */
const C = {
  chronosRim: "syte-chronos-alloy-rim",
  chronosHub: "syte-chronos-hubs",
  syteCarbonRim50: "syte-carbon-rim-50",
  celestialRim: "syte-celestial-rim",
  syteStem100: "syte-alloy-stem-31-8x100",
  syteBar400: "syte-alloy-handlebar-400",
  syteCarbonBar420: "syte-carbon-handlebar-420",
  syteIntegrated: "syte-carbon-integrated-stem-handlebar",
  crosshair: "syte-crosshair-stem",
  bline: "syte-b-line-handlebar-785",
  syteAirFork: "syte-air-fork-120-boost",
  syteCarbonPost: "syte-carbon-seatpost",
  syteMechDisc: "syte-mechanical-disc-flat-mount",
  primumPost: "pacific-primum-carbon-seatpost",
  magnusPost: "pacific-magnus-carbon-seatpost",
  victor: "prowheel-victor-alloy-crankset",
  czar: "cst-czar-700x25c",
  recourse: "cst-recourse-700x28c",
} as const;

export const PACIFIC_BIKES: BikeModel[] = [
  /* ------------------------------- PRIMUM ------------------------------- */
  bike({
    slug: "primum-3-3", name: "Primum 3.3", family: "Primum", url: P("primum-3-3"), cat: "road", sub: "endurance",
    frame: "Toray carbon 700C", groupset: "Shimano Sora R3000", drivetrain: "2x9", brakes: "Tektro R-313 dual-pivot caliper", brakeType: "rim-caliper",
    wheelset: "SYTE Chronos alloy double-wall rims (39 mm)", tires: "Continental Ultra Sport 700x25C", wheelSize: "700c", colors: ["Black / Red"],
    style: "Carbon endurance road riding", usage: ["fitness", "commuting"], exp: ["beginner", "intermediate"],
    spec: [["Frame", "Toray Carbon Frame 700C"], ["Fork", "Toray Carbon Fork 700C"], ["Groupset", "Shimano Sora R3000, 2×9 speed"], ["Brakes", "Tektro R-313 dual-pivot caliper"],
      ["Rims", "SYTE Chronos alloy double wall, 39 mm height", C.chronosRim], ["Tyres", "Continental Ultra Sport 700×25C"], ["Stem", "SYTE alloy, 100 mm", C.syteStem100]],
    highlights: ["Carbon frame and fork with Shimano Sora 2×9", "Official geometry covers sizes 440–540"],
  }),
  bike({
    slug: "primum-3-5", name: "Primum 3.5", family: "Primum", url: P("primum-3-5"), cat: "road", sub: "endurance",
    frame: "Toray carbon 700C", groupset: "Shimano Sora R3000", drivetrain: "2x9", brakes: "Hydraulic caliper disc, 140 mm rotors", brakeType: "hydraulic-disc",
    wheelset: "SYTE Chronos alloy double-wall rims (30 mm)", tires: "CST Recourse 700x28C", wheelSize: "700c", sizes: ["440", "470", "510"], colors: ["Matte Silver Grey"],
    idr: 12_450_000, style: "Carbon endurance road riding with disc brakes", usage: ["fitness", "commuting"], exp: ["beginner", "intermediate"],
    spec: [["Frame", "Toray Carbon Frame 700C — 440 / 470 / 510"], ["Groupset", "Shimano Sora R3000, 2×9 speed"], ["Brakes", "Hydraulic caliper disc brake, 140 mm rotors"],
      ["Rims", "SYTE Chronos alloy double wall, 30 mm", C.chronosRim], ["Tyres", "CST Recourse 700×28C", C.recourse], ["Stem", "SYTE alloy, 100 mm", C.syteStem100],
      ["Handlebar", "SYTE alloy, 400 mm", C.syteBar400], ["Seatpost", "Primum carbon, 350 mm", C.primumPost]],
    highlights: ["Hydraulic disc brakes at the Sora level", "28 mm tyres"],
  }),
  bike({
    slug: "primum-5-3", name: "Primum 5.3", family: "Primum", url: P("primum-5-3"), cat: "road", sub: "endurance",
    frame: "Toray carbon 700C", groupset: "Shimano 105 R7000", drivetrain: "2x11", brakes: "Tektro R-313 (as listed)", brakeType: "rim-caliper",
    wheelset: "SYTE Chronos alloy double-wall rims (35 mm); hubs 100 mm 20H / 130 mm 24H", tires: "Continental Ultra Sport 700x25C", wheelSize: "700c", colors: ["Black / Yellow"],
    style: "Carbon road riding with Shimano 105", usage: ["fitness", "racing"], exp: ["intermediate"],
    spec: [["Frame", "Toray Carbon Frame 700C — 440 to 540"], ["Groupset", "Shimano 105 R7000, 2×11 speed"], ["Brakes", "Tektro R-313"],
      ["Rims", "SYTE Chronos alloy double wall, 35 mm", C.chronosRim], ["Hubs", "Front 100 mm 20H · Rear 130 mm 24H"], ["Tyres", "Continental Ultra Sport 700×25C"], ["Stem", "SYTE alloy, 100 mm", C.syteStem100]],
    extra: [src("https://bikeinsights.com/bikes/61ef423a6e8dc00022054543-pacific-bike-primum?version=2022&build=53", "Bike Insights — 2022 Primum 5.3", "community")],
  }),
  bike({
    slug: "primum-5-5", name: "Primum 5.5", family: "Primum", url: P("primum-5-5"), cat: "road", sub: "endurance", year: 2022,
    yearNote: "Model year 2022 per the Bike Insights geometry record; Pacific's page itself is undated.",
    frame: "Toray carbon 700C", groupset: "Shimano 105 R7000", drivetrain: "2x11", brakes: "Hydraulic caliper disc, 140 mm rotors", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", sizes: ["440", "470", "510", "540"],
    style: "Carbon disc road riding with Shimano 105", usage: ["fitness", "racing"], exp: ["intermediate"],
    geometry: { stackMm: 529, reachMm: 378, note: "Size 51 — Bike Insights record, consistent with the official size chart" },
    spec: [["Frame", "Toray Carbon Frame 700C — 440 / 470 / 510 / 540"], ["Fork", "Tapered Carbon Fork 700C"], ["Shifters", "Shimano 105 R7000, 2×11 speed"],
      ["Front derailleur", "Shimano 105 FD-R7000"], ["Rear derailleur", "Shimano 105 RD-R7000"], ["Brakes", "Hydraulic caliper disc brake, 140 mm rotors"],
      ["Crankset", "Prowheel Victor alloy, 34/50T", C.victor]],
    extra: [src("https://bikeinsights.com/bike-geometries/653c7a487b07ba0021ff78c8-2022-pacific-bike-primum-55-51", "Bike Insights — 2022 Primum 5.5 geometry", "community")],
    notes: "Cassette (11-32T reported by third parties) is not on the official page and is omitted.",
  }),
  bike({
    slug: "primum-9-0", name: "Primum 9.0", family: "Primum", url: P("primum-9-0-2"), cat: "road", sub: "race",
    frame: "Toray carbon 700C", groupset: "Shimano Ultegra R8000", drivetrain: "2x11", brakes: "Caliper rim brakes", brakeType: "rim-caliper",
    wheelset: "SYTE carbon rims (50 mm)", wheelSize: "700c", sizes: ["440", "470", "510", "540"], idr: 27_300_000,
    style: "Carbon road racing with Ultegra and 50 mm carbon rims", usage: ["racing", "fitness"], exp: ["intermediate", "advanced"],
    spec: [["Frame", "Toray Carbon Frame 700C — 440 / 470 / 510 / 540"], ["Fork", "Tapered Carbon Fork 700C"], ["Groupset", "Shimano Ultegra R8000, 2×11 speed"],
      ["Brakes", "Caliper (rim)"], ["Rims", "SYTE carbon, 50 mm", C.syteCarbonRim50], ["Seatpost", "Primum carbon", C.primumPost], ["Handlebar", "SYTE carbon, 420 mm", C.syteCarbonBar420]],
  }),
  bike({
    slug: "primum-pro", name: "Primum Pro", family: "Primum", url: P("primum-pro"), cat: "road", sub: "race", year: 2020,
    yearNote: "Launched in 2020 (Balapsepeda, Feb 2020; Tribun Jogja, Oct 2020).",
    frame: "Carbon (\"Advance Nano Carbon\" per press)", groupset: "Shimano Ultegra", drivetrain: "2x11", brakes: "Shimano Ultegra R8020 hydraulic disc", brakeType: "hydraulic-disc",
    wheelSize: "700c", sizes: ["470", "510"], idr: 28_800_000, priceType: "historical", priceUrl: "https://jogja.tribunnews.com/2020/10/24/harga-sepeda-dan-spesifikasi-road-bike-primum-pro-dari-pacific-bike-dibanderol-rp-28-juta",
    priceNote: "Official launch price reported by Tribun Jogja (Oct 2020). Later listings show Rp 33.5 jt; not confirmed on the official page.",
    style: "Carbon disc road racing with Ultegra", usage: ["racing"], exp: ["advanced"],
    spec: [["Groupset", "Shimano Ultegra, 2×11 speed"], ["Brakes", "Shimano Ultegra R8020 hydraulic disc"], ["Cassette", "Shimano Ultegra CS-R8000 11-30T"]],
    extra: [src("https://www.balapsepeda.com/2020/02/primum-pro-road-bike-terbaru-dari.html?m=1", "Balapsepeda — Primum Pro launch (Feb 2020)", "publication"),
      src("https://jogja.tribunnews.com/2020/10/24/harga-sepeda-dan-spesifikasi-road-bike-primum-pro-dari-pacific-bike-dibanderol-rp-28-juta", "Tribun Jogja — Primum Pro price and specs", "publication")],
    notes: "Groupset, brakes, cassette and sizes come from the launch coverage; the official page text was not available in the index.",
  }),
  bike({
    slug: "primum-pro-se", name: "Primum Pro SE", family: "Primum", url: P("primum-pro-se-2"), cat: "road", sub: "race", year: 2023,
    yearNote: "Model year 2023 per Bike Insights; Pacific's page is undated.",
    frame: "Toray carbon 700C", groupset: "Shimano Ultegra R8020", drivetrain: "2x11", brakes: "Shimano Ultegra R8020 hydraulic disc, 140 mm rotors", brakeType: "hydraulic-disc",
    wheelset: "SYTE carbon rims (50 mm)", tires: "Maxxis Detonator 700x28C", wheelSize: "700c", sizes: ["470 (S)", "510 (M)", "540 (L)"], colors: ["Glossy Navy Orange", "Black"],
    idr: 35_750_000, priceUrl: "https://pacific-bike.com/review-primum-pro-se-muncul-dengan-warna-baru/", priceNote: "Price stated in Pacific's own Primum Pro SE review article.",
    style: "Carbon disc road racing with Ultegra", usage: ["racing"], exp: ["advanced"],
    spec: [["Frame", "Toray Carbon Frame 700C — 470 (S) / 510 (M) / 540 (L)"], ["Fork", "Tapered Carbon Fork 700C"], ["Shifters", "Shimano Ultegra R8020, 2×11 speed"],
      ["Brakes", "Shimano Ultegra R8020 hydraulic disc, 140 mm rotors"], ["Rims", "SYTE carbon, 50 mm", C.syteCarbonRim50], ["Tyres", "Maxxis Detonator 700×28C"],
      ["Seatpost", "Primum carbon", C.primumPost], ["Handlebar", "SYTE carbon, 420 mm", C.syteCarbonBar420]],
    extra: [src("https://pacific-bike.com/review-primum-pro-se-muncul-dengan-warna-baru/", "Pacific Bike — Primum Pro SE review", "manufacturer-announcement")],
  }),
  /* ------------------------------- MAGNUS ------------------------------- */
  bike({
    slug: "magnus-5-0", name: "Magnus 5.0", family: "Magnus", url: P("magnus-5-0"), cat: "road", sub: "all-rounder", year: 2022,
    yearNote: "Launched January 2022 (Balapsepeda, which cites pacific-bike.com).",
    frame: "Carbon, thru-axle disc", groupset: "Shimano 105 R7000", drivetrain: "2x11", brakes: "Disc", brakeType: null,
    wheelset: "SYTE Chronos alloy rims on SYTE Chronos hubs", tires: "CST Czar 700x25C", wheelSize: "700c", idr: 18_000_000, colors: ["Twilight Chameleon", "Amethyst Chameleon"],
    style: "Carbon disc all-round road riding", usage: ["fitness", "racing"], exp: ["intermediate"],
    spec: [["Frame", "Carbon thru-axle disc frame — four sizes, 460 to 550"], ["Fork", "Carbon fork"], ["Shifters", "Shimano 105 R7000, 2×11 speed"],
      ["Crankset", "Prowheel Victor, 36/52T", C.victor], ["Hubs", "SYTE Chronos", C.chronosHub], ["Rims", "SYTE Chronos alloy", C.chronosRim],
      ["Tyres", "CST Czar 700×25C", C.czar], ["Seatpost", "Magnus carbon", C.magnusPost]],
    extra: [src("https://www.balapsepeda.com/2022/01/pacific-luncurkan-road-bike-karbon.html?m=1", "Balapsepeda — Pacific launches Magnus 5.0 (Jan 2022)", "publication")],
    notes: "Brake caliper model is not stated in the indexed official text. Marketplace prices range widely (Rp 8–17 jt) and are not used.",
  }),
  /* ---------------------------- WHIZZ / SPECTRE / VARILUX / OTHER ROAD ---------------------------- */
  bike({
    slug: "whizz", name: "Whizz", family: "Whizz", url: P("whizz"), cat: "road", sub: "aero", frame: "Carbon, thru-axle disc, aero (UCI approved)", groupset: "Shimano 105", drivetrain: "2x11",
    brakes: "Hydraulic disc", brakeType: "hydraulic-disc", tires: "Continental Ultra Sport 700x25C", wheelSize: "700c", sizes: ["XS", "S"],
    style: "Aero road and track-oriented riding", usage: ["racing"], exp: ["intermediate", "advanced"],
    spec: [["Frame", "Carbon thru-axle disc, aerodynamic, UCI approved"], ["Groupset", "Shimano 105, 2×11 speed"], ["Brakes", "Hydraulic disc"], ["Tyres", "Continental Ultra Sport 700×25C"]],
  }),
  bike({
    slug: "whizz-7-0", name: "Whizz 7.0", family: "Whizz", url: P("whizz-7-0"), cat: "road", sub: "aero", frame: "Carbon, thru-axle disc flat-mount 700C (UCI approved)", groupset: "Shimano 105 (mix)", drivetrain: "2x11",
    brakes: "Disc", wheelset: "SYTE Chronos rims", wheelSize: "700c", idr: 22_330_000,
    style: "Aero carbon road riding with an integrated cockpit", usage: ["racing", "fitness"], exp: ["intermediate", "advanced"],
    spec: [["Frame", "Carbon Thruaxle Disc Flatmount Frame 700C (UCI Approved)"], ["Groupset", "Shimano 105 (mix), 2×11 speed"], ["Rims", "SYTE Chronos", C.chronosRim],
      ["Cockpit", "SYTE carbon integrated stem 90 mm / handlebar 420 mm", C.syteIntegrated]],
  }),
  bike({
    slug: "spectre-3-0", name: "Spectre 3.0", family: "Spectre", url: P("spectre-3-0"), cat: "road", sub: "endurance", frame: "Carbon, thru-axle", groupset: "Shimano Sora", drivetrain: "2x9",
    brakes: "SYTE mechanical disc, flat mount", brakeType: "mechanical-disc", tires: "Innova Cross 700x25C", wheelSize: "700c", idr: 12_500_000,
    style: "Carbon disc road riding", usage: ["fitness", "commuting"], exp: ["beginner", "intermediate"],
    spec: [["Frame / fork", "Carbon, thru-axle"], ["Groupset", "Shimano Sora, 2×9 speed"], ["Brakes", "SYTE mechanical disc brake, flat mount", C.syteMechDisc], ["Tyres", "Innova Cross 700×25C"]],
  }),
  bike({ slug: "spectre-4-0", name: "Spectre 4.0", family: "Spectre", url: P("spectre-4-0"), cat: "road", sub: "endurance", frame: "Carbon, thru-axle disc", groupset: "SRAM Rival", drivetrain: "2x11", brakes: "Disc", wheelSize: "700c", idr: 16_800_000,
    style: "Carbon disc road riding", usage: ["fitness"], exp: ["intermediate"], spec: [["Frame", "Carbon thru-axle disc"], ["Groupset", "SRAM Rival, 2×11 speed"]] }),
  bike({ slug: "spectre-5-0", name: "Spectre 5.0", family: "Spectre", url: P("spectre-5-0"), cat: "road", sub: "endurance", frame: "Carbon, thru-axle disc", groupset: "SRAM Rival", drivetrain: "2x11", brakes: "Disc", wheelSize: "700c", idr: 15_500_000,
    style: "Carbon disc road riding", usage: ["fitness"], exp: ["intermediate"], spec: [["Frame", "Carbon thru-axle disc"], ["Groupset", "SRAM Rival, 2×11 speed"]] }),
  bike({ slug: "spectre-6-0", name: "Spectre 6.0", family: "Spectre", url: P("spectre-6-0"), cat: "road", sub: "endurance", frame: "Carbon, thru-axle", groupset: "SRAM Rival", drivetrain: "2x11",
    brakes: "Retrospec mechanical disc, flat mount", brakeType: "mechanical-disc", tires: "Innova Pro 700x25C", wheelSize: "700c", sizes: ["XS", "S", "M", "L"], idr: 17_350_000,
    style: "Carbon disc road riding", usage: ["fitness"], exp: ["intermediate"],
    spec: [["Frame / fork", "Carbon, thru-axle"], ["Groupset", "SRAM Rival, 2×11 speed"], ["Brakes", "Retrospec mechanical disc brake, flat mount"], ["Tyres", "Innova Pro 700×25C"]] }),
  bike({
    slug: "varilux-5-0", name: "Varilux 5.0", family: "Varilux", url: P("varilux-5-0-2"), cat: "road", sub: "endurance", frame: "Toray carbon 700C", groupset: "Shimano 105 R7000", drivetrain: "11-speed",
    wheelset: "SYTE Chronos alloy rims (40 mm)", tires: "Continental Ultra Sport 2 700x25C", wheelSize: "700c", sizes: ["480", "510", "540"], idr: 14_900_000,
    style: "Carbon road riding with Shimano 105", usage: ["fitness"], exp: ["intermediate"],
    spec: [["Frame / fork", "Toray carbon 700C"], ["Groupset", "Shimano 105 R7000, 11 speed"], ["Rims", "SYTE Chronos alloy, 40 mm", C.chronosRim], ["Tyres", "Continental Ultra Sport 2 700×25C"],
      ["Seatpost", "SYTE carbon", C.syteCarbonPost], ["Stem", "SYTE alloy, 31.8 × 100 mm", C.syteStem100]],
  }),
  bike({ slug: "magenta", name: "Magenta", family: "Magenta", url: P("magenta-2"), cat: "road", sub: "aero", groupset: "Shimano 105", wheelSize: "700c",
    style: "Aero road and track riding", usage: ["racing"], exp: ["intermediate"], notes: "Official page describes an aerodynamic frame for road and track with Shimano 105; other specs not in the index." }),
  bike({ slug: "rochester-pro", name: "Rochester Pro", family: "Rochester", url: P("rochester-pro"), cat: "road", sub: "endurance", drivetrain: "9-speed", wheelSize: "700c",
    style: "Urban riding and light off-road", usage: ["commuting", "fitness"], exp: ["beginner"], notes: "Official page: 9 speeds, 700C, urban and light off-road use." }),

  /* --------------------------------- MTB -------------------------------- */
  ...([["stinger-7-0", "Stinger 7.0", "Shimano Deore M6000", "1x10", "Shimano MT200 hydraulic disc", 11_150_000, [["Cassette", "11-42T"]]],
       ["stinger-8-0", "Stinger 8.0", "SRAM NX", "1x11", "Tektro M-275 hydraulic disc", null, []],
       ["stinger-9-0", "Stinger 9.0", "SRAM SX Eagle", "1x12", "Shimano MT200 hydraulic disc", 14_700_000, [["Cassette", "SRAM PG-1210 11-50T"], ["Crankset", "SRAM SX Eagle, 34T, DUB"]]]] as const).map(([slug, name, gs, dt, br, idr, more]) =>
    bike({
      slug, name, family: "Stinger", url: P(slug), cat: "mtb", sub: "hardtail", frame: "Carbon 27.5+ Boost 148", groupset: gs, drivetrain: dt, brakes: br, brakeType: "hydraulic-disc",
      wheelSize: "27.5", suspension: "front", travel: "120 mm (SYTE air fork)", idr,
      style: "Carbon 27.5+ hardtail trail riding", usage: ["trail"], exp: ["intermediate"],
      spec: [["Frame", "Carbon 27.5+ Boost 148 mm"], ["Fork", "SYTE air suspension, 120 mm, Boost 15×110 mm, remote lockout", C.syteAirFork], ["Groupset", gs], ["Brakes", br], ...(more as unknown as Array<[string, string]>)],
      notes: slug === "stinger-8-0" ? "Price not shown in the indexed official page (Kompas 2022 listed Rp 11.9 jt)." : slug === "stinger-9-0" ? "The official page's description text names 'STINGER 7.0' — a typo on Pacific's site." : undefined,
    })),
  bike({
    slug: "skeleton-3-0", name: "Skeleton 3.0", family: "Skeleton", url: P("skeleton-3-0"), cat: "mtb", sub: "all-mountain", frame: "Carbon all-mountain full suspension 27.5″ TA Boost",
    groupset: "SRAM NX Eagle", drivetrain: "1x12", brakes: "SRAM Level T hydraulic disc", brakeType: "hydraulic-disc", wheelset: "SYTE Celestial rims", wheelSize: "27.5",
    suspension: "full", travel: "160 mm front (RockShox Yari Boost) · RockShox Monarch Plus RC3 shock", sizes: ['18"'], idr: 34_300_000,
    style: "Carbon all-mountain trail riding", usage: ["trail", "downhill"], exp: ["advanced"],
    spec: [["Frame", "Carbon MTB All Mountain Full Suspension 27.5″ TA Boost"], ["Fork", "RockShox Yari Boost, 160 mm"], ["Shock", "RockShox Monarch Plus RC3"],
      ["Groupset", "SRAM NX Eagle, 1×12 speed"], ["Brakes", "SRAM Level T hydraulic"], ["Rims", "SYTE Celestial", C.celestialRim], ["Stem", "SYTE Crosshair", C.crosshair],
      ["Handlebar", "SYTE B'Line, 785 mm, 35 mm clamp", C.bline]],
  }),
  bike({ slug: "invert-460", name: "Invert 460", family: "Invert", url: P("invert-460"), cat: "mtb", sub: "cross-country", frame: "Alloy 6061 XC 27.5″", groupset: "Blackbox", drivetrain: "2x9",
    brakes: "Tektro M-275 hydraulic disc", brakeType: "hydraulic-disc", tires: "Kenda 27.5 x 2.20", wheelSize: "27.5", suspension: "front", travel: "120 mm, lockout", idr: 3_345_000,
    style: "Entry cross-country riding", usage: ["trail", "fitness"], exp: ["beginner"],
    spec: [["Frame", "Alloy 6061 MTB XC 27.5″"], ["Fork", "Suspension 120 mm with lockout"], ["Shifters", "Blackbox 2×9 speed"], ["Brakes", "Tektro M-275 hydraulic"], ["Tyres", "Kenda 27.5″ × 2.20″"]] }),
  bike({ slug: "invert-410", name: "Invert 410", family: "Invert", url: P("invert-410"), cat: "mtb", sub: "cross-country", frame: "Alloy 6061 XC 27.5″", drivetrain: "2x9",
    brakes: "Pacific mechanical disc", brakeType: "mechanical-disc", tires: "Kenda 27.5 x 2.20", wheelSize: "27.5", suspension: "front", travel: "120 mm, lockout", idr: 3_005_000,
    style: "Entry cross-country riding", usage: ["trail", "fitness"], exp: ["beginner"],
    spec: [["Frame", "Alloy 6061 MTB XC 27.5″"], ["Fork", "Suspension 120 mm with lockout"], ["Drivetrain", "2×9 speed"], ["Brakes", "Pacific mechanical disc"], ["Tyres", "Kenda 27.5″ × 2.20″"]] }),
  bike({ slug: "invert-2-0-27-5", name: "Invert 2.0 (27.5″)", family: "Invert", url: P("invert-2-0-2-75"), cat: "mtb", sub: "cross-country", frame: "Alloy 6061 XC 27.5″", brakes: "Mechanical disc", brakeType: "mechanical-disc",
    wheelSize: "27.5", suspension: "front", travel: "120 mm, lockout", style: "Entry cross-country riding", usage: ["trail", "fitness"], exp: ["beginner"] }),
  bike({ slug: "invert-3-0-26", name: "Invert 3.0 (26″)", family: "Invert", url: P("invert-3-0-26-2"), cat: "mtb", sub: "hardtail", wheelSize: "26", suspension: "front", style: "Entry mountain biking", usage: ["trail", "leisure"], exp: ["beginner"] }),
  bike({ slug: "invert-1-0-26", name: "Invert 1.0 (26″)", family: "Invert", url: P("invert-1-0-26-2025"), cat: "mtb", sub: "hardtail", wheelSize: "26", suspension: "front", style: "Entry mountain biking", usage: ["trail", "leisure"], exp: ["beginner"],
    notes: "The official URL carries '2025', but the page does not state a model year." }),
  bike({ slug: "invert-scout", name: "Invert Scout", family: "Invert", url: P("invert-scout"), cat: "mtb", sub: "cross-country", style: "Entry mountain biking", usage: ["trail"], exp: ["beginner"] }),
  bike({ slug: "avenger-e700", name: "Avenger E700", family: "Avenger", url: P("avenger-e700"), cat: "electric", sub: "e-mtb", frame: "Carbon", idr: 39_500_000,
    style: "Carbon electric mountain biking", usage: ["trail"], exp: ["intermediate", "advanced"], notes: "Official page: e-MTB with a lightweight carbon frame. Motor and battery not in the index." }),
  bike({ slug: "avenger-e600", name: "Avenger E600", family: "Avenger", url: P("avenger-e600"), cat: "electric", sub: "e-mtb", style: "Electric mountain biking", usage: ["trail"], exp: ["intermediate"] }),

  /* ------------------------------ FOLDING ------------------------------- */
  bike({ slug: "noris-2-3", name: "Noris 2.3 (20″ Plus)", family: "Noris", url: P("noris-2-3-20"), cat: "folding", sub: "urban-folding", wheelSize: "20", idr: 3_200_000, style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"] }),
  bike({ slug: "noris-whizz", name: "Noris Whizz", family: "Noris", url: P("noris-whizz"), cat: "folding", sub: "performance-folding", frame: "Alloy 6061 20″ folding", groupset: "Blackbox", drivetrain: "2x10",
    brakes: "Pacific BX-351 mechanical disc", brakeType: "mechanical-disc", wheelSize: "20", idr: 3_800_000, style: "Fast folding riding", usage: ["commuting", "fitness"], exp: ["beginner", "intermediate"],
    spec: [["Frame", "Alloy 6061 folding 20″"], ["Drivetrain", "Blackbox 2×10"], ["Brakes", "Pacific BX-351 mechanical disc"]] }),
  bike({ slug: "noris-rs", name: "Noris RS", family: "Noris", url: P("noris-rs"), cat: "folding", sub: "urban-folding", groupset: "Shimano Tourney", drivetrain: "8-speed", wheelSize: "20", idr: 3_500_000, colors: ["Yellow", "Black", "Grey"],
    style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"], spec: [["Rear derailleur", "Shimano Tourney, 8 speed"]] }),
  bike({ slug: "noris-2-2-sr", name: "Noris 2.2 SR", family: "Noris", url: P("noris-2-2-sr-20"), cat: "folding", sub: "urban-folding", brakes: "Tektro hydraulic disc", brakeType: "hydraulic-disc", wheelSize: "20", idr: 3_460_000,
    style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"] }),
  bike({ slug: "noris-pro-x", name: "Noris Pro X", family: "Noris", url: P("noris-pro-x"), cat: "folding", sub: "urban-folding", groupset: "Shimano Tourney", drivetrain: "8-speed", wheelSize: "20", idr: 4_350_000, style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"] }),
  bike({ slug: "noris-arm", name: "Noris ARM", family: "Noris", url: P("noris-arm"), cat: "folding", sub: "performance-folding", frame: "Lightweight alloy", drivetrain: "9-speed", wheelSize: "20", idr: 5_635_000, style: "Lightweight folding riding", usage: ["commuting", "fitness"], exp: ["beginner", "intermediate"] }),
  bike({ slug: "noris-cx", name: "Noris CX", family: "Noris", url: P("noris-cx"), cat: "folding", sub: "urban-folding", drivetrain: "8-speed freewheel", tires: "Kenda 20 x 1.50", wheelSize: "20",
    style: "Retro folding commuter with rack and front block", usage: ["commuting", "leisure"], exp: ["beginner"] }),
  bike({ slug: "noris-neo-x7", name: "Noris Neo X7", family: "Noris", url: P("noris-neo-x7-20"), cat: "folding", sub: "urban-folding", wheelSize: "20", style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"] }),
  bike({ slug: "veloce-6-0", name: "Veloce 6.0 (20″)", family: "Veloce", url: P("veloce-6-0-20"), cat: "folding", sub: "urban-folding", wheelSize: "20", idr: 2_125_000, style: "Folding commuter with rear rack and front block", usage: ["commuting", "leisure"], exp: ["beginner"] }),
  bike({ slug: "brooklyn-20", name: "Brooklyn (20″)", family: "Brooklyn", brand: "dahon-syte", url: P("dahon-syte-brooklyn-20"), cat: "folding", sub: "urban-folding", frame: "Alloy 6061 folding 20″",
    groupset: "Shimano Tourney", drivetrain: "8-speed", wheelSize: "20", idr: 4_950_000, priceNote: "Official price, valid on Java, Bali and Sumatra; read from the indexed official page.",
    style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"], spec: [["Frame", "Alloy 6061 Folding Frame 20″"], ["Shifter", "Shimano M315, 8 speed"], ["Rear derailleur", "Shimano Tourney RD-TX800, 8 speed"]] }),
  bike({ slug: "brooklyn-3-0-20", name: "Brooklyn 3.0 (20″)", family: "Brooklyn", brand: "dahon-syte", url: "https://pacific-bike.com/homepage/products/product-urban/dahon-syte/dahon-syte-brooklyn-3-0-20/",
    cat: "folding", sub: "urban-folding", wheelSize: "20", idr: 3_445_000, style: "Folding urban commuting", usage: ["commuting"], exp: ["beginner"] }),
  bike({ slug: "houston-16-plus", name: "Houston (16″ Plus)", family: "Houston", brand: "dahon-syte", url: "https://pacific-bike.com/product-category/brand/dahon-syte-brand/", cat: "folding", sub: "compact-folding",
    wheelSize: "16", idr: 6_650_000, style: "Compact folding riding", usage: ["commuting"], exp: ["beginner"], notes: "Listed on the official DAHON SYTE brand catalogue page; product page URL not indexed." }),
  bike({ slug: "vito-lite-16", name: "Vito Lite (16″)", family: "Vito", brand: "dahon-syte", url: P("vito-lite-16"), cat: "folding", sub: "compact-folding", wheelSize: "16",
    style: "Compact folding riding", usage: ["commuting"], exp: ["beginner"], notes: "Official page lists SYTE cranks and hubs." }),

  /* --------------------------- URBAN / KIDS / BMX ----------------------- */
  bike({ slug: "ravella-ultra", name: "Ravella Ultra (26″)", family: "Ravella", url: P("ravella-ultra"), cat: "urban", sub: "city", drivetrain: "7-speed", brakes: "V-brake", brakeType: "v-brake", wheelSize: "26", idr: 2_600_000,
    style: "City riding", usage: ["commuting", "leisure"], exp: ["beginner"] }),
  bike({ slug: "x-cross-2-0", name: "X-Cross 2.0 (20″)", family: "X-Cross", url: P("x-cross-2-0-20%E2%80%B3"), cat: "other", sub: "kids", drivetrain: "7-speed", wheelSize: "20", suspension: "full", idr: 2_200_000,
    style: "Kids' full-suspension mountain bike", usage: ["leisure", "trail"], exp: ["beginner"] }),
  bike({ slug: "ventura-xm-3-0-12", name: "Ventura XM 3.0 (12″)", family: "Ventura", url: P("ventura-xm-3-0-12"), cat: "other", sub: "kids", wheelSize: "12", idr: 1_050_000, style: "Kids' BMX-style bike", usage: ["leisure"], exp: ["beginner"] }),
  bike({ slug: "ventura-xm-3-0-16", name: "Ventura XM 3.0 (16″)", family: "Ventura", url: P("ventura-xm-3-0-16"), cat: "other", sub: "kids", wheelSize: "16", idr: 1_100_000, style: "Kids' BMX-style bike", usage: ["leisure"], exp: ["beginner"] }),
  bike({ slug: "x-men", name: "X-Men (20″)", family: "X-Men", url: P("x-men-2"), cat: "bmx", sub: "racing", frame: "Alloy 20″", wheelSize: "20", idr: 2_315_000, priceUrl: "https://pacific-bike.com/product-category/sepeda/bmx/?product_orderby=popularity&product_count=36",
    style: "BMX race", usage: ["racing", "tricks"], exp: ["beginner", "intermediate"] }),
  bike({ slug: "zeckrom-3-0", name: "Zeckrom 3.0", family: "Zeckrom", url: P("zeckrom-3-0"), cat: "bmx", sub: "freestyle", idr: 1_930_000, priceUrl: "https://pacific-bike.com/product-category/sepeda/bmx/?product_orderby=popularity&product_count=36",
    style: "BMX", usage: ["tricks", "leisure"], exp: ["beginner"] }),
  bike({ slug: "avorio-1-0", name: "Avorio 1.0", family: "Avorio", url: P("avorio-1-0"), cat: "bmx", sub: "freestyle", idr: 1_635_000, priceUrl: "https://pacific-bike.com/product-category/sepeda/bmx/?product_orderby=popularity&product_count=36",
    style: "BMX", usage: ["tricks", "leisure"], exp: ["beginner"] }),
  bike({ slug: "hotshot-b2w", name: "Hotshot B2W", family: "Hotshot", url: P("hotshot-b2w"), cat: "bmx", sub: "freestyle", idr: 1_750_000, priceUrl: "https://pacific-bike.com/product-category/sepeda/bmx/?product_orderby=popularity&product_count=36",
    style: "BMX", usage: ["tricks", "leisure"], exp: ["beginner"] }),

  /* ----------------------- EXOTIC (exotic.pacific-bike.com) -------------- */
  bike({ slug: "et-9986-12", name: "ET-9986 (12″)", family: "ET-9986", brand: "exotic", url: X("et-9986-12"), cat: "other", sub: "kids", wheelSize: "12", idr: 1_170_000,
    style: "Kids' classic city bike with rack and basket", usage: ["leisure"], exp: ["beginner"] }),
  bike({ slug: "9987-sk-minion-12", name: "9987 SK Minion (12″)", family: "9987 SK", brand: "exotic", url: X("9987-sk-minion-12"), cat: "other", sub: "kids", wheelSize: "12", idr: 1_050_000, style: "Kids' BMX-style bike", usage: ["leisure"], exp: ["beginner"] }),
  bike({ slug: "9987-sk-minion-16", name: "9987 SK Minion (16″)", family: "9987 SK", brand: "exotic", url: X("9987-sk-minion-16-2"), cat: "other", sub: "kids", wheelSize: "16", idr: 1_080_000, style: "Kids' BMX-style bike", usage: ["leisure"], exp: ["beginner"] }),
  ...([["varilux-pro", "Varilux Pro", "48 V / 650 W", "48 V 20 Ah", "about 60 km", 74], ["varilux-sr", "Varilux SR", "48 V / 650 W", "48 V 20 Ah", "about 50 km", 71], ["varilux-lx", "Varilux LX", "48 V / 500 W", "48 V 12 Ah", "about 40 km", 60]] as const)
    .map(([slug, name, motor, batt, range, kg]) => bike({
      slug, name, family: "Varilux (Exotic)", brand: "exotic", url: X(slug), cat: "electric", sub: "e-urban", weightKg: kg,
      electric: { motor, batteryWh: null }, style: "Electric city transport", usage: ["commuting"], exp: ["beginner"],
      spec: [["Motor", motor], ["Battery", batt], ["Range (manufacturer)", range], ["Weight", `${kg} kg`]],
      notes: "Exotic electric model (not the Pacific Varilux road bike).",
    })),
];

/* -------------------------------------------------------------------------- */
/* Components, SYTE parts and accessories                                     */
/* -------------------------------------------------------------------------- */
interface CDef { id: string; mfr: string; name: string; type: ComponentType; url: string; disc?: Discipline[]; tier?: Tier; specs?: Record<string, string | null>; material?: string | null; idr?: number | null; note?: string; extra?: SourceRef[]; on?: string[] }

function comp(d: CDef): Component {
  return {
    id: d.id, manufacturer: d.mfr, manufacturerSlug: d.mfr.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: d.name, type: d.type,
    discipline: d.disc ?? ["universal"], tier: d.tier ?? "entry", series: null, weightG: null, material: d.material ?? null,
    price: d.idr ? price(d.idr, d.url) : null, specs: d.specs ?? {}, compat: {}, benefits: [], officialUrl: d.url, imageUrl: null, productId: null,
    provenance: {
      status: "unverified", updatedAt: R, confidence: "low", sources: [src(d.url, d.on ? "Pacific Bike official page specifying this part" : PAC), ...(d.extra ?? [])],
      reviewerNotes: [d.on ? `Documented as the part specified on: ${d.on.join(", ")}. No standalone retail page for this part was found; specifications beyond that listing are Not Available.` : "Product listed in Pacific Bike's official catalogue (read via the search index — the site blocks automated access).", d.note ?? null].filter(Boolean).join(" "),
    },
  };
}

export const PACIFIC_COMPONENTS: Component[] = [
  /* SYTE parts specified on Pacific bikes */
  comp({ id: C.chronosRim, mfr: "SYTE", name: "Chronos Alloy Double-Wall Rim", type: "rim", disc: ["road"], url: P("primum-3-5"), material: "Aluminium",
    specs: { Construction: "Double wall", "Heights specified": "30 mm (Primum 3.5) · 35 mm (Primum 5.3) · 39 mm (Primum 3.3) · 40 mm (Varilux 5.0)" },
    on: ["Primum 3.3", "Primum 3.5", "Primum 5.3", "Varilux 5.0", "Whizz 7.0", "Magnus 5.0"], extra: [src(P("primum-3-3")), src(P("primum-5-3")), src(P("varilux-5-0-2")), src(P("magnus-5-0"))] }),
  comp({ id: C.chronosHub, mfr: "SYTE", name: "Chronos Hubs", type: "hub", disc: ["road"], url: P("magnus-5-0"),
    specs: { "Bearing designation": null, "Axle standard": null }, on: ["Magnus 5.0"],
    note: "Pacific does not publish the hub's bearing designation or axle standard, so no replacement bearing is linked; identify the bearing by its marking or measurements with the Bearing ID tool." }),
  comp({ id: C.syteCarbonRim50, mfr: "SYTE", name: "Carbon Rim 50 mm", type: "rim", disc: ["road"], tier: "mid", url: P("primum-9-0-2"), material: "Carbon", specs: { Height: "50 mm" }, on: ["Primum 9.0", "Primum Pro SE"], extra: [src(P("primum-pro-se-2"))] }),
  comp({ id: C.celestialRim, mfr: "SYTE", name: "Celestial Rim", type: "rim", disc: ["mtb"], url: P("skeleton-3-0"), on: ["Skeleton 3.0"] }),
  comp({ id: C.syteStem100, mfr: "SYTE", name: "Alloy Stem 31.8 × 100 mm", type: "stem", disc: ["road"], url: P("varilux-5-0-2"), material: "Aluminium", specs: { Clamp: "31.8 mm", Length: "100 mm" },
    on: ["Primum 3.3", "Primum 3.5", "Primum 5.3", "Varilux 5.0"] }),
  comp({ id: C.syteBar400, mfr: "SYTE", name: "Alloy Handlebar 400 mm", type: "handlebar", disc: ["road"], url: P("primum-3-5"), material: "Aluminium", specs: { Width: "400 mm" }, on: ["Primum 3.5"] }),
  comp({ id: C.syteCarbonBar420, mfr: "SYTE", name: "Carbon Handlebar 420 mm", type: "handlebar", disc: ["road"], tier: "mid", url: P("primum-9-0-2"), material: "Carbon", specs: { Width: "420 mm" }, on: ["Primum 9.0", "Primum Pro SE"] }),
  comp({ id: C.syteIntegrated, mfr: "SYTE", name: "Carbon Integrated Stem 90 mm / Handlebar 420 mm", type: "handlebar", disc: ["road"], tier: "mid", url: P("whizz-7-0"), material: "Carbon", specs: { "Stem length": "90 mm", Width: "420 mm" }, on: ["Whizz 7.0"] }),
  comp({ id: C.crosshair, mfr: "SYTE", name: "Crosshair Stem", type: "stem", disc: ["mtb"], url: P("skeleton-3-0"), on: ["Skeleton 3.0"] }),
  comp({ id: C.bline, mfr: "SYTE", name: "B'Line Handlebar 785 mm", type: "handlebar", disc: ["mtb"], url: P("skeleton-3-0"), specs: { Width: "785 mm", Clamp: "35 mm" }, on: ["Skeleton 3.0"] }),
  comp({ id: C.syteAirFork, mfr: "SYTE", name: "Air Suspension Fork 120 mm Boost", type: "fork", disc: ["mtb"], url: P("stinger-8-0"), specs: { Travel: "120 mm", Axle: "Boost 15 × 110 mm", Lockout: "Remote" }, on: ["Stinger 7.0", "Stinger 8.0", "Stinger 9.0"] }),
  comp({ id: C.syteCarbonPost, mfr: "SYTE", name: "Carbon Seatpost", type: "seatpost", disc: ["road"], url: P("varilux-5-0-2"), material: "Carbon", on: ["Varilux 5.0"] }),
  comp({ id: C.syteMechDisc, mfr: "SYTE", name: "Mechanical Disc Brake (Flat Mount)", type: "brakes", disc: ["road"], url: P("spectre-3-0"), specs: { Mount: "Flat mount", Actuation: "Mechanical" }, on: ["Spectre 3.0"] }),
  comp({ id: C.primumPost, mfr: "Pacific", name: "Primum Carbon Seatpost", type: "seatpost", disc: ["road"], url: P("primum-3-5"), material: "Carbon", specs: { Length: "350 mm (Primum 3.5)" }, on: ["Primum 3.5", "Primum 9.0", "Primum Pro SE"] }),
  comp({ id: C.magnusPost, mfr: "Pacific", name: "Magnus Carbon Seatpost", type: "seatpost", disc: ["road"], url: P("magnus-5-0"), material: "Carbon", on: ["Magnus 5.0"] }),
  comp({ id: C.victor, mfr: "Prowheel", name: "Victor Alloy Crankset", type: "crankset", disc: ["road"], url: P("primum-5-5"), material: "Aluminium", specs: { "Chainrings specified": "34/50T (Primum 5.5) · 36/52T (Magnus 5.0)" }, on: ["Primum 5.5", "Magnus 5.0"] }),
  comp({ id: C.czar, mfr: "CST", name: "Czar 700×25C", type: "tires", disc: ["road"], url: P("magnus-5-0"), specs: { Size: "700 x 25C" }, on: ["Magnus 5.0"] }),
  comp({ id: C.recourse, mfr: "CST", name: "Recourse 700×28C", type: "tires", disc: ["road"], url: P("primum-3-5"), specs: { Size: "700 x 28C" }, on: ["Primum 3.5"] }),

  /* SYTE accessories (official product pages; filed under SYTE categories in Pacific's catalogue) */
  comp({ id: "syte-helmet-in-mold-glasses-st-f170", mfr: "SYTE", name: "Helmet In-Mold with Glasses ST-F170", type: "accessory", url: P("helmet-in-mold-w-glasses-st-f170"), specs: { Type: "In-mold helmet with glasses", Code: "ST-F170" } }),
  comp({ id: "syte-helmet-in-mold-glasses-st-f171", mfr: "SYTE", name: "Helmet In-Mold with Glasses ST-F171", type: "accessory", url: P("helmet-in-mold-w-glasses-st-f171"), specs: { Type: "In-mold helmet with glasses", Code: "ST-F171" } }),
  comp({ id: "syte-front-light-400lm-st-j630", mfr: "SYTE", name: "Front Light 400 lm ST-J630", type: "accessory", url: P("front-light-pc-mix-400-lm-st-j630"), specs: { Type: "Front light", Output: "400 lm", Body: "PC", Code: "ST-J630" }, note: "Filed in the 'light syte' category." }),
  comp({ id: "syte-front-light-350lm-st-j631", mfr: "SYTE", name: "Front Light 350 lm ST-J631", type: "accessory", url: P("front-light-pcabs-bk-350-lm-st-j631"), specs: { Type: "Front light", Output: "350 lm", Body: "PC + ABS", Colour: "Black", Code: "ST-J631" }, note: "Filed in the 'light syte' category." }),
  comp({ id: "syte-handlebar-bag-600d-st-f493", mfr: "SYTE", name: "Handlebar Bag 600D Nylon ST-F493", type: "accessory", url: P("handle-bar-bag-600d-nylon-bk-st-f493"), specs: { Type: "Handlebar bag", Material: "600D nylon", Colour: "Black", Code: "ST-F493" }, note: "Filed in the 'bag syte' category." }),
  comp({ id: "syte-top-frame-bag-eva-st-f483", mfr: "SYTE", name: "Top Frame Bag EVA 6″ ST-F483", type: "accessory", url: P("top-frame-bag-eva-6-inch-bk-st-f483"), specs: { Type: "Top-tube frame bag", Material: "EVA", Size: "6 inch", Colour: "Black", Code: "ST-F483" }, note: "Filed in the 'bag syte' category." }),
  comp({ id: "syte-compact-floor-pump-st-f1001", mfr: "SYTE", name: "Compact Floor Pump ST-F1001", type: "accessory", url: P("compact-floor-pump-pp-bk-st-f1001"), specs: { Type: "Compact floor pump", Material: "PP", Colour: "Black", Code: "ST-F1001" }, note: "Filed in the 'pump syte' category." }),
  comp({ id: "syte-hand-pump-al-st-f1004", mfr: "SYTE", name: "Hand Pump Alloy ST-F1004", type: "accessory", url: P("hand-pump-al-sl-st-f1004"), specs: { Type: "Hand pump", Material: "Aluminium", Code: "ST-F1004" }, note: "Filed in the 'pump syte' category." }),

  /* Pacific-branded accessories and parts */
  comp({ id: "pacific-bottle-cage-al-sp-h710", mfr: "Pacific", name: "Bottle Cage Alloy SP-H710", type: "accessory", url: P("bottle-cage-al-bk-sp-h710"), specs: { Type: "Bottle cage", Material: "Aluminium", Colour: "Black", Code: "SP-H710" } }),
  comp({ id: "pacific-bottle-cage-al-sp-h709", mfr: "Pacific", name: "Bottle Cage Alloy SP-H709", type: "accessory", url: P("bottle-cage-al-bk-sp-h709"), specs: { Type: "Bottle cage", Material: "Aluminium", Colour: "Black", Code: "SP-H709" } }),
  comp({ id: "pacific-bottle-cage-abs-sp-h715-rw", mfr: "Pacific", name: "Bottle Cage ABS SP-H715-RW", type: "accessory", url: P("bottle-cage-abs-sp-h715-rw"), specs: { Type: "Bottle cage", Material: "ABS", Code: "SP-H715-RW" } }),
  comp({ id: "pacific-bottle-cage-abs-sp-h713-rw", mfr: "Pacific", name: "Bottle Cage ABS SP-H713-RW", type: "accessory", url: P("bottle-cage-abs-sp-h713-rw"), specs: { Type: "Bottle cage", Material: "ABS", Code: "SP-H713-RW" } }),
  comp({ id: "pacific-saddle-mtb-sp-h189", mfr: "Pacific", name: "Saddle MTB SP-H189", type: "saddle", disc: ["mtb"], url: P("saddle-mtb-bk-sp-h189"), specs: { Type: "MTB saddle", Colour: "Black", Code: "SP-H189" } }),
  comp({ id: "pacific-saddle-ctb-spring-sp-h114-tl", mfr: "Pacific", name: "Saddle CTB with Spring SP-H114 TL", type: "saddle", disc: ["urban"], url: P("saddle-ctb-sp-h114-tl"), specs: { Type: "City/trekking saddle with springs", Colour: "Black", Code: "SP-H114 TL" } }),
  comp({ id: "pacific-floor-pump-sp-j818", mfr: "Pacific", name: "Floor Pump SP-J818", type: "accessory", url: P("floor-pump-pacific-sp-j818"), specs: { Type: "Floor pump", Code: "SP-J818" } }),
  comp({ id: "pacific-floor-pump-gauge-sp-j807", mfr: "Pacific", name: "Floor Pump with Gauge 38×470 mm SP-J807", type: "accessory", url: P("floor-pump-w-gauge-38x470mm-pp-sp-j807"), specs: { Type: "Floor pump with gauge", Barrel: "38 × 470 mm", Material: "PP", Code: "SP-J807" } }),
  comp({ id: "pacific-floor-pump-gauge-sp-j806", mfr: "Pacific", name: "Floor Pump with Gauge 38×500 mm SP-J806", type: "accessory", url: P("floor-pump-w-gauge-38x500mm-pp-sp-j806"), specs: { Type: "Floor pump with gauge", Barrel: "38 × 500 mm", Material: "PP", Code: "SP-J806" } }),
  comp({ id: "pacific-pump-pp-sp-j821", mfr: "Pacific", name: "Pump PP 38×530 mm SP-J821", type: "accessory", url: P("pump-pacific-sp-j821"), specs: { Type: "Pump", Barrel: "38 × 530 mm", Material: "PP", Code: "SP-J821" } }),
  comp({ id: "pacific-pump-pp-sp-j822", mfr: "Pacific", name: "Pump PP 32×530 mm SP-J822", type: "accessory", url: P("pump-pacific-sp-j822"), specs: { Type: "Pump", Barrel: "32 × 530 mm", Material: "PP", Code: "SP-J822" } }),
  comp({ id: "pacific-pump-pp-sp-j823", mfr: "Pacific", name: "Pump PP 32×530 mm SP-J823", type: "accessory", url: P("pump-pacific-sp-j823"), specs: { Type: "Pump", Barrel: "32 × 530 mm", Material: "PP", Code: "SP-J823" } }),
  comp({ id: "exotic-saddle-ctb-et-603", mfr: "Exotic", name: "Saddle CTB ET-603", type: "saddle", disc: ["urban"], url: X("saddle-ctb-bk-exotic-et-603"), specs: { Type: "City/trekking saddle", Colour: "Black", Code: "ET-603" } }),
];

/** Catalogue entry points used for coverage reporting. */
export const PACIFIC_CATALOGUE = {
  site: "https://pacific-bike.com/",
  categories: [
    "https://pacific-bike.com/product-category/sepeda/road/primum-road/",
    "https://pacific-bike.com/product-category/road/",
    "https://pacific-bike.com/product-category/sepeda/road/spectre-road/",
    "https://pacific-bike.com/product-category/mountain-bike/",
    "https://pacific-bike.com/product-category/sepeda/bmx/",
    "https://pacific-bike.com/product-category/brand/dahon-syte-brand/",
    "https://pacific-bike.com/product-category/bicycle-accessories/",
    "https://pacific-bike.com/homepage/products/parts-accessories/",
    "https://pacific-bike.com/homepage/products/product-syte-components/",
    "https://exotic.pacific-bike.com/product-category/accessories/",
  ],
  access: "Cloudflare block (HTTP 403) for automated clients on every path incl. robots.txt, sitemaps and the WooCommerce Store API — checked 2026-11-16.",
  notFound: ["Primum gravel", "Sprinter", "Paradox", "Factor (Pacific)", "Tractor"],
};
