import type { BrakeType, CompatAttrs, Component, ComponentType, Discipline, Freehub, Tier } from "@/lib/types";
import { DEMO_PROVENANCE, est } from "./provenance";
import { slugify } from "./brands";

/**
 * Seed component catalogue.
 *
 * All values are editorial seed data (status: unverified, prices: VELOX estimates in IDR).
 * Fields we could not substantiate are left null and surface as "Not Available";
 * the compatibility engine reports "Insufficient information" for them instead of guessing.
 */

const jt = (n: number) => Math.round(n * 1_000_000);
const k = (n: number) => n * 1_000;

interface Opts {
  tier: Tier;
  disc: Discipline[];
  g?: number | null;
  idr?: number | null;
  mat?: string | null;
  series?: string | null;
  specs?: Record<string, string | number | null>;
  compat?: CompatAttrs;
  benefits?: string[];
  kit?: Component["kit"];
  priceNote?: string;
}

function c(id: string, type: ComponentType, manufacturer: string, name: string, o: Opts): Component {
  return {
    id,
    type,
    manufacturer,
    manufacturerSlug: slugify(manufacturer),
    name,
    discipline: o.disc,
    tier: o.tier,
    series: o.series ?? null,
    weightG: o.g ?? null,
    material: o.mat ?? null,
    price: o.idr == null ? null : est(o.idr, o.priceNote),
    specs: o.specs ?? {},
    compat: o.compat ?? {},
    kit: o.kit ?? null,
    benefits: o.benefits ?? [],
    imageUrl: null,
    officialUrl: null,
    provenance: DEMO_PROVENANCE,
  };
}

/* ------------------------------------------------------------------ */
/* Groupsets — each expands into individual parts + a kit record       */
/* ------------------------------------------------------------------ */

type Part = [name: string, g: number | null, idr: number | null];

interface GroupsetDef {
  id: string;
  mfr: string;
  name: string;
  series: string;
  disc: Discipline[];
  tier: Tier;
  speeds: number;
  protocol: string;
  electronic: boolean;
  chainrings: number;
  cogRange: string;
  maxCog: number;
  freehub: Freehub;
  spindle?: Component["compat"]["spindle"];
  requiresUDH?: boolean;
  integratedBrakeLever: boolean;
  brake?: { type: BrakeType; mount: "flat-mount" | "post-mount" | "rim-caliper"; rotorMount: "centerlock" | "6-bolt" | null; rotorMm: number | null } | null;
  /** id of an existing standalone brake to use in the kit instead of a bundled one */
  brakeRef?: string;
  chainRef?: string;
  parts: {
    shifters: Part;
    fd?: Part;
    rd: Part;
    crank?: Part & { 3?: string };
    cassette: Part;
    chain?: Part;
    brakes?: Part;
  };
  benefits: string[];
}

