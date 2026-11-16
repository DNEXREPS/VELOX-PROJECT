import type { BikeModel, CompatAttrs, SourceRef, WheelSize } from "@/lib/types";
import { DEMO_PROVENANCE, discontinued, est } from "./provenance";
import { slugify } from "./brands";
import { OFFICIAL_BIKES } from "./bikes.official";
import { PACIFIC_BIKES } from "./pacific";
import { UNITED_BIKES } from "./bikes.united";

/**
 * Seed bicycle model catalogue.
 *
 * Each record is one model + model year (+ trim). The same family across years is
 * deliberately stored as separate records so specs are never assumed identical.
 * Seed records are unverified editorial data with VELOX-estimate prices; researched records cite
 * their sources. Official manufacturer imports live in bikes.official.ts.
 * Unknown values are null → "Not Available".
 */

const jt = (n: number) => Math.round(n * 1_000_000);

/* -------- compat presets (used by Upgrade Advisor & builder) -------- */
const roadRim = (speeds: number, protocol: string, extra: CompatAttrs = {}): CompatAttrs => ({
  wheelSizes: ["700c"], wheelSize: "700c", brakeMount: "rim-caliper", brakeInterface: "rim", brakeType: "rim-caliper",
  rearAxle: "130QR", frontAxle: "100QR", speeds, protocol, freehub: "HG-road", chainrings: 2, barClampMm: 31.8,
  drivetrainSupport: ["mechanical"], frontDerailleurMount: "braze-on", ...extra,
});
const roadDisc = (speeds: number, protocol: string, extra: CompatAttrs = {}): CompatAttrs => ({
  wheelSizes: ["700c"], wheelSize: "700c", brakeMount: "flat-mount", brakeInterface: "disc", brakeType: "hydraulic-disc",
  rearAxle: "12x142", frontAxle: "12x100", speeds, protocol, freehub: "HG-road", chainrings: 2, barClampMm: 31.8,
  rotorMount: "centerlock", frontDerailleurMount: "braze-on", ...extra,
});
const mtb = (ws: WheelSize, speeds: number, protocol: string, extra: CompatAttrs = {}): CompatAttrs => ({
  wheelSizes: [ws], wheelSize: ws, brakeMount: "post-mount", brakeInterface: "disc", brakeType: "hydraulic-disc",
  rearAxle: "12x148", frontAxle: "15x110", speeds, protocol, chainrings: 1, barClampMm: 35, frontDerailleurMount: "none", ...extra,
});
const mtbQR = (ws: WheelSize, speeds: number, protocol: string, extra: CompatAttrs = {}): CompatAttrs => ({
  wheelSizes: [ws], wheelSize: ws, brakeMount: "post-mount", brakeInterface: "disc", brakeType: "mechanical-disc",
  rearAxle: "135QR", frontAxle: "100QR", speeds, protocol, freehub: "HG-MTB", chainrings: 3, barClampMm: 31.8, frontDerailleurMount: "clamp", ...extra,
});

type Seed = Omit<BikeModel, "id" | "slug" | "provenance" | "price" | "brandId" | "drawbacks" | "highlights" | "geometry" | "sizes"> & {
  brand: string;
  priceJt: number | null;
  sizes?: string[];
  highlights?: string[];
  drawbacks?: string[];
  status?: "discontinued";
  priceHistory?: BikeModel["priceHistory"];
  /** researched records: where the model name / listed facts were found */
  sources?: Array<[label: string, url: string, type: SourceRef["type"]]>;
  notes?: string;
};

const S = ["XS", "S", "M", "L", "XL"];
const R = ["48", "50", "52", "54", "56", "58"];