const GROUPSETS: GroupsetDef[] = [
  // ---------------- Road — Shimano
  {
    id: "shimano-claris-r2000", mfr: "Shimano", name: "Claris R2000", series: "Claris", disc: ["road"], tier: "entry",
    speeds: 8, protocol: "shimano-road-8", electronic: false, chainrings: 2, cogRange: "11-32", maxCog: 34, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "rim-caliper", mount: "rim-caliper", rotorMount: null, rotorMm: null },
    parts: { shifters: ["ST-R2000 STI levers", 490, k(1300)], fd: ["FD-R2000", 98, k(260)], rd: ["RD-R2000-GS", 290, k(320)], crank: ["FC-R2000 50/34", 870, k(950)], cassette: ["CS-HG50-8 11-32", 330, k(250)], chain: ["CN-HG40", 300, k(150)], brakes: ["BR-R2000 calipers", 380, k(420)] },
    benefits: ["Reliable entry-level road shifting", "Wide gear range for beginners"],
  },
  {
    id: "shimano-sora-r3000", mfr: "Shimano", name: "Sora R3000", series: "Sora", disc: ["road"], tier: "entry",
    speeds: 9, protocol: "shimano-road-9", electronic: false, chainrings: 2, cogRange: "11-34", maxCog: 34, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "rim-caliper", mount: "rim-caliper", rotorMount: null, rotorMm: null },
    parts: { shifters: ["ST-R3000 STI levers", 490, k(1800)], fd: ["FD-R3000", 96, k(330)], rd: ["RD-R3000-GS", 240, k(420)], crank: ["FC-R3000 50/34", 830, k(1250)], cassette: ["CS-HG400-9 11-34", 335, k(300)], chain: ["CN-HG53", 290, k(200)], brakes: ["BR-R3000 calipers", 360, k(600)] },
    benefits: ["Hidden cables and smoother ergonomics than Claris", "9-speed range suits mixed terrain"],
  },
  {
    id: "shimano-tiagra-4700", mfr: "Shimano", name: "Tiagra 4700", series: "Tiagra", disc: ["road"], tier: "mid",
    speeds: 10, protocol: "shimano-tiagra-4700", electronic: false, chainrings: 2, cogRange: "11-34", maxCog: 34, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "rim-caliper", mount: "rim-caliper", rotorMount: null, rotorMm: null },
    parts: { shifters: ["ST-4700 STI levers", 455, k(2300)], fd: ["FD-4700", 93, k(400)], rd: ["RD-4700-GS", 243, k(550)], crank: ["FC-4700 50/34", 776, k(1700)], cassette: ["CS-HG500-10 11-34", 330, k(350)], chain: ["CN-4601", 273, k(300)], brakes: ["BR-4700 calipers", 365, k(700)] },
    benefits: ["10-speed with Shimano's newer road ergonomics", "Uses a unique 4700 pull ratio — pair with 4700 derailleurs"],
  },
  {
    id: "shimano-105-r7000", mfr: "Shimano", name: "105 R7000 (rim)", series: "105", disc: ["road"], tier: "mid",
    speeds: 11, protocol: "shimano-road-11", electronic: false, chainrings: 2, cogRange: "11-32", maxCog: 34, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "rim-caliper", mount: "rim-caliper", rotorMount: null, rotorMm: null },
    parts: { shifters: ["ST-R7000 STI levers", 470, k(2900)], fd: ["FD-R7000", 95, k(450)], rd: ["RD-R7000-GS", 225, k(650)], crank: ["FC-R7000 52/36", 717, k(2200)], cassette: ["CS-R7000 11-32", 284, k(800)], chain: ["CN-HG601", 257, k(400)], brakes: ["BR-R7000 calipers", 370, k(1200)] },
    benefits: ["Race-proven 11-speed shifting", "Strong braking for a rim-brake system"],
  },
  {
    id: "shimano-105-r7100-di2", mfr: "Shimano", name: "105 Di2 R7100", series: "105", disc: ["road"], tier: "performance",
    speeds: 12, protocol: "shimano-di2-12", electronic: true, chainrings: 2, cogRange: "11-34", maxCog: 36, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["ST-R7170 Di2 levers", 600, jt(8.5)], fd: ["FD-R7150 Di2", 125, jt(2.8)], rd: ["RD-R7150 Di2", 262, jt(4.2)], crank: ["FC-R7100 52/36", 754, jt(3.0)], cassette: ["CS-R7100 11-34", 345, jt(1.1)], chain: ["CN-M7100", 252, k(450)], brakes: ["BR-R7170 + RT-CL800 rotors", 560, jt(3.0)] },
    benefits: ["Electronic shifting precision at 105 price", "12-speed range with tight gaps", "Hydraulic disc control in the wet"],
  },
  {
    id: "shimano-ultegra-r8100-di2", mfr: "Shimano", name: "Ultegra Di2 R8100", series: "Ultegra", disc: ["road"], tier: "performance",
    speeds: 12, protocol: "shimano-di2-12", electronic: true, chainrings: 2, cogRange: "11-34", maxCog: 34, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["ST-R8170 Di2 levers", 545, jt(12)], fd: ["FD-R8150 Di2", 111, jt(3.6)], rd: ["RD-R8150 Di2", 262, jt(5.6)], crank: ["FC-R8100 52/36", 698, jt(5.0)], cassette: ["CS-R8100 11-30", 345, jt(2.0)], chain: ["CN-M8100", 252, k(650)], brakes: ["BR-R8170 + RT-CL800 rotors", 520, jt(4.0)] },
    benefits: ["Near Dura-Ace performance", "Faster shifts than 105 Di2", "Lighter crank and cassette"],
  },
  {
    id: "shimano-dura-ace-r9200", mfr: "Shimano", name: "Dura-Ace Di2 R9200", series: "Dura-Ace", disc: ["road"], tier: "pro",
    speeds: 12, protocol: "shimano-di2-12", electronic: true, chainrings: 2, cogRange: "11-30", maxCog: 34, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["ST-R9270 Di2 levers", 500, jt(19)], fd: ["FD-R9250 Di2", 96, jt(5.4)], rd: ["RD-R9250 Di2", 215, jt(8.6)], crank: ["FC-R9200 52/36", 616, jt(9.5)], cassette: ["CS-R9200 11-30", 290, jt(4.6)], chain: ["CN-M9100", 246, jt(1.0)], brakes: ["BR-R9270 + RT-CL900 rotors", 480, jt(6.5)] },
    benefits: ["WorldTour-level shifting speed", "Lowest system weight in the Shimano range"],
  },
  // ---------------- Road — SRAM
  {
    id: "sram-rival-axs", mfr: "SRAM", name: "Rival AXS", series: "Rival", disc: ["road", "gravel"], tier: "performance",
    speeds: 12, protocol: "sram-axs", electronic: true, chainrings: 2, cogRange: "10-36", maxCog: 36, freehub: "XDR", spindle: "DUB",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["Rival eTap AXS HRD levers", 670, jt(8.0)], fd: ["Rival eTap AXS FD", 157, jt(2.6)], rd: ["Rival eTap AXS RD", 365, jt(4.0)], crank: ["Rival AXS DUB 46/33", 846, jt(3.0)], cassette: ["XG-1250 10-36", 390, jt(1.3)], chain: ["Rival Flattop", 252, k(500)], brakes: ["Rival HRD calipers + Paceline rotors", 560, jt(2.8)] },
    benefits: ["Wireless — no frame routing required", "Mix road and MTB AXS parts freely"],
  },
  {
    id: "sram-force-axs", mfr: "SRAM", name: "Force AXS", series: "Force", disc: ["road", "gravel"], tier: "performance",
    speeds: 12, protocol: "sram-axs", electronic: true, chainrings: 2, cogRange: "10-36", maxCog: 36, freehub: "XDR", spindle: "DUB",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["Force AXS HRD levers", 620, jt(13)], fd: ["Force AXS FD", 140, jt(3.6)], rd: ["Force AXS RD", 300, jt(6.0)], crank: ["Force AXS DUB 48/35", 690, jt(5.5)], cassette: ["XG-1270 10-36", 300, jt(3.2)], chain: ["Force Flattop", 250, k(800)], brakes: ["Force HRD calipers + Centerline XR rotors", 520, jt(4.0)] },
    benefits: ["Lighter than Rival with refined lever ergonomics", "Wireless simplicity"],
  },
  {
    id: "sram-red-axs-e1", mfr: "SRAM", name: "Red AXS E1", series: "Red", disc: ["road"], tier: "pro",
    speeds: 12, protocol: "sram-axs", electronic: true, chainrings: 2, cogRange: "10-33", maxCog: 36, freehub: "XDR", spindle: "DUB",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["Red AXS levers", 500, jt(20)], fd: ["Red AXS FD", 130, jt(6.4)], rd: ["Red AXS RD", 260, jt(10)], crank: ["Red AXS DUB 50/37", 520, jt(11)], cassette: ["XG-1290 10-33", 200, jt(6.0)], chain: ["Red Flattop", 240, jt(1.3)], brakes: ["Red calipers + Paceline X rotors", 460, jt(6.0)] },
    benefits: ["SRAM's lightest road groupset", "Premium wireless race shifting"],
  },
  // ---------------- Road — Campagnolo
  {
    id: "campagnolo-chorus-12", mfr: "Campagnolo", name: "Chorus 12 Disc", series: "Chorus", disc: ["road"], tier: "performance",
    speeds: 12, protocol: "campagnolo-12", electronic: false, chainrings: 2, cogRange: "11-34", maxCog: 34, freehub: "Campagnolo", spindle: "Campagnolo-UT",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: null, rotorMm: 160 },
    parts: { shifters: ["Chorus Ergopower 12s HD", null, jt(9.0)], fd: ["Chorus 12s FD", null, jt(1.6)], rd: ["Chorus 12s RD", null, jt(2.8)], crank: ["Chorus UT 48/32", null, jt(4.2)], cassette: ["Chorus 12s 11-34", null, jt(2.4)], chain: ["Chorus 12s chain", null, k(800)], brakes: ["Chorus HD calipers + rotors", null, jt(3.5)] },
    benefits: ["Multi-shift thumb lever", "Distinctive Italian mechanical feel"],
  },
  // ---------------- Gravel
  {
    id: "shimano-grx-rx820-2x", mfr: "Shimano", name: "GRX RX820 2x12", series: "GRX", disc: ["gravel"], tier: "performance",
    speeds: 12, protocol: "shimano-grx-12", electronic: false, chainrings: 2, cogRange: "11-36", maxCog: 36, freehub: "HG-road", spindle: "24mm",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["ST-RX820 levers", 520, jt(7.0)], fd: ["FD-RX820", 110, k(900)], rd: ["RD-RX820", 280, jt(1.4)], crank: ["FC-RX820 48/31", null, jt(2.8)], cassette: ["CS-R8101 11-36", 380, jt(1.9)], chain: ["CN-M8100", 252, k(500)], brakes: ["BR-RX820 + rotors", 560, jt(2.8)] },
    benefits: ["Gravel-specific lever shape for rough terrain", "Low climbing gears with 2x range"],
  },
  {
    id: "sram-apex-xplr-axs", mfr: "SRAM", name: "Apex XPLR AXS 1x", series: "Apex", disc: ["gravel"], tier: "mid",
    speeds: 12, protocol: "sram-axs", electronic: true, chainrings: 1, cogRange: "10-44", maxCog: 44, freehub: "XD", spindle: "DUB",
    integratedBrakeLever: true, brake: { type: "hydraulic-disc", mount: "flat-mount", rotorMount: "centerlock", rotorMm: 160 },
    parts: { shifters: ["Apex eTap AXS HRD levers", 700, jt(6.4)], rd: ["Apex XPLR eTap AXS RD", 380, jt(3.5)], crank: ["Apex DUB Wide 40T", 780, jt(2.5)], cassette: ["XG-1251 10-44", 450, jt(1.3)], chain: ["Apex Flattop", 260, k(400)], brakes: ["Apex HRD calipers + rotors", 580, jt(2.5)] },
    benefits: ["Simple 1x setup — no front derailleur", "Wireless shifting at an accessible price"],
  },
  {
    id: "microshift-advent-x", mfr: "MicroSHIFT", name: "Advent X 1x10", series: "Advent X", disc: ["gravel", "mtb", "urban"], tier: "entry",
    speeds: 10, protocol: "microshift-advent-x", electronic: false, chainrings: 1, cogRange: "11-48", maxCog: 48, freehub: "HG-MTB",
    integratedBrakeLever: false, chainRef: "kmc-x10",
    parts: { shifters: ["Advent X trigger shifter", 115, k(450)], rd: ["Advent X RD", 330, k(750)], cassette: ["Advent X 11-48 cassette", 600, k(650)] },
    benefits: ["Very wide 1x range on a budget", "Affordable replacement parts"],
  },
  {
    id: "ltwoo-r9", mfr: "LTWOO", name: "R9 2x11", series: "R9", disc: ["road"], tier: "entry",
    speeds: 11, protocol: "shimano-road-11", electronic: false, chainrings: 2, cogRange: "11-32", maxCog: 34, freehub: "HG-road",
    integratedBrakeLever: true, brake: { type: "rim-caliper", mount: "rim-caliper", rotorMount: null, rotorMm: null }, chainRef: "kmc-x11",
    parts: { shifters: ["R9 shift levers", null, jt(1.4)], fd: ["R9 front derailleur", null, k(300)], rd: ["R9 rear derailleur", null, k(450)], cassette: ["LTWOO 11-32 cassette", null, k(400)] },
    benefits: ["Low-cost 11-speed option", "Shimano-compatible pull ratio claimed by manufacturer — verify on your setup"],
  },
  {
    id: "sensah-empire-pro", mfr: "Sensah", name: "Empire Pro 2x11", series: "Empire Pro", disc: ["road"], tier: "entry",
    speeds: 11, protocol: "shimano-road-11", electronic: false, chainrings: 2, cogRange: "11-32", maxCog: 34, freehub: "HG-road",
    integratedBrakeLever: true, brake: { type: "rim-caliper", mount: "rim-caliper", rotorMount: null, rotorMm: null }, chainRef: "kmc-x11",
    parts: { shifters: ["Empire Pro levers", null, jt(1.6)], fd: ["Empire Pro FD", null, k(350)], rd: ["Empire Pro RD", null, k(500)], cassette: ["Sensah 11-32 cassette", null, k(400)] },
    benefits: ["Value 11-speed alternative popular in Southeast Asia", "Shimano-compatible pull ratio claimed by manufacturer — verify"],
  },
  // ---------------- MTB — Shimano
  {
    id: "shimano-deore-m6100", mfr: "Shimano", name: "Deore M6100 1x12", series: "Deore", disc: ["mtb"], tier: "mid",
    speeds: 12, protocol: "shimano-mtb-12", electronic: false, chainrings: 1, cogRange: "10-51", maxCog: 51, freehub: "MicroSpline", spindle: "24mm",
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "6-bolt", rotorMm: 180 },
    parts: { shifters: ["SL-M6100 shifter", 120, k(400)], rd: ["RD-M6100-SGS", 320, k(900)], crank: ["FC-M6100 32T", 680, jt(1.5)], cassette: ["CS-M6100 10-51", 620, jt(1.4)], chain: ["CN-M6100", 270, k(300)], brakes: ["BR-M6100 + SM-RT66 rotors", 720, jt(1.6)] },
    benefits: ["12-speed range with proven Deore durability", "Excellent value trail drivetrain"],
  },
  {
    id: "shimano-slx-m7100", mfr: "Shimano", name: "SLX M7100 1x12", series: "SLX", disc: ["mtb"], tier: "mid",
    speeds: 12, protocol: "shimano-mtb-12", electronic: false, chainrings: 1, cogRange: "10-51", maxCog: 51, freehub: "MicroSpline", spindle: "24mm",
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "centerlock", rotorMm: 180 },
    parts: { shifters: ["SL-M7100 shifter", 113, k(650)], rd: ["RD-M7100-SGS", 280, jt(1.6)], crank: ["FC-M7100 32T", 630, jt(2.4)], cassette: ["CS-M7100 10-51", 534, jt(2.0)], chain: ["CN-M7100", 252, k(400)], brakes: ["BR-M7120 4-piston + rotors", 690, jt(3.2)] },
    benefits: ["Lighter than Deore", "4-piston brakes for longer descents"],
  },
  {
    id: "shimano-xt-m8100", mfr: "Shimano", name: "XT M8100 1x12", series: "Deore XT", disc: ["mtb"], tier: "performance",
    speeds: 12, protocol: "shimano-mtb-12", electronic: false, chainrings: 1, cogRange: "10-51", maxCog: 51, freehub: "MicroSpline", spindle: "24mm",
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "centerlock", rotorMm: 180 },
    parts: { shifters: ["SL-M8100 shifter", 110, jt(1.1)], rd: ["RD-M8100-SGS", 270, jt(2.5)], crank: ["FC-M8100 32T", 640, jt(4.2)], cassette: ["CS-M8100 10-51", 470, jt(3.5)], chain: ["CN-M8100", 252, k(600)], brakes: ["BR-M8120 4-piston + rotors", 640, jt(5.0)] },
    benefits: ["Crisp shifting under load", "Benchmark trail braking power"],
  },
  {
    id: "shimano-xtr-m9100", mfr: "Shimano", name: "XTR M9100 1x12", series: "XTR", disc: ["mtb"], tier: "pro",
    speeds: 12, protocol: "shimano-mtb-12", electronic: false, chainrings: 1, cogRange: "10-51", maxCog: 51, freehub: "MicroSpline", spindle: "24mm",
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "centerlock", rotorMm: 180 },
    parts: { shifters: ["SL-M9100 shifter", 100, jt(2.4)], rd: ["RD-M9100-SGS", 220, jt(4.5)], crank: ["FC-M9100 32T", 500, jt(8.5)], cassette: ["CS-M9100 10-51", 367, jt(7.0)], chain: ["CN-M9100", 240, k(900)], brakes: ["BR-M9100 2-piston + rotors", 560, jt(8.0)] },
    benefits: ["Race-level weight savings", "Top-tier mechanical shifting"],
  },
  {
    id: "shimano-altus-m2000", mfr: "Shimano", name: "Altus M2000 3x9", series: "Altus", disc: ["mtb", "urban"], tier: "entry",
    speeds: 9, protocol: "shimano-mtb-9", electronic: false, chainrings: 3, cogRange: "11-36", maxCog: 36, freehub: "HG-MTB", spindle: "square-taper",
    integratedBrakeLever: false, brakeRef: "tektro-md-m280",
    parts: { shifters: ["SL-M2000 shifters (pair)", 300, k(350)], fd: ["FD-M2000 (clamp)", 160, k(200)], rd: ["RD-M2000-SGS", 350, k(300)], crank: ["Altus 3x9 crankset 40/30/22 (square taper)", 900, k(450)], cassette: ["CS-HG201-9 11-36", 470, k(300)], chain: ["CN-HG53", 290, k(200)] },
    benefits: ["Common, inexpensive replacement parts", "Wide 27-gear range for commuting and light trails"],
  },
  {
    id: "shimano-cues-u6000", mfr: "Shimano", name: "CUES U6000 1x11", series: "CUES", disc: ["mtb", "urban", "gravel"], tier: "entry",
    speeds: 11, protocol: "shimano-cues", electronic: false, chainrings: 1, cogRange: "11-50", maxCog: 50, freehub: "HG-MTB",
    integratedBrakeLever: false,
    parts: { shifters: ["SL-U6000 shifter", null, k(400)], rd: ["RD-U6000-11", null, k(900)], cassette: ["CS-LG400 11-50 Linkglide", null, jt(1.1)], chain: ["CN-LG500", null, k(300)] },
    benefits: ["Linkglide durability — cassettes and chains last longer", "Unified ecosystem across 9/10/11-speed"],
  },
  // ---------------- MTB — SRAM
  {
    id: "sram-nx-eagle", mfr: "SRAM", name: "NX Eagle 1x12", series: "NX Eagle", disc: ["mtb"], tier: "entry",
    speeds: 12, protocol: "sram-eagle-mech", electronic: false, chainrings: 1, cogRange: "11-50", maxCog: 50, freehub: "HG-MTB", spindle: "DUB",
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "6-bolt", rotorMm: 180 },
    parts: { shifters: ["NX Eagle trigger", 120, k(350)], rd: ["NX Eagle RD", 325, jt(1.0)], crank: ["NX Eagle DUB 32T", 680, jt(1.4)], cassette: ["PG-1230 11-50", 600, jt(1.2)], chain: ["NX Eagle chain", 270, k(300)], brakes: ["SRAM Level T + rotors", 640, jt(2.0)] },
    benefits: ["12-speed Eagle range on an HG freehub", "Affordable entry into 1x12"],
  },
  {
    id: "sram-gx-eagle", mfr: "SRAM", name: "GX Eagle 1x12", series: "GX Eagle", disc: ["mtb"], tier: "mid",
    speeds: 12, protocol: "sram-eagle-mech", electronic: false, chainrings: 1, cogRange: "10-52", maxCog: 52, freehub: "XD", spindle: "DUB",
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "6-bolt", rotorMm: 180 },
    parts: { shifters: ["GX Eagle trigger", 120, k(700)], rd: ["GX Eagle RD", 290, jt(1.6)], crank: ["GX Eagle DUB 32T", 600, jt(2.5)], cassette: ["XG-1275 10-52", 450, jt(3.0)], chain: ["GX Eagle chain", 250, k(450)], brakes: ["SRAM G2 RS + rotors", 660, jt(3.0)] },
    benefits: ["520% range", "Lighter XD-driver cassette"],
  },
  {
    id: "sram-gx-transmission", mfr: "SRAM", name: "GX Eagle Transmission AXS", series: "Eagle Transmission", disc: ["mtb"], tier: "performance",
    speeds: 12, protocol: "sram-axs", electronic: true, chainrings: 1, cogRange: "10-52", maxCog: 52, freehub: "XD", spindle: "DUB", requiresUDH: true,
    integratedBrakeLever: false, brake: { type: "hydraulic-disc", mount: "post-mount", rotorMount: "6-bolt", rotorMm: 200 },
    parts: { shifters: ["AXS Pod controller", 75, jt(3.0)], rd: ["GX Eagle T-Type AXS RD", 445, jt(7.5)], crank: ["GX Eagle T-Type DUB 32T", 620, jt(3.0)], cassette: ["XS-1275 T-Type 10-52", 450, jt(4.0)], chain: ["Eagle T-Type Flattop", 250, k(650)], brakes: ["SRAM Maven Bronze + rotors", 760, jt(4.5)] },
    benefits: ["Hangerless direct-mount — extremely robust", "Shifts under full load"],
  },
];

function expandGroupset(d: GroupsetDef): Component[] {
  const base = { disc: d.disc, tier: d.tier, series: d.series };
  const out: Component[] = [];
  const kit: Partial<Record<ComponentType, string>> = {};
  const add = (type: ComponentType, part: Part | undefined, compat: CompatAttrs, specs: Record<string, string | number | null> = {}) => {
    if (!part) return;
    const id = `${d.id}-${type}`;
    const partName = part[0].includes(d.series) || part[0].includes(d.mfr) || part[0].startsWith(d.name.split(" ")[0]) ? part[0] : `${d.series} ${part[0]}`;
    out.push(c(id, type, d.mfr, partName, { ...base, g: part[1], idr: part[2], compat, specs: { Speeds: d.speeds, ...specs }, benefits: d.benefits.slice(0, 1) }));
    kit[type] = id;
  };
  const brakeType = d.brake?.type ?? null;
  add("shifters", d.parts.shifters, { speeds: d.speeds, protocol: d.protocol, electronic: d.electronic, chainrings: d.chainrings, brakeType: d.integratedBrakeLever ? brakeType : null }, {
    Actuation: d.electronic ? "Electronic" : "Mechanical",
    "Brake lever": d.integratedBrakeLever ? (brakeType === "hydraulic-disc" ? "Integrated hydraulic" : "Integrated (cable)") : "Separate",
  });
  add("front-derailleur", d.parts.fd, {
    speeds: d.speeds, protocol: d.protocol, electronic: d.electronic, chainrings: d.chainrings,
    frontDerailleurMount: d.parts.fd?.[0].includes("clamp") ? "clamp" : "braze-on",
  });
  add("rear-derailleur", d.parts.rd, { speeds: d.speeds, protocol: d.protocol, electronic: d.electronic, maxCog: d.maxCog, requiresUDH: d.requiresUDH ?? false }, { "Max cog": d.maxCog });
  add("crankset", d.parts.crank, { speeds: d.speeds, chainrings: d.chainrings, spindle: d.spindle ?? null, pedalThread: "9/16" }, { Chainrings: d.chainrings, Spindle: d.spindle ?? null });
  add("cassette", d.parts.cassette, { speeds: d.speeds, freehub: d.freehub, maxCog: Number(d.cogRange.split("-")[1]), cogRange: d.cogRange }, { Range: d.cogRange, Freehub: d.freehub });
  add("chain", d.parts.chain, { speeds: d.speeds }, {});
  if (d.parts.brakes && d.brake) {
    add("brakes", d.parts.brakes, {
      brakeType: d.brake.type, brakeMount: d.brake.mount, rotorMount: d.brake.rotorMount, rotorMm: d.brake.rotorMm,
      brakeInterface: d.brake.type.includes("disc") ? "disc" : "rim",
    }, { Type: d.brake.type, Mount: d.brake.mount, Rotor: d.brake.rotorMm ? `${d.brake.rotorMm} mm` : null });
  }
  if (d.brakeRef) kit.brakes = d.brakeRef;
  if (d.chainRef) kit.chain = d.chainRef;

  const parts = out;
  const sum = (f: (x: Component) => number | null | undefined) => {
    const vals = parts.map(f);
    return vals.every((v) => v != null) ? vals.reduce<number>((a, b) => a + (b ?? 0), 0) : null;
  };
  const groupset = c(d.id, "groupset", d.mfr, d.name, {
    ...base,
    g: sum((x) => x.weightG),
    idr: sum((x) => x.price?.amount),
    priceNote: "Sum of listed kit parts",
    compat: { speeds: d.speeds, protocol: d.protocol, electronic: d.electronic, chainrings: d.chainrings, brakeType, freehub: d.freehub, spindle: d.spindle ?? null, requiresUDH: d.requiresUDH ?? false },
    specs: {
      Speeds: d.speeds,
      Drivetrain: `${d.chainrings}x${d.speeds}`,
      Actuation: d.electronic ? "Electronic" : "Mechanical",
      Range: d.cogRange,
      Brakes: brakeType ?? "Not included",
      Freehub: d.freehub,
    },
    kit,
    benefits: d.benefits,
  });
  return [groupset, ...parts];
}