const SEEDS: Seed[] = [
  /* ============================ POLYGON ============================ */
  {
    brand: "Polygon", family: "Strattos", name: "Strattos S2", year: 2024, category: "road", subcategory: "endurance",
    frameMaterial: "ALX aluminium", groupset: "Shimano Claris R2000", drivetrain: "2x8", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "Alloy double-wall rims", tires: "700x25c", wheelSize: "700c", tireClearanceMm: 28, suspension: "rigid", weightKg: null, priceJt: 8.5,
    sizes: R, ridingStyle: "Relaxed road riding and first-time drop-bar cycling", usage: ["fitness", "commuting"], experience: ["beginner"],
    highlights: ["Accessible first road bike", "Wide local dealer and service network", "Claris 2x8 is simple to maintain"],
    drawbacks: ["Rim brakes limit tyre size and wet-weather stopping", "Heavier than mid-range alternatives"],
    compat: roadRim(8, "shimano-road-8", { seatpostDiameter: "27.2" }), frameColor: "#5B8DEF",
  },
  {
    brand: "Polygon", family: "Strattos", name: "Strattos S4", year: 2019, category: "road", subcategory: "endurance", generation: "Gen 1",
    frameMaterial: "ALX aluminium", groupset: "Shimano Sora R3000", drivetrain: "2x9", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "Alloy rims", tires: "700x25c", wheelSize: "700c", tireClearanceMm: 25, suspension: "rigid", weightKg: null, priceJt: 11, status: "discontinued",
    sizes: R, ridingStyle: "Endurance road", usage: ["fitness"], experience: ["beginner", "intermediate"],
    highlights: ["Popular used-market road bike in Indonesia"], drawbacks: ["Discontinued generation — parts availability varies", "Rim brakes"],
    compat: roadRim(9, "shimano-road-9", { seatpostDiameter: null }), frameColor: "#38BDF8",
    priceHistory: [{ amount: jt(11), currency: "IDR", type: "historical", source: "VELOX estimate", date: "2019-06-01", note: "Approximate launch-era street price" }],
  },
  {
    brand: "Polygon", family: "Strattos", name: "Strattos S4", year: 2024, category: "road", subcategory: "endurance", generation: "Gen 2",
    frameMaterial: "ALX aluminium", groupset: "Shimano Tiagra 4700", drivetrain: "2x10", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "Alloy double-wall rims", tires: "700x25c", wheelSize: "700c", tireClearanceMm: 28, suspension: "rigid", weightKg: null, priceJt: 13.5,
    sizes: R, ridingStyle: "Endurance and club riding", usage: ["fitness", "commuting"], experience: ["beginner", "intermediate"],
    highlights: ["10-speed Tiagra at an accessible price", "Comfortable endurance fit"], drawbacks: ["Rim brakes", "Stock wheels are a clear upgrade target"],
    compat: roadRim(10, "shimano-tiagra-4700", { seatpostDiameter: "27.2" }), frameColor: "#2563EB",
  },
  {
    brand: "Polygon", family: "Strattos", name: "Strattos S5", year: 2024, category: "road", subcategory: "endurance",
    frameMaterial: "ALX aluminium", groupset: "Shimano 105 R7000", drivetrain: "2x11", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "Alloy rims", tires: "700x25c", wheelSize: "700c", tireClearanceMm: 28, suspension: "rigid", weightKg: null, priceJt: 18,
    sizes: R, ridingStyle: "Club rides and long-distance road", usage: ["fitness", "racing"], experience: ["intermediate"],
    highlights: ["Shimano 105 11-speed", "Strong value for a 105 road bike"], drawbacks: ["Rim brakes", "Alloy frame is firmer than carbon"],
    compat: roadRim(11, "shimano-road-11", { seatpostDiameter: "27.2" }), frameColor: "#1D4ED8",
  },
  {
    brand: "Polygon", family: "Bend", name: "Bend R2", year: 2024, category: "gravel", subcategory: "adventure-gravel",
    frameMaterial: "ALX aluminium", groupset: "Shimano Claris", drivetrain: "2x8", brakes: "Mechanical disc", brakeType: "mechanical-disc",
    wheelset: "Alloy disc wheels", tires: "650b x 47", wheelSize: "650b", tireClearanceMm: 47, suspension: "rigid", weightKg: null, priceJt: 12.5,
    sizes: S, ridingStyle: "Adventure on mixed surfaces", usage: ["commuting", "bikepacking", "leisure"], experience: ["beginner", "intermediate"],
    highlights: ["Big 650b tyres soak up rough roads", "Mounts for racks and bags"], drawbacks: ["Mechanical disc brakes need regular adjustment"],
    compat: { wheelSizes: ["650b", "700c"], wheelSize: "650b", brakeMount: "flat-mount", brakeInterface: "disc", brakeType: "mechanical-disc", rearAxle: null, frontAxle: null, speeds: 8, protocol: "shimano-road-8", freehub: "HG-road", chainrings: 2, maxTireMm: 47, barClampMm: 31.8 },
    frameColor: "#D97706",
  },
  {
    brand: "Polygon", family: "Xtrada", name: "Xtrada 5", year: 2024, category: "mtb", subcategory: "hardtail",
    frameMaterial: "ALX aluminium", groupset: "Shimano Altus 3x9", drivetrain: "3x9", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy double-wall", tires: "27.5 x 2.25", wheelSize: "27.5", tireClearanceMm: null, suspension: "front", travel: "100 mm", weightKg: null, priceJt: 6.8,
    sizes: S, ridingStyle: "Light trails and everyday riding", usage: ["leisure", "trail", "commuting"], experience: ["beginner"],
    highlights: ["Affordable hardtail with hydraulic brakes", "Widely available in Indonesia"], drawbacks: ["Coil fork is basic", "Triple chainring is dated on trails"],
    compat: mtbQR("27.5", 9, "shimano-mtb-9", { brakeType: "hydraulic-disc", maxTireMm: null, seatpostDiameter: null }), frameColor: "#16A34A",
  },
  {
    brand: "Polygon", family: "Xtrada", name: "Xtrada 7", year: 2024, category: "mtb", subcategory: "cross-country",
    frameMaterial: "ALX aluminium", groupset: "Shimano Deore M6100", drivetrain: "1x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy, thru-axle", tires: "29 x 2.25", wheelSize: "29", tireClearanceMm: null, suspension: "front", travel: "100 mm", weightKg: null, priceJt: 13,
    sizes: S, ridingStyle: "Cross-country trail riding", usage: ["trail", "fitness", "racing"], experience: ["intermediate"],
    highlights: ["1x12 Deore drivetrain", "29-inch wheels roll fast over roots"], drawbacks: ["Air fork quality is entry-level"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline", seatpostDiameter: null, udh: null }), frameColor: "#15803D",
  },
  {
    brand: "Polygon", family: "Siskiu", name: "Siskiu T7", year: 2024, category: "mtb", subcategory: "trail",
    frameMaterial: "ALX aluminium", groupset: "Shimano Deore M6100", drivetrain: "1x12", brakes: "Hydraulic disc (4-piston)", brakeType: "hydraulic-disc",
    wheelset: "Alloy, boost", tires: "29 x 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "140/130 mm", weightKg: null, priceJt: 27,
    sizes: S, ridingStyle: "All-day trail riding", usage: ["trail"], experience: ["intermediate", "advanced"],
    highlights: ["Full suspension with modern geometry", "Dropper post included"], drawbacks: ["Heavier than carbon alternatives"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline", seatpostDiameter: null, udh: null }), frameColor: "#0F766E",
  },
  {
    brand: "Polygon", family: "Siskiu", name: "Siskiu T8", year: 2024, category: "mtb", subcategory: "trail",
    frameMaterial: "ALX aluminium", groupset: "Shimano SLX/XT mix", drivetrain: "1x12", brakes: "Hydraulic disc (4-piston)", brakeType: "hydraulic-disc",
    wheelset: "Alloy, boost", tires: "29 x 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "140/130 mm", weightKg: null, priceJt: 34,
    sizes: S, ridingStyle: "Aggressive trail riding", usage: ["trail"], experience: ["intermediate", "advanced"],
    highlights: ["Higher-spec suspension than T7"], drawbacks: ["Price approaches entry carbon bikes"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline", seatpostDiameter: null, udh: null }), frameColor: "#134E4A",
  },
  {
    brand: "Polygon", family: "Path", name: "Path 2", year: 2024, category: "urban", subcategory: "hybrid",
    frameMaterial: "ALX aluminium", groupset: "Shimano Altus", drivetrain: "2x8", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "Alloy rims", tires: "700x35c", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 5.6,
    sizes: S, ridingStyle: "Commuting and fitness", usage: ["commuting", "fitness"], experience: ["beginner"],
    highlights: ["Light, quick hybrid for city riding", "Upright comfortable fit"], drawbacks: ["Rim brakes are weaker in the rain"],
    compat: { wheelSizes: ["700c"], wheelSize: "700c", brakeMount: "v-brake", brakeInterface: "rim", brakeType: "v-brake", rearAxle: "135QR", frontAxle: "100QR", speeds: 8, protocol: "shimano-mtb-8", freehub: "HG-MTB", chainrings: 2, barClampMm: 31.8, seatpostDiameter: null },
    frameColor: "#64748B",
  },
  {
    brand: "Polygon", family: "Urbano", name: "Urbano 3", year: 2024, category: "folding", subcategory: "urban-folding",
    frameMaterial: "Aluminium", groupset: "Shimano Tourney", drivetrain: "1x7", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "20\" alloy", tires: "20 x 1.75", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 4.8,
    sizes: ["One size"], ridingStyle: "Mixed-mode commuting", usage: ["commuting", "leisure"], experience: ["beginner"],
    highlights: ["Folds for car boots and apartments"], drawbacks: ["Fold is larger than premium folders"],
    compat: { wheelSizes: ["20"], wheelSize: "20", brakeMount: "v-brake", brakeInterface: "rim", brakeType: "v-brake", speeds: 7, freehub: "Freewheel", chainrings: 1 },
    frameColor: "#F59E0B",
  },
  {
    brand: "Polygon", family: "Kalosi", name: "Kalosi E", year: 2024, category: "electric", subcategory: "e-urban",
    frameMaterial: "Aluminium", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 20,
    sizes: ["M", "L"], ridingStyle: "Assisted urban commuting", usage: ["commuting"], experience: ["beginner", "intermediate"],
    electric: { motor: null, batteryWh: null },
    highlights: ["Pedal assist reduces sweat on the commute"], drawbacks: ["Motor and battery specs not yet catalogued — verify with dealer"],
    compat: { wheelSize: "700c", wheelSizes: ["700c"], brakeInterface: "disc", brakeType: "hydraulic-disc" }, frameColor: "#22D3EE",
  },
  {
    brand: "Polygon", family: "Rudge", name: "Rudge 2", year: 2024, category: "bmx", subcategory: "freestyle",
    frameMaterial: "Hi-ten steel", groupset: null, drivetrain: "Single speed", brakes: "U-brake", brakeType: "rim-caliper",
    wheelset: "20\" alloy", tires: "20 x 2.3", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 3.6,
    sizes: ["20\" TT"], ridingStyle: "Park and street basics", usage: ["tricks", "leisure"], experience: ["beginner"],
    highlights: ["Affordable entry to freestyle"], drawbacks: ["Hi-ten steel is heavier than chromoly"],
    compat: { wheelSize: "20", wheelSizes: ["20"], speeds: 1, chainrings: 1, freehub: "Driver-BMX" }, frameColor: "#E11D48",
  },

  /* ============================ UNITED ============================ */

  /* ======================= OTHER INDONESIAN ======================= */
  {
    brand: "Element", family: "Ecosmo", name: "Police Ecosmo 8", year: 2024, category: "folding", subcategory: "urban-folding",
    frameMaterial: "Aluminium", groupset: "Shimano", drivetrain: "1x8", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "20\" alloy", tires: "20\"", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 4.2,
    sizes: ["One size"], ridingStyle: "City folding", usage: ["commuting", "leisure"], experience: ["beginner"],
    highlights: ["One of Indonesia's best-known folding bikes"], drawbacks: ["Exact drivetrain series varies by batch — verify"],
    compat: { wheelSize: "20", wheelSizes: ["20"], brakeInterface: "rim", brakeType: "v-brake", speeds: 8, chainrings: 1 }, frameColor: "#10B981",
  },
  {
    brand: "Thrill", family: "Ravage", name: "Ravage", year: 2024, category: "mtb", subcategory: "enduro",
    frameMaterial: "Aluminium", groupset: null, drivetrain: "1x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: null, weightKg: null, priceJt: 30,
    sizes: S, ridingStyle: "Enduro and bike park", usage: ["trail", "downhill"], experience: ["advanced"],
    highlights: ["Indonesian-designed long-travel bike"], drawbacks: ["Full specification not yet catalogued — verify with dealer"],
    compat: mtb("29", 12, "unknown"), frameColor: "#F97316",
  },
  {
    brand: "Wimcycle", family: "Hotrod", name: "Hotrod 20", year: 2024, category: "bmx", subcategory: "freestyle",
    frameMaterial: "Steel", groupset: null, drivetrain: "Single speed", brakes: "Rim / U-brake", brakeType: "rim-caliper",
    wheelset: "20\"", tires: "20\"", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 2.2,
    sizes: ["20\""], ridingStyle: "Neighbourhood riding and first tricks", usage: ["leisure", "tricks"], experience: ["beginner"],
    highlights: ["Classic, affordable Indonesian BMX"], drawbacks: ["Heavy steel construction"],
    compat: { wheelSize: "20", wheelSizes: ["20"], speeds: 1, chainrings: 1 }, frameColor: "#14B8A6",
  },

  /* ======================= REGIONAL VALUE ======================= */
  {
    brand: "Java", family: "Siluro", name: "Siluro 6", year: 2024, category: "road", subcategory: "aero",
    frameMaterial: "Carbon", groupset: null, drivetrain: "2x11", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Carbon deep-section", tires: "700x25c", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 16,
    sizes: R, ridingStyle: "Fast group rides", usage: ["racing", "fitness"], experience: ["intermediate"],
    highlights: ["Carbon aero frame at a value price"], drawbacks: ["Groupset is a value-brand mix — verify exact parts"],
    compat: roadDisc(11, "shimano-road-11", { seatpostDiameter: null }), frameColor: "#334155",
  },
  {
    brand: "Fnhon", family: "Blast", name: "Blast", year: 2024, category: "folding", subcategory: "performance-folding",
    frameMaterial: "Aluminium", groupset: null, drivetrain: "1x9", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "20\" (406)", tires: "20\"", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 6.5,
    sizes: ["One size"], ridingStyle: "Sporty folding", usage: ["commuting", "fitness"], experience: ["beginner", "intermediate"],
    highlights: ["Lightweight-feeling folding frame"], drawbacks: ["Specs vary between batches"],
    compat: { wheelSize: "20", wheelSizes: ["20"], brakeInterface: "rim", speeds: 9 }, frameColor: "#0EA5E9",
  },

  /* ============================ SPECIALIZED ============================ */
  {
    brand: "Specialized", family: "Tarmac", name: "Tarmac SL8 Expert", year: 2024, category: "road", subcategory: "race", generation: "SL8",
    frameMaterial: "FACT 10r carbon", groupset: "Shimano Ultegra Di2 R8100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Roval Rapide CLX II", tires: "700x26 Turbo Pro", wheelSize: "700c", tireClearanceMm: 32, suspension: "rigid", weightKg: 7.4, priceJt: 115,
    sizes: ["44", "49", "52", "54", "56", "58", "61"], ridingStyle: "Racing and fast group rides", usage: ["racing", "fitness"], experience: ["advanced"],
    highlights: ["Aero and light in one frame", "Electronic Ultegra shifting"], drawbacks: ["Proprietary seatpost", "Premium price"],
    compat: roadDisc(12, "shimano-di2-12", { seatpostDiameter: "aero:tarmac-sl8", bbStandard: "BSA-68", maxTireMm: 32, drivetrainSupport: ["electronic-wired", "electronic-wireless"], steerer: "tapered" }), frameColor: "#111827",
  },
  {
    brand: "Specialized", family: "Allez", name: "Allez", year: 2024, category: "road", subcategory: "endurance",
    frameMaterial: "E5 aluminium", groupset: "Shimano Claris R2000", drivetrain: "2x8", brakes: "Mechanical disc", brakeType: "mechanical-disc",
    wheelset: "Alloy disc", tires: "700x30", wheelSize: "700c", tireClearanceMm: 35, suspension: "rigid", weightKg: null, priceJt: 17,
    sizes: R, ridingStyle: "First road bike with disc brakes", usage: ["fitness", "commuting"], experience: ["beginner"],
    highlights: ["Disc brakes at entry level", "Room for 30mm+ tyres"], drawbacks: ["Pricier than local equivalents with similar groupsets"],
    compat: roadDisc(8, "shimano-road-8", { brakeType: "mechanical-disc", seatpostDiameter: "27.2", bbStandard: "BSA-68", drivetrainSupport: ["mechanical"] }), frameColor: "#7C3AED",
  },
  {
    brand: "Specialized", family: "Diverge", name: "Diverge Comp E5", year: 2024, category: "gravel", subcategory: "adventure-gravel",
    frameMaterial: "E5 aluminium", groupset: "Shimano GRX 2x10", drivetrain: "2x10", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy disc", tires: "700x38 Pathfinder", wheelSize: "700c", tireClearanceMm: 47, suspension: "front", travel: "20 mm Future Shock", weightKg: null, priceJt: 32,
    sizes: ["49", "52", "54", "56", "58", "61"], ridingStyle: "Gravel adventures with comfort", usage: ["bikepacking", "fitness", "commuting"], experience: ["intermediate"],
    highlights: ["Future Shock front suspension", "Lots of mounts"], drawbacks: ["Alloy frame is heavier than carbon gravel bikes"],
    compat: roadDisc(10, "shimano-grx-10", { maxTireMm: 47, seatpostDiameter: "27.2", bbStandard: "BSA-68" }), frameColor: "#4D7C0F",
  },
  {
    brand: "Specialized", family: "Stumpjumper", name: "Stumpjumper 15 Comp", year: 2025, category: "mtb", subcategory: "trail",
    frameMaterial: "FACT 11m carbon", groupset: "SRAM GX Eagle Transmission", drivetrain: "1x12", brakes: "SRAM Maven", brakeType: "hydraulic-disc",
    wheelset: "Roval Traverse alloy", tires: "29 x 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "160/145 mm", weightKg: null, priceJt: 95,
    sizes: ["S1", "S2", "S3", "S4", "S5", "S6"], ridingStyle: "Aggressive trail", usage: ["trail"], experience: ["advanced"],
    highlights: ["Wireless Transmission drivetrain", "Adjustable geometry"], drawbacks: ["High price"],
    compat: mtb("29", 12, "sram-axs", { freehub: "XD", udh: true, seatpostDiameter: "34.9", bbStandard: "BSA-73", drivetrainSupport: ["mechanical", "electronic-wireless"] }), frameColor: "#7F1D1D",
  },
  {
    brand: "Specialized", family: "Rockhopper", name: "Rockhopper Sport 29", year: 2024, category: "mtb", subcategory: "hardtail",
    frameMaterial: "Premium aluminium", groupset: "Shimano CUES", drivetrain: "1x9", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy", tires: "29 x 2.35", wheelSize: "29", tireClearanceMm: null, suspension: "front", travel: "80–100 mm", weightKg: null, priceJt: 14,
    sizes: S, ridingStyle: "Trail-curious beginners", usage: ["trail", "leisure"], experience: ["beginner"],
    highlights: ["Simple 1x drivetrain", "Confident hardtail geometry"], drawbacks: ["Coil fork"],
    compat: mtbQR("29", 9, "shimano-cues", { chainrings: 1, frontDerailleurMount: "none", brakeType: "hydraulic-disc" }), frameColor: "#059669",
  },
  {
    brand: "Specialized", family: "Turbo Vado", name: "Turbo Vado 4.0", year: 2024, category: "electric", subcategory: "e-urban",
    frameMaterial: "Aluminium", groupset: "Shimano CUES 10-speed", drivetrain: "1x10", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: "700x47", wheelSize: "700c", tireClearanceMm: null, suspension: "front", weightKg: null, priceJt: 70,
    sizes: ["S", "M", "L", "XL"], ridingStyle: "Long-range e-commuting", usage: ["commuting", "touring"], experience: ["beginner", "intermediate"],
    electric: { motor: "Specialized 2.0", batteryWh: 710 },
    highlights: ["Integrated lights, fenders and rack"], drawbacks: ["Heavy", "Premium price"],
    compat: { wheelSize: "700c", wheelSizes: ["700c"], brakeInterface: "disc", brakeType: "hydraulic-disc", speeds: 10 }, frameColor: "#475569",
  },

  /* ============================ TREK ============================ */
  {
    brand: "Trek", family: "Domane AL", name: "Domane AL 2", year: 2022, category: "road", subcategory: "endurance", generation: "Gen 3 (rim)",
    frameMaterial: "Alpha 100 aluminium", groupset: "Shimano Claris R2000", drivetrain: "2x8", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "Bontrager alloy", tires: "700x28", wheelSize: "700c", tireClearanceMm: 32, suspension: "rigid", weightKg: null, priceJt: 13, status: "discontinued",
    sizes: R, ridingStyle: "Endurance road", usage: ["fitness"], experience: ["beginner"],
    highlights: ["Comfortable endurance geometry"], drawbacks: ["Rim-brake generation now replaced by disc models"],
    compat: roadRim(8, "shimano-road-8", { seatpostDiameter: null }), frameColor: "#991B1B",
  },
  {
    brand: "Trek", family: "Domane AL", name: "Domane AL 2 Gen 4", year: 2024, category: "road", subcategory: "endurance", generation: "Gen 4 (disc)",
    frameMaterial: "Alpha 100 aluminium", groupset: "Shimano Claris R2000", drivetrain: "2x8", brakes: "Mechanical disc", brakeType: "mechanical-disc",
    wheelset: "Bontrager alloy disc", tires: "700x32", wheelSize: "700c", tireClearanceMm: 38, suspension: "rigid", weightKg: null, priceJt: 16.5,
    sizes: R, ridingStyle: "Endurance road and light gravel", usage: ["fitness", "commuting"], experience: ["beginner"],
    highlights: ["Disc brakes and big tyre clearance"], drawbacks: ["Mechanical discs"],
    compat: roadDisc(8, "shimano-road-8", { brakeType: "mechanical-disc", seatpostDiameter: null, maxTireMm: 38, drivetrainSupport: ["mechanical"] }), frameColor: "#B91C1C",
  },
  {
    brand: "Trek", family: "Madone", name: "Madone SL 6 Gen 8", year: 2025, category: "road", subcategory: "aero", generation: "Gen 8",
    frameMaterial: "OCLV 500 carbon", groupset: "Shimano 105 Di2 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Aeolus Elite 50", tires: "700x28", wheelSize: "700c", tireClearanceMm: 32, suspension: "rigid", weightKg: null, priceJt: 95,
    sizes: ["47", "50", "52", "54", "56", "58", "60", "62"], ridingStyle: "Aero racing", usage: ["racing"], experience: ["advanced"],
    highlights: ["Aero frame with IsoFlow comfort", "Di2 shifting"], drawbacks: ["Integrated cockpit limits fit changes"],
    compat: roadDisc(12, "shimano-di2-12", { seatpostDiameter: "aero:madone", drivetrainSupport: ["electronic-wired", "electronic-wireless"] }), frameColor: "#0F172A",
  },
  {
    brand: "Trek", family: "Marlin", name: "Marlin 5 Gen 3", year: 2024, category: "mtb", subcategory: "hardtail",
    frameMaterial: "Alpha Silver aluminium", groupset: "Shimano CUES", drivetrain: "1x9", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Bontrager alloy", tires: "29 x 2.2", wheelSize: "29", tireClearanceMm: null, suspension: "front", travel: "100 mm", weightKg: null, priceJt: 12,
    sizes: ["XS", "S", "M", "ML", "L", "XL"], ridingStyle: "Light trails and commuting", usage: ["trail", "commuting"], experience: ["beginner"],
    highlights: ["Hydraulic brakes and 1x drivetrain"], drawbacks: ["QR axles"],
    compat: mtbQR("29", 9, "shimano-cues", { chainrings: 1, frontDerailleurMount: "none", brakeType: "hydraulic-disc" }), frameColor: "#1E3A8A",
  },
  {
    brand: "Trek", family: "Fuel EX", name: "Fuel EX 8 Gen 6", year: 2024, category: "mtb", subcategory: "trail",
    frameMaterial: "Alpha Platinum aluminium", groupset: "Shimano XT M8100", drivetrain: "1x12", brakes: "Shimano Deore 4-piston", brakeType: "hydraulic-disc",
    wheelset: "Bontrager Line Comp 30", tires: "29 x 2.5 / 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "150/140 mm", weightKg: null, priceJt: 72,
    sizes: S, ridingStyle: "Trail all-rounder", usage: ["trail"], experience: ["intermediate", "advanced"],
    highlights: ["Adjustable geometry", "XT drivetrain"], drawbacks: ["Alloy frame adds weight"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline", udh: true, seatpostDiameter: "34.9" }), frameColor: "#365314",
  },
  {
    brand: "Trek", family: "FX", name: "FX 2", year: 2024, category: "urban", subcategory: "fitness",
    frameMaterial: "Alpha Gold aluminium", groupset: "Shimano Altus", drivetrain: "2x8", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Bontrager alloy", tires: "700x40", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 13,
    sizes: S, ridingStyle: "Fitness and commuting", usage: ["fitness", "commuting"], experience: ["beginner"],
    highlights: ["Light, fast flat-bar bike"], drawbacks: ["Higher price than local hybrids"],
    compat: { wheelSize: "700c", wheelSizes: ["700c"], brakeInterface: "disc", brakeType: "hydraulic-disc", brakeMount: "flat-mount", rearAxle: "135QR", frontAxle: "100QR", speeds: 8, protocol: "shimano-mtb-8", freehub: "HG-MTB", chainrings: 2, barClampMm: 31.8 }, frameColor: "#334155",
  },

  /* ============================ GIANT ============================ */
  {
    brand: "Giant", family: "TCR", name: "TCR Advanced 1", year: 2024, category: "road", subcategory: "climbing",
    frameMaterial: "Advanced-grade composite", groupset: "Shimano 105 Di2 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Giant SLR 2 36", tires: "700x28 Gavia", wheelSize: "700c", tireClearanceMm: 33, suspension: "rigid", weightKg: null, priceJt: 55,
    sizes: ["XS", "S", "M", "ML", "L", "XL"], ridingStyle: "Climbing and all-round racing", usage: ["racing", "fitness"], experience: ["intermediate", "advanced"],
    highlights: ["Light, stiff carbon frame", "Excellent value for carbon + Di2"], drawbacks: ["D-shaped proprietary seatpost"],
    compat: roadDisc(12, "shimano-di2-12", { seatpostDiameter: "aero:giant-dfuse", bbStandard: "BB86", maxTireMm: 33, drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"] }), frameColor: "#1E293B",
  },
  {
    brand: "Giant", family: "Defy", name: "Defy Advanced 2", year: 2024, category: "road", subcategory: "endurance",
    frameMaterial: "Advanced-grade composite", groupset: "Shimano 105 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Giant P-R2", tires: "700x32", wheelSize: "700c", tireClearanceMm: 38, suspension: "rigid", weightKg: null, priceJt: 42,
    sizes: ["XS", "S", "M", "ML", "L", "XL"], ridingStyle: "Long-distance comfort", usage: ["fitness", "touring"], experience: ["beginner", "intermediate"],
    highlights: ["Endurance carbon with 32mm tyres"], drawbacks: ["Mechanical 105 — Di2 costs more"],
    compat: roadDisc(12, "shimano-road-12", { seatpostDiameter: "aero:giant-dfuse", maxTireMm: 38 }), frameColor: "#0C4A6E",
  },
  {
    brand: "Giant", family: "Talon", name: "Talon 2", year: 2024, category: "mtb", subcategory: "hardtail",
    frameMaterial: "ALUXX aluminium", groupset: "Shimano Deore", drivetrain: "1x10", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Giant GX03V", tires: "29 x 2.2", wheelSize: "29", tireClearanceMm: null, suspension: "front", travel: "100 mm", weightKg: null, priceJt: 13,
    sizes: S, ridingStyle: "Entry XC", usage: ["trail", "fitness"], experience: ["beginner", "intermediate"],
    highlights: ["Proven hardtail platform"], drawbacks: ["QR wheels"],
    compat: mtbQR("29", 10, "shimano-mtb-10", { chainrings: 1, frontDerailleurMount: "none", brakeType: "hydraulic-disc" }), frameColor: "#0369A1",
  },
  {
    brand: "Giant", family: "Escape", name: "Escape 3", year: 2024, category: "urban", subcategory: "hybrid",
    frameMaterial: "ALUXX aluminium", groupset: "Shimano Tourney", drivetrain: "3x7", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "Alloy", tires: "700x38", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 6.5,
    sizes: S, ridingStyle: "City and fitness", usage: ["commuting", "fitness"], experience: ["beginner"],
    highlights: ["Light hybrid frame"], drawbacks: ["Freewheel drivetrain limits upgrades"],
    compat: { wheelSize: "700c", wheelSizes: ["700c"], brakeInterface: "rim", brakeType: "v-brake", brakeMount: "v-brake", rearAxle: "135QR", frontAxle: "100QR", speeds: 7, freehub: "Freewheel", chainrings: 3, barClampMm: 31.8 }, frameColor: "#525252",
  },
  {
    brand: "Giant", family: "Revolt", name: "Revolt Advanced 2", year: 2024, category: "gravel", subcategory: "performance-gravel",
    frameMaterial: "Advanced-grade composite", groupset: "Shimano GRX 2x10", drivetrain: "2x10", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Giant P-X2", tires: "700x40", wheelSize: "700c", tireClearanceMm: 53, suspension: "rigid", weightKg: null, priceJt: 45,
    sizes: ["S", "M", "ML", "L", "XL"], ridingStyle: "Fast gravel", usage: ["bikepacking", "racing"], experience: ["intermediate"],
    highlights: ["Flip-chip for wheelbase and tyre size"], drawbacks: ["GRX 10-speed is older generation"],
    compat: roadDisc(10, "shimano-grx-10", { maxTireMm: 53, seatpostDiameter: "aero:giant-dfuse" }), frameColor: "#3F6212",
  },

  /* ============================ CANNONDALE ============================ */
  {
    brand: "Cannondale", family: "CAAD", name: "CAAD10 105", year: 2014, category: "road", subcategory: "race",
    frameMaterial: "SmartFormed alloy", groupset: "Shimano 105 5700", drivetrain: "2x10", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "Mavic Aksium", tires: "700x23", wheelSize: "700c", tireClearanceMm: 25, suspension: "rigid", weightKg: null, priceJt: null, status: "discontinued",
    sizes: R, ridingStyle: "Classic alloy race bike", usage: ["racing", "fitness"], experience: ["intermediate"],
    highlights: ["Cult-classic alloy race frame", "Strong used-market value"], drawbacks: ["Discontinued", "Narrow tyre clearance"],
    compat: roadRim(10, "shimano-road-10", { bbStandard: "BB30", seatpostDiameter: "27.2" }), frameColor: "#065F46",
  },
  {
    brand: "Cannondale", family: "CAAD", name: "CAAD13 Disc 105", year: 2023, category: "road", subcategory: "race",
    frameMaterial: "SmartForm C1 alloy", groupset: "Shimano 105 R7000", drivetrain: "2x11", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Cannondale alloy", tires: "700x25", wheelSize: "700c", tireClearanceMm: 30, suspension: "rigid", weightKg: null, priceJt: 33,
    sizes: R, ridingStyle: "Race-bred alloy", usage: ["racing", "fitness"], experience: ["intermediate"],
    highlights: ["Carbon-like ride from alloy"], drawbacks: ["Proprietary seatpost shape"],
    compat: roadDisc(11, "shimano-road-11", { bbStandard: "BB30", seatpostDiameter: null }), frameColor: "#166534",
  },
  {
    brand: "Cannondale", family: "SuperSix EVO", name: "SuperSix EVO 4", year: 2024, category: "road", subcategory: "all-rounder", generation: "Gen 4",
    frameMaterial: "BallisTec carbon", groupset: "Shimano 105 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "HollowGram alloy", tires: "700x30", wheelSize: "700c", tireClearanceMm: 30, suspension: "rigid", weightKg: null, priceJt: 55,
    sizes: R, ridingStyle: "All-round race bike", usage: ["racing"], experience: ["intermediate", "advanced"],
    highlights: ["Aero-optimised all-rounder"], drawbacks: ["Alloy wheels hold back the frame"],
    compat: roadDisc(12, "shimano-road-12", { seatpostDiameter: null }), frameColor: "#0B3B2E",
  },
  {
    brand: "Cannondale", family: "Topstone", name: "Topstone 2", year: 2024, category: "gravel", subcategory: "adventure-gravel",
    frameMaterial: "SmartForm C2 alloy", groupset: "Shimano GRX 2x10", drivetrain: "2x10", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy", tires: "700x40", wheelSize: "700c", tireClearanceMm: 45, suspension: "rigid", weightKg: null, priceJt: 30,
    sizes: S, ridingStyle: "Gravel adventures", usage: ["bikepacking", "commuting"], experience: ["intermediate"],
    highlights: ["Many mounts for bags"], drawbacks: ["Heavier than carbon gravel bikes"],
    compat: roadDisc(10, "shimano-grx-10", { maxTireMm: 45, seatpostDiameter: "27.2" }), frameColor: "#854D0E",
  },

  /* ============================ CANYON ============================ */
  {
    brand: "Canyon", family: "Ultimate", name: "Ultimate CF SL 7", year: 2024, category: "road", subcategory: "all-rounder",
    frameMaterial: "Carbon", groupset: "Shimano 105 Di2 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "DT Swiss Performance", tires: "700x28", wheelSize: "700c", tireClearanceMm: 30, suspension: "rigid", weightKg: null, priceJt: 52,
    sizes: ["3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL"], ridingStyle: "All-round road", usage: ["racing", "fitness"], experience: ["intermediate", "advanced"],
    highlights: ["Direct-sales value"], drawbacks: ["Direct import adds shipping/tax to Indonesia"],
    compat: roadDisc(12, "shimano-di2-12", { bbStandard: "PF86", seatpostDiameter: null }), frameColor: "#18181B",
  },
  {
    brand: "Canyon", family: "Aeroad", name: "Aeroad CF SLX 7", year: 2024, category: "road", subcategory: "aero",
    frameMaterial: "Carbon", groupset: "Shimano Ultegra Di2 R8100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "DT Swiss ARC 1600 50", tires: "700x28", wheelSize: "700c", tireClearanceMm: 30, suspension: "rigid", weightKg: null, priceJt: 90,
    sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL"], ridingStyle: "Aero racing", usage: ["racing"], experience: ["advanced"],
    highlights: ["Aero frame with adjustable cockpit width"], drawbacks: ["Proprietary aero seatpost"],
    compat: roadDisc(12, "shimano-di2-12", { seatpostDiameter: "aero:canyon-aeroad", drivetrainSupport: ["electronic-wired", "electronic-wireless"] }), frameColor: "#27272A",
  },
  {
    brand: "Canyon", family: "Grail", name: "Grail CF SL 7", year: 2024, category: "gravel", subcategory: "gravel-racing",
    frameMaterial: "Carbon", groupset: "Shimano GRX RX820", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "DT Swiss G 1800", tires: "700x40", wheelSize: "700c", tireClearanceMm: 50, suspension: "rigid", weightKg: null, priceJt: 55,
    sizes: ["2XS", "XS", "S", "M", "L", "XL", "2XL"], ridingStyle: "Gravel racing", usage: ["racing", "bikepacking"], experience: ["intermediate", "advanced"],
    highlights: ["Fast carbon gravel race bike", "GRX 12-speed"], drawbacks: ["Direct import logistics"],
    compat: roadDisc(12, "shimano-grx-12", { maxTireMm: 50, seatpostDiameter: null }), frameColor: "#3F3F46",
  },
  {
    brand: "Canyon", family: "Spectral", name: "Spectral 125 CF 7", year: 2024, category: "mtb", subcategory: "trail",
    frameMaterial: "Carbon", groupset: "Shimano SLX/XT", drivetrain: "1x12", brakes: "Shimano 4-piston", brakeType: "hydraulic-disc",
    wheelset: "DT Swiss", tires: "29 x 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "140/125 mm", weightKg: null, priceJt: 70,
    sizes: S, ridingStyle: "Efficient trail", usage: ["trail"], experience: ["intermediate", "advanced"],
    highlights: ["Short-travel trail ripper"], drawbacks: ["Direct import logistics"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline", udh: null }), frameColor: "#44403C",
  },

  /* ============================ OTHERS ============================ */
  {
    brand: "Merida", family: "Scultura", name: "Scultura 4000", year: 2024, category: "road", subcategory: "all-rounder",
    frameMaterial: "CF3 carbon", groupset: "Shimano 105 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Merida Expert SL", tires: "700x28", wheelSize: "700c", tireClearanceMm: 32, suspension: "rigid", weightKg: null, priceJt: 38,
    sizes: ["XXS", "XS", "S", "M", "ML", "L", "XL"], ridingStyle: "All-round road", usage: ["fitness", "racing"], experience: ["intermediate"],
    highlights: ["Carbon frame at a competitive price"], drawbacks: ["Mechanical shifting"],
    compat: roadDisc(12, "shimano-road-12", { seatpostDiameter: null }), frameColor: "#1F2937",
  },
  {
    brand: "Merida", family: "Big.Nine", name: "Big.Nine 300", year: 2024, category: "mtb", subcategory: "cross-country",
    frameMaterial: "Aluminium", groupset: "Shimano Deore", drivetrain: "1x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Merida Expert TR", tires: "29 x 2.25", wheelSize: "29", tireClearanceMm: null, suspension: "front", travel: "100 mm", weightKg: null, priceJt: 17,
    sizes: S, ridingStyle: "XC", usage: ["trail", "racing"], experience: ["intermediate"],
    highlights: ["Boost axles, 1x12"], drawbacks: ["Coil fork on some sizes — verify"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline" }), frameColor: "#0F766E",
  },
  {
    brand: "Scott", family: "Spark RC", name: "Spark RC Comp", year: 2024, category: "mtb", subcategory: "cross-country",
    frameMaterial: "Carbon", groupset: "SRAM NX Eagle", drivetrain: "1x12", brakes: "Shimano hydraulic", brakeType: "hydraulic-disc",
    wheelset: "Syncros X-30SE", tires: "29 x 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "120 mm", weightKg: null, priceJt: 75,
    sizes: ["S", "M", "L", "XL"], ridingStyle: "XC racing", usage: ["racing", "trail"], experience: ["advanced"],
    highlights: ["Integrated rear shock"], drawbacks: ["Proprietary parts"],
    compat: mtb("29", 12, "sram-eagle-mech", { freehub: "HG-MTB", udh: true }), frameColor: "#0E7490",
  },
  {
    brand: "Scott", family: "Addict", name: "Addict 30", year: 2024, category: "road", subcategory: "endurance",
    frameMaterial: "Carbon", groupset: "Shimano 105 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Syncros RP2.0", tires: "700x32", wheelSize: "700c", tireClearanceMm: 35, suspension: "rigid", weightKg: null, priceJt: 45,
    sizes: ["XS", "S", "M", "L", "XL"], ridingStyle: "Endurance", usage: ["fitness"], experience: ["intermediate"],
    highlights: ["Endurance carbon"], drawbacks: ["Mechanical 105"],
    compat: roadDisc(12, "shimano-road-12", { seatpostDiameter: null, maxTireMm: 35 }), frameColor: "#0C4A6E",
  },
  {
    brand: "Bianchi", family: "Oltre", name: "Oltre Race 105", year: 2024, category: "road", subcategory: "aero",
    frameMaterial: "Carbon", groupset: "Shimano 105 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Reparto Corse", tires: "700x28", wheelSize: "700c", tireClearanceMm: 32, suspension: "rigid", weightKg: null, priceJt: 60,
    sizes: ["47", "50", "53", "55", "57", "59"], ridingStyle: "Aero road", usage: ["racing"], experience: ["intermediate", "advanced"],
    highlights: ["Iconic celeste finish options"], drawbacks: ["Premium for the brand"],
    compat: roadDisc(12, "shimano-road-12", { seatpostDiameter: null }), frameColor: "#5EEAD4",
  },
  {
    brand: "Orbea", family: "Orca", name: "Orca M30", year: 2024, category: "road", subcategory: "climbing",
    frameMaterial: "OMR carbon", groupset: "Shimano 105 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy", tires: "700x28", wheelSize: "700c", tireClearanceMm: 32, suspension: "rigid", weightKg: null, priceJt: 48,
    sizes: ["47", "49", "51", "53", "55", "57", "60"], ridingStyle: "Climbing", usage: ["racing", "fitness"], experience: ["intermediate"],
    highlights: ["Light climbing frame"], drawbacks: ["Alloy wheels"],
    compat: roadDisc(12, "shimano-road-12", { seatpostDiameter: null }), frameColor: "#9F1239",
  },
  {
    brand: "Pinarello", family: "Dogma", name: "Dogma F Dura-Ace Di2", year: 2024, category: "road", subcategory: "race",
    frameMaterial: "Toray T1100 carbon", groupset: "Shimano Dura-Ace Di2 R9200", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Princeton Grit / premium carbon", tires: "700x28", wheelSize: "700c", tireClearanceMm: 30, suspension: "rigid", weightKg: null, priceJt: 260,
    sizes: ["430", "465", "500", "515", "530", "545", "560", "575", "595"], ridingStyle: "WorldTour racing", usage: ["racing"], experience: ["advanced"],
    highlights: ["Asymmetric race frame"], drawbacks: ["Very high price", "Proprietary components"],
    compat: roadDisc(12, "shimano-di2-12", { seatpostDiameter: "aero:pinarello-dogma", drivetrainSupport: ["electronic-wired", "electronic-wireless"] }), frameColor: "#0A0A0A",
  },
  {
    brand: "Santa Cruz", family: "Hightower", name: "Hightower C R", year: 2024, category: "mtb", subcategory: "all-mountain", generation: "Gen 4",
    frameMaterial: "Carbon C", groupset: "SRAM GX Eagle", drivetrain: "1x12", brakes: "SRAM G2", brakeType: "hydraulic-disc",
    wheelset: "RaceFace AR 30", tires: "29 x 2.5/2.4", wheelSize: "29", tireClearanceMm: 66, suspension: "full", travel: "150/145 mm", weightKg: null, priceJt: 90,
    sizes: ["S", "M", "L", "XL", "XXL"], ridingStyle: "All-mountain", usage: ["trail", "downhill"], experience: ["advanced"],
    highlights: ["Lifetime frame warranty programme"], drawbacks: ["High price"],
    compat: mtb("29", 12, "sram-eagle-mech", { freehub: "XD", udh: true, seatpostDiameter: "34.9", bbStandard: "BSA-73", drivetrainSupport: ["mechanical", "electronic-wireless"] }), frameColor: "#1E40AF",
  },
  {
    brand: "Kona", family: "Process", name: "Process 153", year: 2023, category: "mtb", subcategory: "enduro",
    frameMaterial: "Aluminium", groupset: "Shimano Deore", drivetrain: "1x12", brakes: "Shimano 4-piston", brakeType: "hydraulic-disc",
    wheelset: "WTB alloy", tires: "29 x 2.5", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "160/153 mm", weightKg: null, priceJt: 55,
    sizes: ["S", "M", "L", "XL"], ridingStyle: "Enduro", usage: ["downhill", "trail"], experience: ["advanced"],
    highlights: ["Playful long-travel"], drawbacks: ["Heavy for long climbs"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline" }), frameColor: "#A16207",
  },
  {
    brand: "Commencal", family: "Meta", name: "Meta TR Essential", year: 2024, category: "mtb", subcategory: "trail",
    frameMaterial: "Aluminium", groupset: "Shimano Deore", drivetrain: "1x12", brakes: "Shimano 4-piston", brakeType: "hydraulic-disc",
    wheelset: "Alloy", tires: "29 x 2.4", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "150/140 mm", weightKg: null, priceJt: 45,
    sizes: ["S", "M", "L", "XL"], ridingStyle: "Trail", usage: ["trail"], experience: ["intermediate", "advanced"],
    highlights: ["Gravity-bred trail geometry"], drawbacks: ["Direct import logistics"],
    compat: mtb("29", 12, "shimano-mtb-12", { freehub: "MicroSpline" }), frameColor: "#525252",
  },
  {
    brand: "Surly", family: "Disc Trucker", name: "Disc Trucker", year: 2024, category: "urban", subcategory: "touring",
    frameMaterial: "4130 chromoly steel", groupset: "Shimano Sora/Alivio mix", drivetrain: "3x9", brakes: "Mechanical disc", brakeType: "mechanical-disc",
    wheelset: "Alloy 36h", tires: "26 x 2.1 / 700x42", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 32,
    sizes: ["42", "46", "50", "52", "54", "56", "58", "60", "62", "64"], ridingStyle: "Loaded touring", usage: ["touring", "bikepacking"], experience: ["intermediate"],
    highlights: ["Built for heavy loads and long trips"], drawbacks: ["Heavy"],
    compat: { wheelSize: "700c", wheelSizes: ["700c", "26"], brakeInterface: "disc", brakeType: "mechanical-disc", brakeMount: "post-mount", rearAxle: "135QR", frontAxle: "100QR", speeds: 9, freehub: "HG-MTB", chainrings: 3, seatpostDiameter: "27.2", bbStandard: "BSA-68", drivetrainSupport: ["mechanical"] }, frameColor: "#78350F",
  },
  {
    brand: "Salsa", family: "Cutthroat", name: "Cutthroat C GRX 600", year: 2024, category: "gravel", subcategory: "bikepacking",
    frameMaterial: "Carbon", groupset: "Shimano GRX 600", drivetrain: "1x11", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "WTB ST i25", tires: "29 x 2.2", wheelSize: "29", tireClearanceMm: 61, suspension: "rigid", weightKg: null, priceJt: 55,
    sizes: ["52", "54", "56", "58", "60"], ridingStyle: "Ultra-distance bikepacking", usage: ["bikepacking", "touring"], experience: ["advanced"],
    highlights: ["Designed for the Tour Divide"], drawbacks: ["Niche geometry"],
    compat: roadDisc(11, "shimano-grx-11", { wheelSize: "29", wheelSizes: ["29", "700c"], maxTireMm: 61, seatpostDiameter: "27.2", chainrings: 1, freehub: "HG-MTB" }), frameColor: "#7C2D12",
  },
  {
    brand: "Brompton", family: "C Line", name: "C Line Explore", year: 2024, category: "folding", subcategory: "compact-folding",
    frameMaterial: "Steel", groupset: "Brompton 6-speed", drivetrain: "2x3", brakes: "Rim caliper", brakeType: "rim-caliper",
    wheelset: "16\" (349)", tires: "16 x 1.35", wheelSize: "16", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 33,
    sizes: ["One size, 3 handlebar heights"], ridingStyle: "Multi-modal city commuting", usage: ["commuting"], experience: ["beginner", "intermediate"],
    highlights: ["Exceptionally compact fold", "Strong resale value"], drawbacks: ["Proprietary parts", "Premium price"],
    compat: { wheelSize: "16", wheelSizes: ["16"], brakeInterface: "rim", brakeType: "rim-caliper" }, frameColor: "#B45309",
  },
  {
    brand: "Tern", family: "Link", name: "Link D8", year: 2024, category: "folding", subcategory: "urban-folding",
    frameMaterial: "Aluminium", groupset: "Shimano Claris", drivetrain: "1x8", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "20\" (406)", tires: "20 x 1.75", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 11,
    sizes: ["One size"], ridingStyle: "City folding", usage: ["commuting", "leisure"], experience: ["beginner"],
    highlights: ["Quick fold, stable ride"], drawbacks: ["Heavier than titanium folders"],
    compat: { wheelSize: "20", wheelSizes: ["20"], brakeInterface: "rim", brakeType: "v-brake", speeds: 8, chainrings: 1 }, frameColor: "#0369A1",
  },
  {
    brand: "Dahon", family: "Mu", name: "Mu D9", year: 2024, category: "folding", subcategory: "performance-folding",
    frameMaterial: "Aluminium", groupset: "Shimano", drivetrain: "1x9", brakes: "V-brake", brakeType: "v-brake",
    wheelset: "20\" (406)", tires: "20\"", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 12,
    sizes: ["One size"], ridingStyle: "Sporty folding", usage: ["commuting", "fitness"], experience: ["beginner", "intermediate"],
    highlights: ["Light, quick folding bike"], drawbacks: ["Drivetrain series not catalogued"],
    compat: { wheelSize: "20", wheelSizes: ["20"], brakeInterface: "rim", brakeType: "v-brake", speeds: 9, chainrings: 1 }, frameColor: "#4338CA",
  },
  {
    brand: "Haro", family: "Downtown", name: "Downtown 20.5", year: 2024, category: "bmx", subcategory: "street",
    frameMaterial: "Hi-ten steel / chromoly mix", groupset: null, drivetrain: "Single speed", brakes: "U-brake", brakeType: "rim-caliper",
    wheelset: "20\" alloy", tires: "20 x 2.4", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 7,
    sizes: ["20.5\" TT"], ridingStyle: "Street and park", usage: ["tricks"], experience: ["beginner", "intermediate"],
    highlights: ["Complete freestyle BMX from a pioneering brand"], drawbacks: ["Heavier than full-chromoly completes"],
    compat: { wheelSize: "20", wheelSizes: ["20"], speeds: 1, chainrings: 1, freehub: "Driver-BMX" }, frameColor: "#DC2626",
  },
  {
    brand: "Riese & Müller", family: "Load", name: "Load4 75 Touring", year: 2024, category: "electric", subcategory: "e-cargo",
    frameMaterial: "Aluminium", groupset: "Enviolo / Shimano (varies)", drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "20", tireClearanceMm: null, suspension: "full", weightKg: null, priceJt: 140,
    sizes: ["One size"], ridingStyle: "Family and cargo transport", usage: ["cargo", "commuting"], experience: ["beginner", "intermediate"],
    electric: { motor: "Bosch Cargo Line", batteryWh: null },
    highlights: ["Full suspension cargo e-bike"], drawbacks: ["Very high price", "Large storage footprint"],
    compat: { brakeInterface: "disc", brakeType: "hydraulic-disc" }, frameColor: "#365314",
  },
  {
    brand: "Cube", family: "Kathmandu", name: "Kathmandu Hybrid Pro", year: 2024, category: "electric", subcategory: "electric-hybrid",
    frameMaterial: "Aluminium", groupset: "Shimano Deore", drivetrain: "1x11", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: "700x50", wheelSize: "700c", tireClearanceMm: null, suspension: "front", weightKg: null, priceJt: 60,
    sizes: ["XS", "S", "M", "L", "XL"], ridingStyle: "E-trekking", usage: ["touring", "commuting"], experience: ["beginner", "intermediate"],
    electric: { motor: "Bosch Performance Line", batteryWh: 750 },
    highlights: ["Long-range touring e-bike"], drawbacks: ["Heavy"],
    compat: { wheelSize: "700c", wheelSizes: ["700c"], brakeInterface: "disc", brakeType: "hydraulic-disc", speeds: 11 }, frameColor: "#44403C",
  },
  {
    brand: "Specialized", family: "Turbo Levo", name: "Turbo Levo Comp Alloy", year: 2024, category: "electric", subcategory: "e-mtb",
    frameMaterial: "M5 aluminium", groupset: "SRAM Eagle 90", drivetrain: "1x12", brakes: "SRAM DB8", brakeType: "hydraulic-disc",
    wheelset: "Alloy", tires: "29 / 27.5 x 2.6", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "160/150 mm", weightKg: null, priceJt: 95,
    sizes: ["S2", "S3", "S4", "S5", "S6"], ridingStyle: "E-trail", usage: ["trail"], experience: ["intermediate", "advanced"],
    electric: { motor: "Specialized 3.1", batteryWh: 700 },
    highlights: ["Mixed-wheel e-MTB"], drawbacks: ["Weight and price"],
    compat: mtb("29", 12, "sram-eagle-mech", { freehub: "HG-MTB", udh: true }), frameColor: "#1F2937",
  },
  {
    brand: "Bombtrack", family: "Arise", name: "Arise", year: 2024, category: "other", subcategory: "single-speed",
    frameMaterial: "Chromoly steel", groupset: null, drivetrain: "Single speed", brakes: "Mechanical disc", brakeType: "mechanical-disc",
    wheelset: null, tires: "700x40", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: 14,
    sizes: ["XS", "S", "M", "L"], ridingStyle: "Single-speed urban and gravel", usage: ["commuting", "leisure"], experience: ["intermediate"],
    highlights: ["Low-maintenance single speed"], drawbacks: ["One gear on steep climbs"],
    compat: { wheelSize: "700c", wheelSizes: ["700c"], brakeInterface: "disc", brakeType: "mechanical-disc", speeds: 1, chainrings: 1 }, frameColor: "#374151",
  },
  {
    brand: "Ridley", family: "X-Night", name: "X-Night RS", year: 2024, category: "other", subcategory: "cyclocross",
    frameMaterial: "Carbon", groupset: "SRAM Force AXS 1x", drivetrain: "1x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: "700x33", wheelSize: "700c", tireClearanceMm: 40, suspension: "rigid", weightKg: null, priceJt: 85,
    sizes: ["XS", "S", "M", "L", "XL"], ridingStyle: "Cyclocross racing", usage: ["racing"], experience: ["advanced"],
    highlights: ["Thoroughbred cyclocross racer"], drawbacks: ["Specialised use"],
    compat: roadDisc(12, "sram-axs", { chainrings: 1, freehub: "XDR", maxTireMm: 40, drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"] }), frameColor: "#1E3A8A",
  },

  /* ================= RESEARCHED — CHINESE & ASIAN BRANDS (2026-11-16) ================= */
  {
    brand: "Pardus", family: "Super EVO", name: "Super EVO", year: 2025, category: "road", subcategory: "endurance",
    frameMaterial: "Carbon (T1100 blend)", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Lightweight endurance road", usage: ["fitness", "racing"], experience: ["intermediate", "advanced"],
    highlights: ["Frame quoted at about 680 g (manufacturer claim)", "Brand supplies the Chinese national team"], drawbacks: ["Prices found only in EUR — no IDR pricing"],
    compat: roadDisc(12, "unknown"), frameColor: "#B91C1C",
    sources: [["Cyclists Hub — Pardus Super EVO", "https://www.cyclistshub.com/pardus-introduces-spark-evo-gen-4", "publication"], ["Cycling Weekly — Pardus Europe launch", "https://www.cyclingweekly.com/products/another-chinese-manufacturer-arrives-in-europe-with-a-6-7kg-race-bike-and-its-half-the-price-of-the-big-brands", "publication"]],
    notes: "Builds listed at €4,090 (105 Di2) and €5,090 (Ultegra Di2) in European coverage; not converted to IDR.",
  },
  {
    brand: "Tavelo", family: "Arow", name: "Arow Race Ultegra Di2", year: 2024, category: "road", subcategory: "race",
    frameMaterial: "Carbon", groupset: "Shimano Ultegra Di2 R8100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Road racing", usage: ["racing"], experience: ["advanced"], highlights: ["Integrated carbon cockpit"], drawbacks: ["Limited dealer support in Indonesia"],
    compat: roadDisc(12, "shimano-di2-12"), frameColor: "#1E3A8A",
    sources: [["Cycle Limited — Tavelo Arow Race Ultegra Di2 2024", "https://cyclelimited.com/products/tavelo-arow-race-polestar-ultegra-di2-road-bike-2024-x-large", "retailer"], ["Bike Insights — 2024 Tavelo Arow", "https://bikeinsights.com/bikes/66832d20b59776001b1606ba-tavelo-arow", "publication"]],
  },
  {
    brand: "Quick Pro", family: "AR:ONE", name: "AR:ONE 105 Di2", year: 2024, category: "road", subcategory: "all-rounder",
    frameMaterial: "Carbon (T1100 + M65)", groupset: "Shimano 105 Di2 R7100", drivetrain: "2x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Aero all-round road", usage: ["racing", "fitness"], experience: ["intermediate", "advanced"], highlights: ["5-year frame warranty (manufacturer)"], drawbacks: ["Frame weight differs between listings"],
    compat: roadDisc(12, "shimano-di2-12"), frameColor: "#4C1D95",
    sources: [["Quick Pro USA — AR:ONE 105 Di2", "https://www.quickprousa.com/products/ar-one-105-di2", "official-website"], ["Bike Insights — 2024 Quick Pro AR:ONE", "https://bikeinsights.com/bike-geometries/68f539f67d8930001b5bbfd9-2024-quick-pro-arone-base-m", "publication"]],
  },
  {
    brand: "Quick Pro", family: "TT:ONE", name: "TT:ONE Frameset", year: 2024, category: "road", subcategory: "time-trial",
    frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: null, brakeType: null,
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Time trial", usage: ["racing"], experience: ["advanced"], highlights: ["Wind-tunnel developed (manufacturer claim)"], drawbacks: ["Frameset only"],
    compat: {}, frameColor: "#312E81",
    sources: [["Panda Podium — Quick Pro TT:ONE frameset", "https://www.pandapodium.cc/?p=44194", "retailer"]],
  },
  {
    brand: "Elves", family: "Falath", name: "Falath EXP Sport", year: 2024, category: "road", subcategory: "aero",
    frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Aero road", usage: ["racing", "fitness"], experience: ["intermediate", "advanced"], highlights: ["UCI-approved frame (per review)", "52 cm frameset 1,220 g unpainted with hardware (review measurement)"], drawbacks: ["Heavier than flagship aero frames"],
    compat: roadDisc(12, "unknown"), frameColor: "#065F46",
    sources: [["Cycling Weekly — Elves Falath EXP Sport review", "https://www.cyclingweekly.com/reviews/road-bikes/elves-falath-exp-sport-review-an-aero-bike-that-brings-performance-and-value-to-the-people", "publication"]],
  },
  {
    brand: "Winspace", family: "G5", name: "G5 Aero Gravel", year: 2025, category: "gravel", subcategory: "gravel-racing",
    frameMaterial: "Carbon", groupset: "Shimano GRX RX825 Di2 / SRAM Force AXS (builds)", drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Lún GRAPID 2", tires: null, wheelSize: "700c", tireClearanceMm: 58, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Fast gravel racing", usage: ["racing", "bikepacking"], experience: ["intermediate", "advanced"], highlights: ["Takes a 58 mm front tyre"], drawbacks: ["Direct-to-consumer only — after-sales support takes patience"],
    compat: roadDisc(12, "unknown", { maxTireMm: 58 }), frameColor: "#0E7490",
    sources: [["BikeRadar — Winspace G5", "https://www.bikeradar.com/news/winspace-g5-aero-gravel-bike", "publication"]],
    notes: "58 mm is the front clearance quoted by BikeRadar; rear clearance not recorded.",
  },
  {
    brand: "SEKA", family: "Spear", name: "Spear Disc Frameset", year: 2024, category: "road", subcategory: "aero",
    frameMaterial: "Carbon (six fibre types)", groupset: null, drivetrain: null, brakes: "Disc", brakeType: "hydraulic-disc",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Aero road racing", usage: ["racing"], experience: ["advanced"], highlights: ["Strong wind-tunnel result in Cyclingnews testing"], drawbacks: ["Reviewers found it insufficiently stiff"],
    compat: roadDisc(12, "unknown"), frameColor: "#111827",
    sources: [["Cyclingnews — SEKA Spear review", "https://www.cyclingnews.com/bikes/road/seka-spear-review/", "publication"]],
  },

  /* ================= INDONESIAN RESEARCH PASS · 2026-11-16 =================
   * Polygon, Pacific and Rodalink block automated reading, so these records cite the official
   * Polygon Indonesia product pages as indexed by web search (model, year and the quoted facts
   * only), plus reputable listings. Status stays "unverified" until a reviewer opens the page. */
  {
    brand: "Polygon", family: "Strattos", name: "Strattos S3", year: 2019, category: "road", subcategory: "endurance", status: "discontinued",
    frameMaterial: "ALX aluminium", groupset: "Shimano Sora", drivetrain: "2x9", brakes: "Tektro R-312 rim caliper", brakeType: "rim-caliper",
    wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "Entry endurance road riding", usage: ["fitness", "commuting"], experience: ["beginner"],
    highlights: ["Shimano Sora 2x9 with a Sunrace 11-28T cassette", "Carbon fork on an aluminium frame"], drawbacks: ["Rim brakes", "Published weights disagree (10.1 kg vs 10.6 kg) — shown as Not Available"],
    compat: roadRim(9, "shimano-road-9", { seatpostDiameter: null }), frameColor: "#EAB308",
    sources: [["Rodalink Malaysia — Polygon Strattos S3 2019", "https://rodalinkmalaysia.blogspot.com/2019/02/polygon-strattos-s3-2019.html", "retailer"], ["ChooseMyBicycle — Strattos S3 2019 review", "https://choosemybicycle.com/en/woc/expert-reviews/polygon-strattos-s3-2019-review", "publication"], ["bikes.fan — 2019 Strattos S3 build", "https://bikes.fan/?p=72059", "community"]],
    notes: "Groupset, gearing, frame, fork and brakes agree across a Rodalink (authorised Polygon retailer) listing and a review. Weight left unset because sources disagree.",
  },
  {
    brand: "Polygon", family: "Xquarone", name: "Xquarone EX9", year: 2018, category: "mtb", subcategory: "enduro", status: "discontinued",
    frameMaterial: "Carbon", groupset: "SRAM XX1 Eagle", drivetrain: "1x12", brakes: "SRAM Guide Ultimate hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "27.5\" carbon wheels", tires: null, wheelSize: "27.5", tireClearanceMm: null, suspension: "full", travel: "180 mm front / 180 mm rear", weightKg: null, priceJt: null,
    ridingStyle: "Long-travel enduro and freeride", usage: ["trail", "downhill"], experience: ["advanced"],
    highlights: ["Fox 36 Float Factory fork and Fox Float X2 Factory shock", "Polygon's dual-link long-travel platform"], drawbacks: ["Discontinued — check spare-part availability for the linkage"],
    compat: mtb("27.5", 12, "sram-eagle", { travelMm: 180 }), frameColor: "#3F6212",
    sources: [["Bikewise — Polygon Xquarone EX9 2018", "https://bikewise.io/polygon/xquarone-ex9-2018", "community"], ["99 Spokes — 2018 Polygon Xquarone EX9", "https://99spokes.com/bikes/polygon/2018/xquarone-ex9", "community"], ["bikes.fan — Polygon Xquarone EX9 2018", "https://bikes.fan/polygon-xquarone-ex9-2018/", "community"]],
    notes: "Travel, drivetrain, brakes and suspension agree across three independent spec databases; not yet checked against Polygon's archived spec sheet.",
  },
  {
    brand: "Polygon", family: "Strattos", name: "Strattos S5 Disc", year: 2025, category: "road", subcategory: "all-rounder",
    frameMaterial: "ALX aluminium", groupset: "Shimano 105", drivetrain: "2x11", brakes: "Shimano 105 hydraulic disc", brakeType: "hydraulic-disc",
    wheelset: "Alloy 700c", tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null,
    ridingStyle: "All-round road riding and commuting", usage: ["fitness", "commuting"], experience: ["beginner", "intermediate"],
    highlights: ["Internal cable routing and a full-carbon fork", "Hydraulic disc brakes"], drawbacks: [],
    compat: roadDisc(11, "shimano-road-11"), frameColor: "#E5E7EB",
    sources: [["99 Spokes — 2025 Polygon Strattos S5 Disc", "https://99spokes.com/en-EU/bikes/polygon/2025/strattos-s5-disc", "community"], ["Bums on the Saddle — Strattos S5 Disc listing", "https://bumsonthesaddle.com/products/polygon-strattos-s5-disc-special-edition-white", "retailer"], ["DBYK — Strattos S5 Disc 2025", "https://dbykstore.com/products/polygon-strattos-s5-disc-white-2025", "retailer"]],
    notes: "Frame, fork, groupset and brakes agree across listings. Weight (~9.6 kg) is an aggregator figure and is not shown. No official IDR price was found.",
  },
  { brand: "Polygon", family: "Strattos", name: "Strattos F2", year: 2027, category: "road", subcategory: "all-rounder", frameMaterial: null, groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, sizes: ["S", "M", "L"], ridingStyle: "Road riding", usage: ["fitness"], experience: ["beginner", "intermediate"], compat: {}, frameColor: "#64748B",
    sources: [["Polygon Indonesia — STRATTOS F2 Road Bike 2027", "https://www.polygonbikes.com/id/strattos-f2-road-bike-2027/", "official-website"]], notes: "Model, year and size run (S/M/L) from the official page title and geometry table; components were not available in the indexed page." },
  { brand: "Polygon", family: "Helios", name: "Helios A8", year: 2025, category: "road", subcategory: "aero", frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, sizes: ["XXS", "XS", "S", "M", "L", "XL"], ridingStyle: "Aero road racing", usage: ["racing"], experience: ["intermediate", "advanced"], highlights: ["Polygon quotes a frame of about 800 g", "Polygon claims 31% less drag than the previous generation"], compat: {}, frameColor: "#111827",
    sources: [["Polygon Indonesia — 2025 HELIOS A8 Road Bike", "https://polygonbikes.com/id/sepeda/sepeda-balap/helios-a8", "official-website"], ["Polygon Indonesia — Helios A launch", "https://www.polygonbikes.com/id/launching-road-bike-helios-a-dari-indonesia-untuk-dunia/", "manufacturer-announcement"]], notes: "Frame-weight and drag figures are Polygon's own claims as quoted on the official page." },
  { brand: "Polygon", family: "Collosus", name: "Collosus TE0", year: 2026, category: "electric", subcategory: "e-mtb", frameMaterial: null, groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "full", weightKg: 23.8, priceJt: null, ridingStyle: "Full-power electric trail and enduro", usage: ["trail"], experience: ["intermediate", "advanced"], electric: { motor: "Bosch Performance Line CX (100 Nm)", batteryWh: 800 }, highlights: ["Size M weight 23.8 kg as published by Polygon"], compat: {}, frameColor: "#1F2937",
    sources: [["Polygon Indonesia — COLLOSUS TE0 2026", "https://www.polygonbikes.com/id/sepeda-gunung-electric-collosus-te0-2026/", "official-website"]] },
  { brand: "Polygon", family: "Collosus", name: "Collosus TE8", year: 2026, category: "electric", subcategory: "e-mtb", frameMaterial: "ACX carbon", groupset: "SRAM GX Eagle AXS", drivetrain: "1x12", brakes: null, brakeType: null, wheelset: null, tires: "Maxxis Dissector 29 x 2.40 (tubeless ready)", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "160 mm front (Marzocchi Bomber Z1) / 150 mm rear", weightKg: 23.8, priceJt: null, ridingStyle: "Full-power electric trail and enduro", usage: ["trail"], experience: ["intermediate", "advanced"], electric: { motor: null, batteryWh: null }, highlights: ["Marzocchi Bomber Z1 fork and Bomber Air shock"], compat: mtb("29", 12, "sram-axs", { travelMm: 160 }), frameColor: "#374151",
    sources: [["Polygon Indonesia — Collosus TE8 2026", "https://www.polygonbikes.com/id/sepeda-gunung-electric-collosus-te8-2026/", "official-website"]], notes: "Weight is Polygon's size-M figure stated for both TE0 and TE8. Motor not stated on the indexed TE8 page." },
  { brand: "Polygon", family: "Collosus", name: "Collosus TLE 8 AXS", year: 2026, category: "electric", subcategory: "e-mtb", frameMaterial: null, groupset: "SRAM GX Eagle AXS", drivetrain: "1x12", brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "full", travel: "160 mm front (Marzocchi Bomber Z1)", weightKg: null, priceJt: null, ridingStyle: "Lightweight electric trail riding", usage: ["trail"], experience: ["intermediate", "advanced"], electric: { motor: null, batteryWh: null }, compat: {}, frameColor: "#4B5563",
    sources: [["Polygon Indonesia — COLLOSUS TLE 8 AXS 2026", "https://www.polygonbikes.com/id/collosus-tle-8-axs/", "official-website"]] },
  { brand: "Polygon", family: "Collosus", name: "Collosus TLE 0 AXS", year: 2026, category: "electric", subcategory: "e-mtb", frameMaterial: null, groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "full", travel: "160 mm front (FOX)", weightKg: null, priceJt: null, ridingStyle: "Lightweight electric trail riding", usage: ["trail"], experience: ["intermediate", "advanced"], electric: { motor: "Bosch Performance Line SX (55 Nm)", batteryWh: 400 }, compat: {}, frameColor: "#6B7280",
    sources: [["Polygon Indonesia — COLLOSUS TLE 0 AXS 2026", "https://www.polygonbikes.com/id/collosus-tle-0-axs/", "official-website"]] },
  { brand: "Polygon", family: "Collosus", name: "Collosus DH9", year: 2025, category: "mtb", subcategory: "downhill", frameMaterial: null, groupset: "SRAM X01 DH", drivetrain: "1x7", brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "full", weightKg: null, priceJt: null, ridingStyle: "Downhill racing", usage: ["downhill"], experience: ["advanced"], compat: { speeds: 7, chainrings: 1 }, frameColor: "#0F172A",
    sources: [["Polygon Indonesia — COLLOSUS DH9 2025", "https://www.polygonbikes.com/id/collosus-dh9/", "official-website"]] },
  { brand: "Polygon", family: "Collosus", name: "Collosus DH7", year: 2025, category: "mtb", subcategory: "downhill", frameMaterial: null, groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "full", weightKg: null, priceJt: null, ridingStyle: "Downhill racing", usage: ["downhill"], experience: ["advanced"], compat: {}, frameColor: "#1E293B",
    sources: [["Polygon Indonesia — COLLOSUS DH7 2025", "https://www.polygonbikes.com/id/collosus-dh7/", "official-website"]] },
  { brand: "Polygon", family: "Cascade", name: "Cascade 3", year: 2026, category: "mtb", subcategory: "hardtail", frameMaterial: null, groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "front", weightKg: null, priceJt: null, ridingStyle: "Entry mountain biking", usage: ["trail", "fitness"], experience: ["beginner"], compat: {}, frameColor: "#B91C1C",
    sources: [["Polygon Indonesia — Sepeda Gunung CASCADE 3 2026", "https://www.polygonbikes.com/id/cascade-3-2/", "official-website"]], notes: "The indexed page is titled 2026 but lists an MY25 build — model year needs a reviewer check." },
  { brand: "Polygon", family: "Cascade", name: "Cascade 5", year: 2026, category: "mtb", subcategory: "hardtail", frameMaterial: null, groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "front", weightKg: null, priceJt: null, ridingStyle: "Entry mountain biking", usage: ["trail", "fitness"], experience: ["beginner"], compat: {}, frameColor: "#065F46",
    sources: [["Polygon Indonesia — 2026 CASCADE 5 MTB", "https://www.polygonbikes.com/id/cascade-5/", "official-website"]] },
  { brand: "Polygon", family: "Tambora", name: "Tambora AE GRX", year: 2025, category: "electric", subcategory: "e-gravel", frameMaterial: "Carbon", groupset: "Shimano GRX", drivetrain: null, brakes: "Disc (max 160 mm rotors)", brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: 45, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Assisted speed gravel", usage: ["bikepacking", "fitness"], experience: ["intermediate"], electric: { motor: "Bosch Performance Line SX (55 Nm, assist to 45 km/h as stated)", batteryWh: null }, highlights: ["Max system load 120 kg (Polygon)", "Tyre clearance up to 45c"], compat: { maxTireMm: 45, maxRotorMm: 160 }, frameColor: "#78350F",
    sources: [["Polygon Indonesia — TAMBORA AE GRX Gravel E-Bike 2025", "https://www.polygonbikes.com/id/tambora-ae-grx/", "official-website"]], notes: "The indexed page names the motor as a Bosch Performance Line variant with 55 Nm; the exact motor name needs a reviewer check on the page." },
  { brand: "Polygon", family: "Tambora", name: "Tambora AE GX", year: 2025, category: "electric", subcategory: "e-gravel", frameMaterial: "Carbon", groupset: "SRAM GX", drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: 45, suspension: "rigid", weightKg: null, priceJt: null, sizes: ["S", "M", "L", "XL"], ridingStyle: "Assisted speed gravel", usage: ["bikepacking", "fitness"], experience: ["intermediate"], electric: { motor: null, batteryWh: null }, compat: { maxTireMm: 45 }, frameColor: "#92400E",
    sources: [["Polygon Indonesia — TAMBORA AE GX Gravel E-Bike 2025", "https://www.polygonbikes.com/id/tambora-ae-gx/", "official-website"]] },

  /* ================= SPECIALTY & MISSING SUBCATEGORIES (seed) ================= */
  { brand: "Cervélo", family: "P5", name: "P5", year: 2024, category: "road", subcategory: "time-trial", frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc", wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Time trial and triathlon", usage: ["racing"], experience: ["advanced"], highlights: ["Dedicated aero TT platform"], drawbacks: ["Specialised position — fit required"], compat: {}, frameColor: "#0F172A" },
  { brand: "Giant", family: "Trinity", name: "Trinity Advanced Pro", year: 2024, category: "road", subcategory: "triathlon", frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: "Disc", brakeType: "hydraulic-disc", wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Triathlon", usage: ["racing"], experience: ["advanced"], highlights: ["Triathlon-specific storage and fit"], drawbacks: ["Not UCI-legal for mass-start road races"], compat: {}, frameColor: "#1E293B" },
  { brand: "Fuji", family: "Track", name: "Track", year: 2024, category: "road", subcategory: "track", frameMaterial: "Aluminium", groupset: null, drivetrain: "Single speed (fixed)", brakes: null, brakeType: "none", wheelset: null, tires: "700c", wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Velodrome and fixed-gear", usage: ["racing", "commuting"], experience: ["intermediate"], highlights: ["Simple fixed-gear drivetrain"], drawbacks: ["No brakes in track configuration — illegal on many roads"], compat: { speeds: 1, chainrings: 1 }, frameColor: "#A3A3A3" },
  { brand: "Surly", family: "Ice Cream Truck", name: "Ice Cream Truck", year: 2024, category: "mtb", subcategory: "fat-bike", frameMaterial: "Steel", groupset: null, drivetrain: null, brakes: "Disc", brakeType: "mechanical-disc", wheelset: null, tires: "26 x 4.8", wheelSize: "26", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Sand, snow and soft terrain", usage: ["trail", "touring"], experience: ["intermediate"], highlights: ["Huge flotation tyres"], drawbacks: ["Heavy and slow on pavement"], compat: {}, frameColor: "#7C2D12" },
  { brand: "Commencal", family: "Supreme DH", name: "Supreme DH", year: 2024, category: "mtb", subcategory: "downhill", frameMaterial: "Aluminium", groupset: null, drivetrain: "1x7", brakes: "4-piston hydraulic", brakeType: "hydraulic-disc", wheelset: null, tires: null, wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "200 mm class", weightKg: null, priceJt: null, ridingStyle: "Downhill racing and bike parks", usage: ["downhill"], experience: ["advanced"], highlights: ["Gravity-race geometry"], drawbacks: ["Not for climbing"], compat: {}, frameColor: "#374151" },
  { brand: "Specialized", family: "P.3", name: "P.3", year: 2024, category: "mtb", subcategory: "dirt-jump", frameMaterial: "Aluminium", groupset: null, drivetrain: "Single speed", brakes: "Rear hydraulic disc", brakeType: "hydraulic-disc", wheelset: null, tires: "26\"", wheelSize: "26", tireClearanceMm: null, suspension: "front", weightKg: null, priceJt: null, ridingStyle: "Dirt jump and pump track", usage: ["tricks"], experience: ["intermediate", "advanced"], highlights: ["Strong, compact jump frame"], drawbacks: ["Single purpose"], compat: { speeds: 1 }, frameColor: "#4B5563" },
  { brand: "Specialized", family: "Turbo Creo", name: "Turbo Creo 2 Comp", year: 2024, category: "electric", subcategory: "e-road", frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc", wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Assisted road and gravel", usage: ["fitness", "touring"], experience: ["intermediate"], electric: { motor: null, batteryWh: null }, highlights: ["Light-assist e-road concept"], drawbacks: ["Premium price"], compat: {}, frameColor: "#1F2937" },
  { brand: "Cannondale", family: "Topstone Neo", name: "Topstone Neo Carbon", year: 2024, category: "electric", subcategory: "e-gravel", frameMaterial: "Carbon", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc", wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Assisted gravel adventures", usage: ["bikepacking", "touring"], experience: ["intermediate"], electric: { motor: null, batteryWh: null }, highlights: ["Gravel geometry with assist"], drawbacks: ["Heavier than unassisted gravel bikes"], compat: {}, frameColor: "#3F6212" },
  { brand: "Brompton", family: "Electric", name: "Electric C Line", year: 2024, category: "electric", subcategory: "e-folding", frameMaterial: "Steel", groupset: null, drivetrain: null, brakes: "Rim caliper", brakeType: "rim-caliper", wheelset: "16\" (349)", tires: null, wheelSize: "16", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Assisted multi-modal commuting", usage: ["commuting"], experience: ["beginner", "intermediate"], electric: { motor: null, batteryWh: null }, highlights: ["Brompton fold with assist"], drawbacks: ["Premium price"], compat: {}, frameColor: "#92400E" },
  { brand: "Tern", family: "GSD", name: "GSD", year: 2024, category: "electric", subcategory: "e-cargo", frameMaterial: "Aluminium", groupset: null, drivetrain: null, brakes: "Hydraulic disc", brakeType: "hydraulic-disc", wheelset: null, tires: "20\"", wheelSize: "20", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Compact family and cargo hauling", usage: ["cargo", "commuting"], experience: ["beginner", "intermediate"], electric: { motor: null, batteryWh: null }, highlights: ["Compact longtail footprint"], drawbacks: ["Heavy"], compat: {}, frameColor: "#0369A1" },
  { brand: "Surly", family: "Big Easy", name: "Big Fat Dummy", year: 2024, category: "other", subcategory: "cargo", frameMaterial: "Steel", groupset: null, drivetrain: null, brakes: "Disc", brakeType: "mechanical-disc", wheelset: null, tires: null, wheelSize: "26", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Unassisted longtail cargo", usage: ["cargo"], experience: ["intermediate"], highlights: ["Very high load capacity (manufacturer positioning)"], drawbacks: ["Heavy, unassisted"], compat: {}, frameColor: "#57534E" },
  { brand: "Van Raam", family: "Twinny", name: "Twinny Plus Tandem", year: 2024, category: "other", subcategory: "tandem", frameMaterial: "Aluminium", groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Side-by-side or tandem riding with a companion", usage: ["leisure"], experience: ["beginner"], highlights: ["Adapted riding with a companion"], drawbacks: ["Specialist dealer required"], compat: {}, frameColor: "#2563EB" },
  { brand: "Van Raam", family: "Easy Rider", name: "Easy Rider Tricycle", year: 2024, category: "other", subcategory: "adaptive-bikes", frameMaterial: "Aluminium", groupset: null, drivetrain: null, brakes: null, brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Stable low-step adaptive tricycle", usage: ["leisure", "commuting"], experience: ["beginner"], highlights: ["Low step-in, stable three-wheel platform"], drawbacks: ["Large footprint"], compat: {}, frameColor: "#1D4ED8" },
  { brand: "HP Velotechnik", family: "Scorpion", name: "Scorpion fs 26", year: 2024, category: "other", subcategory: "recumbent", frameMaterial: "Aluminium", groupset: null, drivetrain: null, brakes: "Disc", brakeType: null, wheelset: null, tires: null, wheelSize: null, tireClearanceMm: null, suspension: "full", weightKg: null, priceJt: null, ridingStyle: "Recumbent touring trike", usage: ["touring", "leisure"], experience: ["beginner", "intermediate"], highlights: ["Reclined seated position, three-wheel stability"], drawbacks: ["Specialist dealer required"], compat: {}, frameColor: "#4B5563" },
  { brand: "Woom", family: "Woom", name: "Woom 3", year: 2024, category: "other", subcategory: "kids", frameMaterial: "Aluminium", groupset: null, drivetrain: "Single speed", brakes: "V-brake", brakeType: "v-brake", wheelset: "16\"", tires: null, wheelSize: "16", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "First pedal bike", usage: ["leisure"], experience: ["beginner"], highlights: ["Lightweight kids-specific design"], drawbacks: ["Outgrown quickly"], compat: { speeds: 1 }, frameColor: "#DC2626" },
  { brand: "Strider", family: "Strider", name: "12 Sport", year: 2024, category: "other", subcategory: "balance-bikes", frameMaterial: "Steel", groupset: null, drivetrain: "None (balance bike)", brakes: null, brakeType: "none", wheelset: "12\"", tires: null, wheelSize: "12", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Learning balance before pedalling", usage: ["leisure"], experience: ["beginner"], highlights: ["No pedals — builds balance first"], drawbacks: ["Toddlers only"], compat: {}, frameColor: "#16A34A" },
  { brand: "Electra", family: "Cruiser", name: "Cruiser 1", year: 2024, category: "other", subcategory: "beach-cruisers", frameMaterial: "Aluminium", groupset: null, drivetrain: "Single speed", brakes: "Coaster brake", brakeType: "coaster", wheelset: null, tires: "26 x 2.35", wheelSize: "26", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Relaxed seaside cruising", usage: ["leisure"], experience: ["beginner"], highlights: ["Flat-foot relaxed geometry"], drawbacks: ["Single speed"], compat: { speeds: 1 }, frameColor: "#0EA5E9" },
  { brand: "Specialized", family: "Epic", name: "Epic 8 Comp", year: 2024, category: "mtb", subcategory: "full-suspension", frameMaterial: "Carbon", groupset: null, drivetrain: "1x12", brakes: "Hydraulic disc", brakeType: "hydraulic-disc", wheelset: null, tires: "29\"", wheelSize: "29", tireClearanceMm: null, suspension: "full", travel: "120 mm class", weightKg: null, priceJt: null, ridingStyle: "XC racing", usage: ["racing", "trail"], experience: ["advanced"], highlights: ["Efficient XC full suspension"], drawbacks: ["Premium price"], compat: {}, frameColor: "#111827" },
  { brand: "Kona", family: "Sutra", name: "Sutra", year: 2024, category: "urban", subcategory: "touring", frameMaterial: "Steel", groupset: null, drivetrain: null, brakes: "Disc", brakeType: "mechanical-disc", wheelset: null, tires: null, wheelSize: "700c", tireClearanceMm: null, suspension: "rigid", weightKg: null, priceJt: null, ridingStyle: "Loaded touring", usage: ["touring", "bikepacking"], experience: ["intermediate"], highlights: ["Rack and fender mounts"], drawbacks: ["Heavy"], compat: {}, frameColor: "#A16207" },
];

function toModel(s: Seed): BikeModel {
  const brandId = slugify(s.brand);
  const slug = slugify(`${s.brand}-${s.name}-${s.year}`);
  const { brand: _b, priceJt, status, sizes, highlights, drawbacks, priceHistory, sources, notes, ...rest } = s;
  void _b;
  return {
    ...rest,
    id: slug,
    slug,
    brandId,
    sizes: sizes ?? [],
    highlights: highlights ?? [],
    drawbacks: drawbacks ?? [],
    geometry: null,
    price: priceJt == null ? null : est(jt(priceJt)),
    priceHistory: priceHistory ?? [],
    provenance: sources?.length
      ? { status: status ?? "unverified", sources: sources.map(([label, url, type]) => ({ label, url, type, retrievedAt: "2026-11-16" })), updatedAt: "2026-11-16", confidence: "medium", reviewerNotes: notes ?? "Model existence and listed facts from the cited sources; other specs await the official spec sheet." }
      : status === "discontinued" ? discontinued() : DEMO_PROVENANCE,
  };
}

/** Seed + researched records first, then models imported from official manufacturer pages. */
export const BIKES: BikeModel[] = [...SEEDS.map(toModel), ...OFFICIAL_BIKES, ...PACIFIC_BIKES, ...UNITED_BIKES];