/* ------------------------------------------------------------------ */
/* Frames & forks                                                      */
/* ------------------------------------------------------------------ */

const FRAMES: Component[] = [
  c("frame-specialized-tarmac-sl8", "frame", "Specialized", "S-Works Tarmac SL8 Frameset", {
    tier: "pro", disc: ["road"], g: 685, idr: jt(88), mat: "FACT 12r carbon",
    specs: { Size: "56 (weight reference)", Routing: "Fully internal", "Seatpost": "Proprietary aero" },
    compat: { bbStandard: "BSA-68", brakeMount: "flat-mount", brakeInterface: "disc", rearAxle: "12x142", wheelSizes: ["700c"], maxTireMm: 32, seatpostDiameter: "aero:tarmac-sl8", steerer: "tapered", drivetrainSupport: ["electronic-wired", "electronic-wireless"], frontDerailleurMount: "braze-on", udh: null, maxRotorMm: 160 },
    benefits: ["Race-weight aero frame", "Threaded BB for quiet, serviceable bearings"],
  }),
  c("frame-giant-tcr-advanced-pro", "frame", "Giant", "TCR Advanced Pro Frameset", {
    tier: "performance", disc: ["road"], g: 850, idr: jt(42), mat: "Advanced-grade composite",
    compat: { bbStandard: "BB86", brakeMount: "flat-mount", brakeInterface: "disc", rearAxle: "12x142", wheelSizes: ["700c"], maxTireMm: 33, seatpostDiameter: "aero:giant-dfuse", steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"], frontDerailleurMount: "braze-on", udh: null, maxRotorMm: 160 },
    benefits: ["Stiff, light climbing frame", "Supports both mechanical and electronic groupsets"],
  }),
  c("frame-cannondale-caad13-disc", "frame", "Cannondale", "CAAD13 Disc Frameset", {
    tier: "mid", disc: ["road"], g: 1180, idr: jt(18), mat: "SmartForm C1 alloy",
    compat: { bbStandard: "BB30", brakeMount: "flat-mount", brakeInterface: "disc", rearAxle: "12x142", wheelSizes: ["700c"], maxTireMm: 30, seatpostDiameter: null, steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"], frontDerailleurMount: "braze-on", udh: null, maxRotorMm: 160 },
    benefits: ["Race-ready alloy at a fraction of carbon pricing"],
  }),
  c("frame-specialized-allez-rim", "frame", "Specialized", "Allez E5 Frameset (rim brake)", {
    tier: "entry", disc: ["road"], g: 1250, idr: jt(8), mat: "E5 Premium aluminium",
    compat: { bbStandard: "BSA-68", brakeMount: "rim-caliper", brakeInterface: "rim", rearAxle: "130QR", wheelSizes: ["700c"], maxTireMm: 28, seatpostDiameter: "27.2", steerer: "tapered", drivetrainSupport: ["mechanical"], frontDerailleurMount: "braze-on", udh: false },
    benefits: ["Simple rim-brake platform for budget builds"],
  }),
  c("frame-canyon-ultimate-cf-sl", "frame", "Canyon", "Ultimate CF SL Frameset", {
    tier: "performance", disc: ["road"], g: null, idr: jt(30), mat: "Carbon",
    compat: { bbStandard: "PF86", brakeMount: "flat-mount", brakeInterface: "disc", rearAxle: "12x142", wheelSizes: ["700c"], maxTireMm: 30, seatpostDiameter: null, steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"], frontDerailleurMount: "braze-on", udh: null, maxRotorMm: 160 },
    benefits: ["All-rounder race geometry"],
  }),
  c("frame-specialized-crux", "frame", "Specialized", "Crux Frameset", {
    tier: "performance", disc: ["gravel"], g: 825, idr: jt(50), mat: "FACT 10r carbon",
    compat: { bbStandard: "BSA-68", brakeMount: "flat-mount", brakeInterface: "disc", rearAxle: "12x142", wheelSizes: ["700c", "650b"], maxTireMm: 47, seatpostDiameter: "27.2", steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"], frontDerailleurMount: "braze-on", udh: null, maxRotorMm: 160 },
    benefits: ["Featherweight gravel race frame", "Clears 47 mm tyres"],
  }),
  c("frame-salsa-cutthroat", "frame", "Salsa", "Cutthroat Carbon Frameset", {
    tier: "performance", disc: ["gravel", "mtb"], g: null, idr: jt(40), mat: "Carbon",
    compat: { bbStandard: "BSA-68", brakeMount: "flat-mount", brakeInterface: "disc", rearAxle: "12x142", wheelSizes: ["29", "700c"], maxTireMm: 61, seatpostDiameter: "27.2", steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wired", "electronic-wireless"], frontDerailleurMount: "braze-on", udh: null, maxRotorMm: 160 },
    benefits: ["Ultra-distance bikepacking geometry", "Takes 29 x 2.4 in tyres"],
  }),
  c("frame-santa-cruz-hightower", "frame", "Santa Cruz", "Hightower Carbon CC Frameset", {
    tier: "pro", disc: ["mtb"], g: 2900, idr: jt(70), mat: "Carbon CC", specs: { Travel: "145 mm rear", Note: "Weight includes shock" },
    compat: { bbStandard: "BSA-73", brakeMount: "post-mount", brakeInterface: "disc", rearAxle: "12x148", wheelSizes: ["29"], maxTireMm: 66, seatpostDiameter: "34.9", steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wireless"], frontDerailleurMount: "none", udh: true, maxRotorMm: 220, travelMm: 145 },
    benefits: ["Do-it-all 29er trail frame", "UDH — ready for SRAM Transmission"],
  }),
  c("frame-santa-cruz-chameleon", "frame", "Santa Cruz", "Chameleon AL Frameset", {
    tier: "mid", disc: ["mtb"], g: 2100, idr: jt(15), mat: "Aluminium", specs: { Type: "Hardtail" },
    compat: { bbStandard: "BSA-73", brakeMount: "post-mount", brakeInterface: "disc", rearAxle: "12x148", wheelSizes: ["29", "27.5"], maxTireMm: 66, seatpostDiameter: "31.6", steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wireless"], frontDerailleurMount: "none", udh: true, maxRotorMm: 203 },
    benefits: ["Versatile hardtail — 29 or mixed wheels"],
  }),
  c("frame-kona-honzo-st", "frame", "Kona", "Honzo ST Frameset", {
    tier: "mid", disc: ["mtb"], g: null, idr: jt(12), mat: "Reynolds steel", specs: { Type: "Hardtail" },
    compat: { bbStandard: "BSA-73", brakeMount: "post-mount", brakeInterface: "disc", rearAxle: "12x148", wheelSizes: ["29"], maxTireMm: 66, seatpostDiameter: "31.6", steerer: "tapered", drivetrainSupport: ["mechanical", "electronic-wireless"], frontDerailleurMount: "none", udh: null },
    benefits: ["Playful steel hardtail ride quality"],
  }),
  c("frame-surly-bridge-club", "frame", "Surly", "Bridge Club Frameset", {
    tier: "entry", disc: ["urban", "gravel"], g: null, idr: jt(9), mat: "4130 chromoly steel", specs: { Type: "All-road / touring" },
    compat: { bbStandard: "BSA-68", brakeMount: "post-mount", brakeInterface: "disc", rearAxle: "135QR", wheelSizes: ["700c", "27.5"], maxTireMm: 47, seatpostDiameter: "27.2", steerer: "straight-1-1/8", drivetrainSupport: ["mechanical"], frontDerailleurMount: "clamp", udh: false },
    benefits: ["Rack and fender mounts everywhere", "Runs triple cranks for loaded touring"],
  }),
  c("frame-wethepeople-battleship", "frame", "WeThePeople", "Battleship Frame", {
    tier: "mid", disc: ["bmx"], g: 2200, idr: jt(7.5), mat: "4130 chromoly", specs: { "Top tube": "Available in multiple lengths" },
    compat: { bbStandard: "Mid-BMX", brakeMount: "none", brakeInterface: "none", rearAxle: "14mm-BMX", wheelSizes: ["20"], maxTireMm: 61, seatpostDiameter: "25.4", steerer: "straight-1-1/8", drivetrainSupport: ["mechanical"], frontDerailleurMount: "none", udh: false },
    benefits: ["Street-ready brakeless BMX frame"],
  }),
];

const included = "Included with frameset";
const FORKS: Component[] = [
  c("fork-tarmac-sl8", "fork", "Specialized", "Tarmac SL8 Fork", { tier: "pro", disc: ["road"], g: 380, idr: 0, priceNote: included, mat: "Carbon", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "12x100", brakeMount: "flat-mount", brakeInterface: "disc", wheelSizes: ["700c"], maxTireMm: 32 } }),
  c("fork-giant-tcr", "fork", "Giant", "TCR Advanced Fork", { tier: "performance", disc: ["road"], g: 380, idr: 0, priceNote: included, mat: "Carbon", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "12x100", brakeMount: "flat-mount", brakeInterface: "disc", wheelSizes: ["700c"], maxTireMm: 33 } }),
  c("fork-caad13", "fork", "Cannondale", "CAAD13 Disc Fork", { tier: "mid", disc: ["road"], g: null, idr: 0, priceNote: included, mat: "Carbon", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "12x100", brakeMount: "flat-mount", brakeInterface: "disc", wheelSizes: ["700c"], maxTireMm: 30 } }),
  c("fork-allez-rim", "fork", "Specialized", "Allez Rim-brake Fork", { tier: "entry", disc: ["road"], g: null, idr: 0, priceNote: included, mat: "Carbon blades, alloy steerer", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "100QR", brakeMount: "rim-caliper", brakeInterface: "rim", wheelSizes: ["700c"], maxTireMm: 28 } }),
  c("fork-ultimate-cf-sl", "fork", "Canyon", "Ultimate CF SL Fork", { tier: "performance", disc: ["road"], g: null, idr: 0, priceNote: included, mat: "Carbon", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "12x100", brakeMount: "flat-mount", brakeInterface: "disc", wheelSizes: ["700c"], maxTireMm: 30 } }),
  c("fork-crux", "fork", "Specialized", "Crux Fork", { tier: "performance", disc: ["gravel"], g: null, idr: 0, priceNote: included, mat: "Carbon", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "12x100", brakeMount: "flat-mount", brakeInterface: "disc", wheelSizes: ["700c", "650b"], maxTireMm: 47 } }),
  c("fork-salsa-waxwing", "fork", "Salsa", "Waxwing Carbon Fork", { tier: "performance", disc: ["gravel"], g: null, idr: 0, priceNote: included, mat: "Carbon", compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "12x100", brakeMount: "flat-mount", brakeInterface: "disc", wheelSizes: ["29", "700c"], maxTireMm: 61 } }),
  c("fork-surly-bridge-club", "fork", "Surly", "Bridge Club Fork", { tier: "entry", disc: ["urban", "gravel"], g: null, idr: 0, priceNote: included, mat: "4130 steel", compat: { steerer: "straight-1-1/8", steererTopMm: 28.6, frontAxle: "100QR", brakeMount: "post-mount", brakeInterface: "disc", wheelSizes: ["700c", "27.5"], maxTireMm: 47 } }),
  c("fork-rockshox-sid-sl-ultimate", "fork", "RockShox", "SID SL Ultimate 100 mm", { tier: "pro", disc: ["mtb"], g: 1350, idr: jt(14), mat: "Magnesium lowers, aluminium stanchions", specs: { Travel: "100 mm", Damper: "Charger Race Day 2" }, compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "15x110", brakeMount: "post-mount", brakeInterface: "disc", wheelSizes: ["29"], maxTireMm: 61, travelMm: 100 }, benefits: ["XC race-weight suspension"] }),
  c("fork-rockshox-pike-ultimate", "fork", "RockShox", "Pike Ultimate 140 mm", { tier: "performance", disc: ["mtb"], g: 1800, idr: jt(15), specs: { Travel: "140 mm", Damper: "Charger 3" }, compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "15x110", brakeMount: "post-mount", brakeInterface: "disc", wheelSizes: ["29"], maxTireMm: 66, travelMm: 140 }, benefits: ["Trail benchmark — supple and controlled"] }),
  c("fork-fox-36-factory", "fork", "Fox", "36 Factory GRIP X2 160 mm", { tier: "pro", disc: ["mtb"], g: 2000, idr: jt(20), specs: { Travel: "160 mm" }, compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "15x110", brakeMount: "post-mount", brakeInterface: "disc", wheelSizes: ["29"], maxTireMm: 66, travelMm: 160 }, benefits: ["Enduro-grade damping control"] }),
  c("fork-fox-34-performance", "fork", "Fox", "34 Performance 130 mm", { tier: "mid", disc: ["mtb"], g: 1750, idr: jt(11), specs: { Travel: "130 mm" }, compat: { steerer: "tapered", steererTopMm: 28.6, frontAxle: "15x110", brakeMount: "post-mount", brakeInterface: "disc", wheelSizes: ["29"], maxTireMm: 61, travelMm: 130 } }),
  c("fork-suntour-xcr-32", "fork", "SR Suntour", "XCR 32 Air 100 mm (QR)", { tier: "entry", disc: ["mtb", "urban"], g: 2100, idr: jt(2.8), specs: { Travel: "100 mm" }, compat: { steerer: "straight-1-1/8", steererTopMm: 28.6, frontAxle: "100QR", brakeMount: "post-mount", brakeInterface: "disc", wheelSizes: ["29"], maxTireMm: 57, travelMm: 100 }, benefits: ["Affordable air-sprung upgrade over coil forks"] }),
  c("fork-odyssey-f32", "fork", "Odyssey", "F32 BMX Fork", { tier: "mid", disc: ["bmx"], g: null, idr: jt(2.6), mat: "4130 chromoly", compat: { steerer: "straight-1-1/8", steererTopMm: 28.6, frontAxle: "10x100-BMX", brakeMount: "none", brakeInterface: "none", wheelSizes: ["20"], maxTireMm: 61 } }),
];

/* ------------------------------------------------------------------ */
/* Wheels & tyres                                                      */
/* ------------------------------------------------------------------ */

const discRoad = { frontAxle: "12x100", rearAxle: "12x142", brakeInterface: "disc" as const };
const WHEELS: Component[] = [
  c("wheel-zipp-303-firecrest", "wheelset", "Zipp", "303 Firecrest Tubeless Disc", { tier: "performance", disc: ["road", "gravel"], g: 1530, idr: jt(28), mat: "Carbon", specs: { Depth: "40 mm", "Internal width": "25 mm" }, compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR"], rotorMount: "centerlock", tubeless: true, internalRimMm: 25 }, benefits: ["Wide hookless rim for lower-pressure speed", "Light carbon all-rounder"] }),
  c("wheel-dt-swiss-arc-1400-50", "wheelset", "DT Swiss", "ARC 1400 DICUT 50 Disc", { tier: "pro", disc: ["road"], g: 1560, idr: jt(35), mat: "Carbon", specs: { Depth: "50 mm", "Internal width": "20 mm" }, compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR", "Campagnolo"], rotorMount: "centerlock", tubeless: true, internalRimMm: 20 }, benefits: ["Aero gains at sustained speed", "Ratchet EXP hub reliability"] }),
  c("wheel-enve-ses-4-5", "wheelset", "ENVE", "SES 4.5", { tier: "pro", disc: ["road"], g: 1450, idr: jt(45), mat: "Carbon", specs: { Depth: "50/56 mm" }, compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR"], rotorMount: "centerlock", tubeless: true, internalRimMm: 25 }, benefits: ["Premium aero wheelset"] }),
  c("wheel-elitewheels-drive-50d", "wheelset", "Elitewheels", "Drive 50D", { tier: "mid", disc: ["road"], g: 1460, idr: jt(9.5), mat: "Carbon", specs: { Depth: "50 mm" }, compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR"], rotorMount: "centerlock", tubeless: true, internalRimMm: 21 }, benefits: ["Carbon aero performance at a value price"] }),
  c("wheel-ican-aero-50-disc", "wheelset", "ICAN", "Aero 50 Disc", { tier: "mid", disc: ["road"], g: null, idr: jt(7), mat: "Carbon", compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR"], rotorMount: "centerlock", tubeless: true, internalRimMm: null } }),
  c("wheel-hunt-4-season-aero-disc", "wheelset", "Hunt", "4 Season Aero Disc", { tier: "mid", disc: ["road", "gravel"], g: 1650, idr: jt(9), mat: "Aluminium", compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR", "Campagnolo"], rotorMount: "centerlock", tubeless: true, internalRimMm: 19 }, benefits: ["Durable alloy rims for year-round riding"] }),
  c("wheel-fulcrum-racing-4-db", "wheelset", "Fulcrum", "Racing 4 DB", { tier: "mid", disc: ["road"], g: 1790, idr: jt(6), mat: "Aluminium", compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR", "Campagnolo"], rotorMount: "centerlock", tubeless: true, internalRimMm: 19 } }),
  c("wheel-novatec-r3-disc", "wheelset", "Novatec", "R3 Disc", { tier: "mid", disc: ["road"], g: null, idr: jt(5), mat: "Aluminium", compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road"], rotorMount: "centerlock", tubeless: null, internalRimMm: null } }),
  c("wheel-shimano-wh-rs171", "wheelset", "Shimano", "WH-RS171 Disc", { tier: "entry", disc: ["road"], g: 1900, idr: jt(3), mat: "Aluminium", compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road"], rotorMount: "centerlock", tubeless: false, internalRimMm: 17 } }),
  c("wheel-shimano-wh-rs100", "wheelset", "Shimano", "WH-RS100 (rim brake)", { tier: "entry", disc: ["road"], g: 1900, idr: jt(1.6), mat: "Aluminium", compat: { frontAxle: "100QR", rearAxle: "130QR", brakeInterface: "rim", wheelSize: "700c", freehubOptions: ["HG-road"], rotorMount: null, tubeless: false, internalRimMm: 15 } }),
  c("wheel-fulcrum-racing-5", "wheelset", "Fulcrum", "Racing 5 (rim brake)", { tier: "mid", disc: ["road"], g: 1645, idr: jt(3.8), mat: "Aluminium", compat: { frontAxle: "100QR", rearAxle: "130QR", brakeInterface: "rim", wheelSize: "700c", freehubOptions: ["HG-road", "Campagnolo"], rotorMount: null, tubeless: false, internalRimMm: 17 }, benefits: ["Noticeably lighter than stock rim-brake wheels"] }),
  c("wheel-vision-team-30", "wheelset", "Vision", "Team 30 (rim brake)", { tier: "entry", disc: ["road"], g: 1795, idr: jt(3), mat: "Aluminium", compat: { frontAxle: "100QR", rearAxle: "130QR", brakeInterface: "rim", wheelSize: "700c", freehubOptions: ["HG-road"], rotorMount: null, tubeless: false, internalRimMm: 17 } }),
  c("wheel-mavic-aksium-disc", "wheelset", "Mavic", "Aksium Disc", { tier: "entry", disc: ["road", "gravel", "urban"], g: 1890, idr: jt(3.5), mat: "Aluminium", compat: { frontAxle: "12x100|100QR", rearAxle: "12x142|135QR", brakeInterface: "disc", wheelSize: "700c", freehubOptions: ["HG-road"], rotorMount: "centerlock", tubeless: false, internalRimMm: 19 }, benefits: ["Convertible axles fit older and newer frames"] }),
  c("wheel-dt-swiss-gr1600-700c", "wheelset", "DT Swiss", "GR 1600 Spline 25 (700c)", { tier: "mid", disc: ["gravel"], g: 1700, idr: jt(8.5), mat: "Aluminium", compat: { ...discRoad, wheelSize: "700c", freehubOptions: ["HG-road", "XDR", "XD", "MicroSpline"], rotorMount: "centerlock", tubeless: true, internalRimMm: 24 }, benefits: ["Tough gravel rims with wide tyre support"] }),
  c("wheel-dt-swiss-gr1600-650b", "wheelset", "DT Swiss", "GR 1600 Spline 25 (650b)", { tier: "mid", disc: ["gravel"], g: 1600, idr: jt(8.5), mat: "Aluminium", compat: { ...discRoad, wheelSize: "650b", freehubOptions: ["HG-road", "XDR", "XD", "MicroSpline"], rotorMount: "centerlock", tubeless: true, internalRimMm: 24 } }),
  c("wheel-dt-swiss-xm1700-29", "wheelset", "DT Swiss", "XM 1700 Spline 30 (29)", { tier: "mid", disc: ["mtb"], g: 1850, idr: jt(10), mat: "Aluminium", compat: { frontAxle: "15x110", rearAxle: "12x148", brakeInterface: "disc", wheelSize: "29", freehubOptions: ["HG-MTB", "XD", "MicroSpline"], rotorMount: "centerlock", tubeless: true, internalRimMm: 30 }, benefits: ["Trail-tough alloy with quick engagement"] }),
  c("wheel-zipp-3zero-moto-29", "wheelset", "Zipp", "3Zero Moto (29)", { tier: "pro", disc: ["mtb"], g: 1900, idr: jt(30), mat: "Carbon", compat: { frontAxle: "15x110", rearAxle: "12x148", brakeInterface: "disc", wheelSize: "29", freehubOptions: ["HG-MTB", "XD", "MicroSpline"], rotorMount: "6-bolt", tubeless: true, internalRimMm: 30 }, benefits: ["Compliant carbon rims that track the ground"] }),
  c("wheel-dt-swiss-m1900-27", "wheelset", "DT Swiss", "M 1900 Spline 30 (27.5)", { tier: "entry", disc: ["mtb"], g: 1900, idr: jt(7), mat: "Aluminium", compat: { frontAxle: "15x110", rearAxle: "12x148", brakeInterface: "disc", wheelSize: "27.5", freehubOptions: ["HG-MTB", "XD", "MicroSpline"], rotorMount: "6-bolt", tubeless: true, internalRimMm: 30 } }),
  c("wheel-dt-swiss-m1900-29", "wheelset", "DT Swiss", "M 1900 Spline 30 (29)", { tier: "entry", disc: ["mtb"], g: 1980, idr: jt(7), mat: "Aluminium", compat: { frontAxle: "15x110", rearAxle: "12x148", brakeInterface: "disc", wheelSize: "29", freehubOptions: ["HG-MTB", "XD", "MicroSpline"], rotorMount: "6-bolt", tubeless: true, internalRimMm: 30 } }),
  c("wheel-odyssey-hazard-lite", "wheelset", "Odyssey", "Hazard Lite 20\" Wheelset (cassette)", { tier: "mid", disc: ["bmx"], g: null, idr: jt(3.2), mat: "Aluminium", compat: { frontAxle: "10x100-BMX", rearAxle: "14mm-BMX", brakeInterface: "rim", wheelSize: "20", freehubOptions: ["Driver-BMX"], rotorMount: null, tubeless: false, internalRimMm: null } }),
];

const tire = (id: string, mfr: string, name: string, size: Component["compat"]["wheelSize"], width: number, tubeless: boolean, g: number | null, idr: number, tier: Tier, disc: Discipline[], benefits: string[] = []) =>
  c(id, "tires", mfr, name, { tier, disc, g, idr, priceNote: "Pair", specs: { Size: `${size} x ${width} mm`, Tubeless: tubeless ? "Yes" : "No", "Weight basis": g ? "Listed weight is for the pair" : null }, compat: { wheelSize: size, tireWidthMm: width, tubeless }, benefits });

const TIRES: Component[] = [
  tire("tire-conti-gp5000str-28", "Continental", "Grand Prix 5000 S TR 700x28", "700c", 28, true, 580, jt(2.6), "performance", ["road"], ["Low rolling resistance", "Excellent wet grip"]),
  tire("tire-conti-gp5000str-32", "Continental", "Grand Prix 5000 S TR 700x32", "700c", 32, true, 680, jt(2.6), "performance", ["road", "gravel"], ["Comfort of 32 mm with race-tyre speed"]),
  tire("tire-pirelli-pzero-race-tlr-28", "Pirelli", "P Zero Race TLR 700x28", "700c", 28, true, 590, jt(2.4), "performance", ["road"], ["Supple, fast tubeless casing"]),
  tire("tire-vittoria-corsa-next-28", "Vittoria", "Corsa N.EXT 700x28", "700c", 28, true, 600, jt(2.0), "performance", ["road"], ["Durable everyday race tyre"]),
  tire("tire-schwalbe-pro-one-30", "Schwalbe", "Pro One TLE 700x30", "700c", 30, true, 620, jt(2.4), "performance", ["road"]),
  tire("tire-michelin-power-cup-28", "Michelin", "Power Cup TLR 700x28", "700c", 28, true, 580, jt(2.2), "performance", ["road"]),
  tire("tire-conti-ultra-sport-3-25", "Continental", "Ultra Sport III 700x25", "700c", 25, false, 560, k(600), "entry", ["road"], ["Durable budget training tyre"]),
  tire("tire-cst-road-25", "CST", "Road tyre 700x25", "700c", 25, false, null, k(350), "entry", ["road"]),
  tire("tire-chaoyang-road-25", "Chaoyang", "Road tyre 700x25", "700c", 25, false, null, k(300), "entry", ["road"]),
  tire("tire-kenda-kwest-35", "Kenda", "Kwest 700x35", "700c", 35, false, null, k(400), "entry", ["urban"]),
  tire("tire-schwalbe-g-one-rs-40", "Schwalbe", "G-One RS 700x40", "700c", 40, true, 900, jt(2.0), "performance", ["gravel"], ["Fast-rolling gravel race tread"]),
  tire("tire-pirelli-cinturato-gravel-h-45", "Pirelli", "Cinturato Gravel H 700x45", "700c", 45, true, 1100, jt(2.0), "mid", ["gravel"], ["Volume and grip for loose surfaces"]),
  tire("tire-vittoria-terreno-dry-38", "Vittoria", "Terreno Dry 700x38", "700c", 38, true, 860, jt(1.6), "mid", ["gravel"]),
  tire("tire-maxxis-rambler-40", "Maxxis", "Rambler EXO TR 700x40", "700c", 40, true, 940, jt(1.6), "mid", ["gravel"]),
  tire("tire-irc-boken-40", "IRC", "Boken 700x40", "700c", 40, true, null, jt(1.6), "mid", ["gravel"]),
  tire("tire-maxxis-dhf-29-25", "Maxxis", "Minion DHF 29x2.5 WT EXO+", "29", 63, true, 2200, jt(2.6), "performance", ["mtb"], ["Predictable cornering grip"]),
  tire("tire-maxxis-rekon-29-24", "Maxxis", "Rekon 29x2.4 WT EXO", "29", 61, true, 1700, jt(2.2), "mid", ["mtb"], ["Fast-rolling trail tread"]),
  tire("tire-schwalbe-racing-ray-29-225", "Schwalbe", "Racing Ray 29x2.25", "29", 57, true, 1360, jt(2.0), "performance", ["mtb"], ["Light XC race tyre"]),
  tire("tire-conti-kryptotal-29-24", "Continental", "Kryptotal-Fr 29x2.4 Enduro", "29", 61, true, 2400, jt(2.6), "performance", ["mtb"]),
  tire("tire-kenda-booster-29-22", "Kenda", "Booster 29x2.2", "29", 56, true, null, jt(1.2), "entry", ["mtb"]),
  tire("tire-maxxis-ardent-275-225", "Maxxis", "Ardent 27.5x2.25", "27.5", 57, true, 1400, jt(1.5), "mid", ["mtb"]),
  tire("tire-schwalbe-nobby-nic-275-24", "Schwalbe", "Nobby Nic 27.5x2.4", "27.5", 61, true, 1500, jt(1.8), "mid", ["mtb"]),
  tire("tire-schwalbe-marathon-plus-35", "Schwalbe", "Marathon Plus 700x35", "700c", 35, false, 1800, jt(1.4), "mid", ["urban"], ["Near-puncture-proof commuting"]),
  tire("tire-schwalbe-big-apple-20", "Schwalbe", "Big Apple 20x2.15", "20", 55, false, null, k(900), "mid", ["urban"], ["Balloon comfort for folding bikes"]),
  tire("tire-odyssey-path-pro-20", "Odyssey", "Path Pro 20x2.4", "20", 61, false, null, k(900), "mid", ["bmx"]),
];

/* ------------------------------------------------------------------ */
/* Standalone drivetrain parts & brakes                                */
/* ------------------------------------------------------------------ */

const EXTRA_DRIVETRAIN: Component[] = [
  c("kmc-x10", "chain", "KMC", "X10 chain", { tier: "mid", disc: ["universal"], g: 260, idr: k(250), compat: { speeds: 10 }, specs: { Speeds: 10 } }),
  c("kmc-x11", "chain", "KMC", "X11 chain", { tier: "mid", disc: ["universal"], g: 255, idr: k(350), compat: { speeds: 11 }, specs: { Speeds: 11 } }),
  c("kmc-x12", "chain", "KMC", "X12 chain", { tier: "mid", disc: ["universal"], g: 250, idr: k(550), compat: { speeds: 12 }, specs: { Speeds: 12 } }),
  c("kmc-z8", "chain", "KMC", "Z8.3 chain", { tier: "entry", disc: ["universal"], g: 330, idr: k(120), compat: { speeds: 8 }, specs: { Speeds: "6/7/8" } }),
  c("kmc-z510hx", "chain", "KMC", "Z510HX BMX chain (1/8\")", { tier: "entry", disc: ["bmx"], g: null, idr: k(150), compat: { speeds: 1 }, specs: { Speeds: "Single speed" } }),
  c("odyssey-thunderbolt-crank", "crankset", "Odyssey", "Thunderbolt+ BMX crank", { tier: "mid", disc: ["bmx"], g: null, idr: jt(2.9), compat: { speeds: 1, chainrings: 1, spindle: "22mm-BMX", pedalThread: "9/16" }, specs: { Type: "3-piece", Spindle: "22 mm" } }),
];

const BRAKES: Component[] = [
  c("tektro-md-m280", "brakes", "Tektro", "MD-M280 mechanical disc (pair, with levers)", { tier: "entry", disc: ["mtb", "urban"], g: null, idr: k(450), compat: { brakeType: "mechanical-disc", brakeMount: "post-mount", brakeInterface: "disc", rotorMount: "6-bolt", rotorMm: 160 }, specs: { Type: "Mechanical disc", Mount: "Post-mount" } }),
  c("trp-spyre-flat", "brakes", "TRP", "Spyre flat-mount mechanical disc (pair)", { tier: "mid", disc: ["road", "gravel"], g: 300, idr: jt(1.6), compat: { brakeType: "mechanical-disc", brakeMount: "flat-mount", brakeInterface: "disc", rotorMount: "6-bolt", rotorMm: 160 }, specs: { Type: "Dual-piston mechanical", Mount: "Flat-mount" }, benefits: ["Dual-sided pad actuation — best-in-class cable disc"] }),
  c("shimano-br-mt200", "brakes", "Shimano", "BR-MT200 hydraulic disc (pair)", { tier: "entry", disc: ["mtb", "urban"], g: 650, idr: k(900), compat: { brakeType: "hydraulic-disc", brakeMount: "post-mount", brakeInterface: "disc", rotorMount: "6-bolt", rotorMm: 160 }, specs: { Type: "2-piston hydraulic", Mount: "Post-mount" }, benefits: ["Big step up from cable brakes for little money"] }),
  c("shimano-br-t4000", "brakes", "Shimano", "Alivio BR-T4000 V-brake (pair)", { tier: "entry", disc: ["urban", "mtb"], g: null, idr: k(250), compat: { brakeType: "v-brake", brakeMount: "v-brake", brakeInterface: "rim" }, specs: { Type: "V-brake" } }),
  c("tektro-r559", "brakes", "Tektro", "R559 long-reach caliper (pair)", { tier: "entry", disc: ["road", "urban"], g: 370, idr: k(450), compat: { brakeType: "rim-caliper", brakeMount: "rim-caliper", brakeInterface: "rim" }, specs: { Type: "Dual-pivot rim caliper", Reach: "55–73 mm" } }),
];

/* ------------------------------------------------------------------ */
/* Cockpit, contact points, accessories                                */
/* ------------------------------------------------------------------ */

const COCKPIT: Component[] = [
  c("bar-pro-vibe-alloy", "handlebar", "PRO", "Vibe Alloy Handlebar", { tier: "mid", disc: ["road"], g: 270, idr: jt(1.3), mat: "Aluminium", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm", Type: "Drop" } }),
  c("bar-deda-zero100", "handlebar", "Deda", "Zero100 Shallow Bar", { tier: "mid", disc: ["road"], g: 260, idr: jt(1.5), mat: "Aluminium", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm", Type: "Drop" } }),
  c("bar-fsa-energy-compact", "handlebar", "FSA", "Energy Compact Bar", { tier: "entry", disc: ["road"], g: 270, idr: k(700), mat: "Aluminium", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm", Type: "Drop" } }),
  c("bar-zipp-sl70-aero", "handlebar", "Zipp", "SL-70 Aero Carbon Bar", { tier: "performance", disc: ["road"], g: 245, idr: jt(5.5), mat: "Carbon", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm", Type: "Aero drop" }, benefits: ["Flat aero tops", "Saves weight vs alloy"] }),
  c("bar-ritchey-venturemax", "handlebar", "Ritchey", "WCS VentureMax Bar", { tier: "mid", disc: ["gravel"], g: 300, idr: jt(1.6), mat: "Aluminium", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm", Type: "Flared drop" }, benefits: ["Flared drops for control off-road"] }),
  c("bar-renthal-fatbar-35", "handlebar", "Renthal", "Fatbar 35 Alloy", { tier: "performance", disc: ["mtb"], g: 335, idr: jt(1.9), mat: "Aluminium", compat: { barClampMm: 35 }, specs: { Clamp: "35 mm", Width: "800 mm" }, benefits: ["Precise steering on descents"] }),
  c("bar-oneup-carbon-35", "handlebar", "OneUp", "Carbon Handlebar 35", { tier: "performance", disc: ["mtb"], g: 230, idr: jt(2.6), mat: "Carbon", compat: { barClampMm: 35 }, specs: { Clamp: "35 mm" }, benefits: ["Tuned flex reduces arm pump"] }),
  c("bar-syncros-hixon-318", "handlebar", "Syncros", "Hixon 1.5 Riser 31.8", { tier: "mid", disc: ["mtb", "urban"], g: 320, idr: jt(1.1), mat: "Aluminium", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm" } }),
  c("bar-bontrager-comfort", "handlebar", "Bontrager", "Comfort Sweep Bar", { tier: "entry", disc: ["urban"], g: null, idr: k(500), mat: "Aluminium", compat: { barClampMm: 31.8 }, specs: { Clamp: "31.8 mm", Type: "Swept city bar" }, benefits: ["Upright, relaxed hand position"] }),
  c("bar-odyssey-broc", "handlebar", "Odyssey", "BMX Handlebar 22.2", { tier: "mid", disc: ["bmx"], g: null, idr: jt(1.2), mat: "4130 chromoly", compat: { barClampMm: 22.2 }, specs: { Clamp: "22.2 mm" } }),

  c("stem-pro-vibe", "stem", "PRO", "Vibe Stem", { tier: "mid", disc: ["road", "gravel"], g: 130, idr: jt(1.2), mat: "Aluminium", compat: { barClampMm: 31.8, stemSteererMm: 28.6 } }),
  c("stem-deda-superzero", "stem", "Deda", "Superzero Stem", { tier: "mid", disc: ["road"], g: 120, idr: jt(1.4), mat: "Aluminium", compat: { barClampMm: 31.8, stemSteererMm: 28.6 } }),
  c("stem-ritchey-wcs-c220", "stem", "Ritchey", "WCS C220 Stem", { tier: "mid", disc: ["road", "gravel", "mtb"], g: 125, idr: jt(1.3), mat: "Aluminium", compat: { barClampMm: 31.8, stemSteererMm: 28.6 } }),
  c("stem-fsa-sl-k", "stem", "FSA", "SL-K Stem", { tier: "mid", disc: ["road"], g: 125, idr: jt(1.1), mat: "Aluminium", compat: { barClampMm: 31.8, stemSteererMm: 28.6 } }),
  c("stem-zipp-sc-sl", "stem", "Zipp", "Service Course SL Stem", { tier: "performance", disc: ["road"], g: 110, idr: jt(1.8), mat: "Aluminium", compat: { barClampMm: 31.8, stemSteererMm: 28.6 } }),
  c("stem-renthal-apex-35", "stem", "Renthal", "Apex 35 Stem", { tier: "performance", disc: ["mtb"], g: 145, idr: jt(2.0), mat: "Aluminium", compat: { barClampMm: 35, stemSteererMm: 28.6 } }),
  c("stem-raceface-turbine-r-35", "stem", "Race Face", "Turbine R 35 Stem", { tier: "performance", disc: ["mtb"], g: 140, idr: jt(1.8), mat: "Aluminium", compat: { barClampMm: 35, stemSteererMm: 28.6 } }),
  c("stem-odyssey-elementary", "stem", "Odyssey", "Elementary V3 Top-load Stem", { tier: "mid", disc: ["bmx"], g: null, idr: jt(1.0), mat: "Aluminium", compat: { barClampMm: 22.2, stemSteererMm: 28.6 } }),

  c("saddle-specialized-power-expert", "saddle", "Specialized", "Power Expert", { tier: "mid", disc: ["road", "gravel"], g: 225, idr: jt(2.5), specs: { Rails: "Titanium" }, benefits: ["Short-nose design relieves soft-tissue pressure"] }),
  c("saddle-fizik-vento-argo-r3", "saddle", "Fizik", "Vento Argo R3", { tier: "mid", disc: ["road"], g: 215, idr: jt(2.3), specs: { Rails: "Kium" } }),
  c("saddle-selle-italia-slr-boost", "saddle", "Selle Italia", "SLR Boost Superflow", { tier: "performance", disc: ["road"], g: 150, idr: jt(3.8), specs: { Rails: "Titanium" }, benefits: ["Very light race saddle"] }),
  c("saddle-prologo-dimension", "saddle", "Prologo", "Dimension", { tier: "mid", disc: ["road", "gravel"], g: 230, idr: jt(2.2) }),
  c("saddle-fizik-terra-argo-x5", "saddle", "Fizik", "Terra Argo X5", { tier: "mid", disc: ["gravel"], g: 250, idr: jt(1.4), benefits: ["Gravel-specific padding"] }),
  c("saddle-wtb-volt", "saddle", "WTB", "Volt", { tier: "entry", disc: ["mtb", "gravel"], g: 275, idr: k(800) }),
  c("saddle-ergon-sm-e-mountain", "saddle", "Ergon", "SM Enduro", { tier: "mid", disc: ["mtb"], g: 280, idr: jt(1.6) }),
  c("saddle-brooks-b17", "saddle", "Brooks", "B17", { tier: "mid", disc: ["urban"], g: 520, idr: jt(2.4), mat: "Leather", benefits: ["Leather saddle that conforms over time"] }),
  c("saddle-selle-royal-explora", "saddle", "Selle Royal", "Explora Relaxed", { tier: "entry", disc: ["urban"], g: null, idr: k(600), benefits: ["Wide comfort saddle for upright riding"] }),
  c("saddle-pro-stealth", "saddle", "PRO", "Stealth", { tier: "mid", disc: ["road", "gravel"], g: 220, idr: jt(2.0) }),
  c("saddle-odyssey-pivotal", "saddle", "Odyssey", "Pivotal Saddle", { tier: "entry", disc: ["bmx"], g: null, idr: k(500) }),

  c("post-pro-vibe-272", "seatpost", "PRO", "Vibe Carbon Seatpost 27.2", { tier: "mid", disc: ["road", "gravel"], g: 190, idr: jt(2.2), mat: "Carbon", compat: { postDiameter: "27.2" }, benefits: ["Carbon damping for comfort"] }),
  c("post-ritchey-wcs-316", "seatpost", "Ritchey", "WCS Zero 31.6", { tier: "mid", disc: ["mtb", "road"], g: 230, idr: jt(1.2), mat: "Aluminium", compat: { postDiameter: "31.6" } }),
  c("post-thomson-elite-272", "seatpost", "Thomson", "Elite 27.2", { tier: "mid", disc: ["road", "gravel", "urban"], g: 230, idr: jt(1.8), mat: "Aluminium", compat: { postDiameter: "27.2" } }),
  c("post-tarmac-sl8", "seatpost", "Specialized", "Tarmac SL8 Aero Seatpost", { tier: "pro", disc: ["road"], g: 175, idr: 0, priceNote: included, mat: "Carbon", compat: { postDiameter: "aero:tarmac-sl8" } }),
  c("post-giant-contact-sl-dfuse", "seatpost", "Giant", "Contact SL D-Fuse Seatpost", { tier: "performance", disc: ["road"], g: 210, idr: 0, priceNote: included, mat: "Composite", compat: { postDiameter: "aero:giant-dfuse" } }),
  c("post-rockshox-reverb-axs-349", "seatpost", "RockShox", "Reverb AXS Dropper 34.9", { tier: "pro", disc: ["mtb"], g: 650, idr: jt(13), compat: { postDiameter: "34.9" }, specs: { Travel: "170 mm", Actuation: "Wireless" }, benefits: ["Wireless dropper — clean cockpit"] }),
  c("post-oneup-v3-349", "seatpost", "OneUp", "V3 Dropper 34.9", { tier: "mid", disc: ["mtb"], g: 560, idr: jt(4.5), compat: { postDiameter: "34.9" }, specs: { Travel: "180 mm" }, benefits: ["Long travel, short stack height"] }),
  c("post-oneup-v3-316", "seatpost", "OneUp", "V3 Dropper 31.6", { tier: "mid", disc: ["mtb"], g: 540, idr: jt(4.5), compat: { postDiameter: "31.6" }, specs: { Travel: "150 mm" }, benefits: ["Long travel, short stack height"] }),
  c("post-fox-transfer-316", "seatpost", "Fox", "Transfer Performance Dropper 31.6", { tier: "mid", disc: ["mtb"], g: 590, idr: jt(5.5), compat: { postDiameter: "31.6" }, specs: { Travel: "150 mm" } }),
  c("post-odyssey-pivotal-254", "seatpost", "Odyssey", "Pivotal Seatpost 25.4", { tier: "entry", disc: ["bmx"], g: null, idr: k(350), compat: { postDiameter: "25.4" } }),

  c("pedal-shimano-pd-r7000", "pedals", "Shimano", "105 PD-R7000 SPD-SL", { tier: "mid", disc: ["road"], g: 265, idr: jt(1.6), compat: { pedalThread: "9/16" }, specs: { System: "SPD-SL clipless" }, benefits: ["Efficient power transfer vs flats"] }),
  c("pedal-shimano-pd-r9100", "pedals", "Shimano", "Dura-Ace PD-R9100", { tier: "pro", disc: ["road"], g: 228, idr: jt(3.8), compat: { pedalThread: "9/16" }, specs: { System: "SPD-SL clipless" } }),
  c("pedal-look-keo-blade-carbon", "pedals", "Look", "Keo Blade Carbon", { tier: "performance", disc: ["road"], g: 230, idr: jt(2.6), compat: { pedalThread: "9/16" }, specs: { System: "Keo clipless" } }),
  c("pedal-time-xpro-12", "pedals", "Time", "XPro 12", { tier: "performance", disc: ["road"], g: 180, idr: jt(4.2), compat: { pedalThread: "9/16" }, specs: { System: "Time iClic" } }),
  c("pedal-shimano-pd-m520", "pedals", "Shimano", "PD-M520 SPD", { tier: "entry", disc: ["mtb", "gravel", "urban"], g: 380, idr: k(450), compat: { pedalThread: "9/16" }, specs: { System: "SPD clipless" }, benefits: ["Walkable shoes with clipless efficiency"] }),
  c("pedal-shimano-pd-m8100", "pedals", "Shimano", "XT PD-M8100 SPD", { tier: "performance", disc: ["mtb", "gravel"], g: 342, idr: jt(1.6), compat: { pedalThread: "9/16" }, specs: { System: "SPD clipless" } }),
  c("pedal-crankbrothers-stamp-7", "pedals", "Crankbrothers", "Stamp 7 Flat", { tier: "performance", disc: ["mtb"], g: 360, idr: jt(2.4), compat: { pedalThread: "9/16" }, specs: { System: "Flat" } }),
  c("pedal-oneup-composite", "pedals", "OneUp", "Composite Flat", { tier: "entry", disc: ["mtb", "urban"], g: 355, idr: k(900), compat: { pedalThread: "9/16" }, specs: { System: "Flat" } }),
  c("pedal-wellgo-flat", "pedals", "Wellgo", "Alloy Platform Flat", { tier: "entry", disc: ["urban", "mtb"], g: null, idr: k(250), compat: { pedalThread: "9/16" }, specs: { System: "Flat" } }),
  c("pedal-garmin-rally-rs200", "pedals", "Garmin", "Rally RS200 Power Meter", { tier: "pro", disc: ["road"], g: 320, idr: jt(17), compat: { pedalThread: "9/16" }, specs: { System: "SPD-SL", Power: "Dual-sided" }, benefits: ["Accurate power data for structured training"] }),
  c("pedal-odyssey-twisted-pc", "pedals", "Odyssey", "Twisted PC Pedals", { tier: "entry", disc: ["bmx"], g: null, idr: k(350), compat: { pedalThread: "9/16" }, specs: { System: "Flat (plastic)" } }),
];

const ACCESSORIES: Component[] = [
  c("acc-garmin-edge-840", "accessory", "Garmin", "Edge 840 GPS Computer", { tier: "performance", disc: ["universal"], g: 85, idr: jt(7.5), specs: { Type: "GPS cycling computer" }, benefits: ["Navigation, training and climb data"] }),
  c("acc-wahoo-bolt-v2", "accessory", "Wahoo", "ELEMNT Bolt v2", { tier: "mid", disc: ["universal"], g: 68, idr: jt(4.8), specs: { Type: "GPS cycling computer" } }),
  c("acc-wahoo-roam-v2", "accessory", "Wahoo", "ELEMNT Roam v2", { tier: "performance", disc: ["universal"], g: 93, idr: jt(6.4), specs: { Type: "GPS cycling computer" } }),
  c("acc-garmin-varia-rtl515", "accessory", "Garmin", "Varia RTL515 Radar Tail Light", { tier: "performance", disc: ["universal"], g: 71, idr: jt(3.6), specs: { Type: "Radar + rear light" }, benefits: ["Warns of approaching vehicles"] }),
  c("acc-lezyne-lite-drive-1200", "accessory", "Lezyne", "Lite Drive 1200+ Front Light", { tier: "mid", disc: ["universal"], g: 150, idr: jt(1.3), specs: { Type: "Front light", Output: "1200 lm" } }),
  c("acc-lezyne-pressure-drive", "accessory", "Lezyne", "Pressure Drive Mini Pump", { tier: "mid", disc: ["universal"], g: 95, idr: k(550), specs: { Type: "Mini pump" } }),
  c("acc-topeak-mini-20-pro", "accessory", "Topeak", "Mini 20 Pro Multi-tool", { tier: "mid", disc: ["universal"], g: 155, idr: k(650), specs: { Type: "Multi-tool" } }),
  c("acc-topeak-ninja-cage", "accessory", "Topeak", "Ninja Cage", { tier: "mid", disc: ["universal"], g: null, idr: k(350), specs: { Type: "Bottle cage" } }),
  c("acc-elite-fly-bottle", "accessory", "Elite", "Fly 750 Bottle", { tier: "entry", disc: ["universal"], g: 54, idr: k(150), specs: { Type: "Bottle" } }),
  c("acc-bontrager-flare-rt", "accessory", "Bontrager", "Flare RT Rear Light", { tier: "mid", disc: ["universal"], g: 37, idr: k(900), specs: { Type: "Rear light" } }),
  c("acc-pro-bikepacking-frame-bag", "accessory", "PRO", "Discover Frame Bag", { tier: "mid", disc: ["gravel", "universal"], g: null, idr: k(900), specs: { Type: "Bikepacking bag" } }),
];

export const COMPONENTS: Component[] = [
  ...FRAMES,
  ...FORKS,
  ...GROUPSETS.flatMap(expandGroupset),
  ...EXTRA_DRIVETRAIN,
  ...BRAKES,
  ...WHEELS,
  ...TIRES,
  ...COCKPIT,
  ...ACCESSORIES,
];
