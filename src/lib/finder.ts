import type { BikeModel, Brand, CategoryId, Experience, Suspension, Usage, WheelSize } from "./types";
import { formatIdrShort } from "./format";

/* ------------------------------------------------------------------ */
/* Groupset tier heuristics — used for value scoring                   */
/* ------------------------------------------------------------------ */

const TIER_KEYWORDS: Array<[RegExp, number]> = [
  [/dura-?ace|\bred\b|xtr|xx sl|super record/i, 6],
  [/ultegra|\bforce\b|\bxt\b|deore xt|x0|record/i, 5],
  [/\b105\b|rival|slx|grx|gx|chorus/i, 4],
  [/tiagra|apex|\bdeore\b|nx|cues/i, 3],
  [/sora|eagle 90|sx|alivio|advent/i, 2],
  [/claris|altus|acera|ltwoo|sensah|microshift/i, 1.3],
  [/tourney/i, 0.8],
];

export function groupsetTier(groupset: string | null | undefined): number | null {
  if (!groupset) return null;
  for (const [re, score] of TIER_KEYWORDS) if (re.test(groupset)) return score;
  return null;
}

export function groupsetBrand(groupset: string | null | undefined): "shimano" | "sram" | "campagnolo" | "other" | null {
  if (!groupset) return null;
  if (/shimano/i.test(groupset)) return "shimano";
  if (/sram/i.test(groupset)) return "sram";
  if (/campagnolo/i.test(groupset)) return "campagnolo";
  return "other";
}

/** Typical street price for a complete bike at a given drivetrain tier (IDR) — the value baseline. */
const EXPECTED_PRICE: Array<[number, number]> = [
  [0.8, 4_000_000], [1.3, 7_000_000], [2, 10_000_000], [3, 14_000_000], [4, 22_000_000], [5, 55_000_000], [6, 120_000_000],
];
function expectedPrice(tier: number, category: CategoryId): number {
  let lo = EXPECTED_PRICE[0], hi = EXPECTED_PRICE[EXPECTED_PRICE.length - 1];
  for (let i = 0; i < EXPECTED_PRICE.length - 1; i++) {
    if (tier >= EXPECTED_PRICE[i][0] && tier <= EXPECTED_PRICE[i + 1][0]) { lo = EXPECTED_PRICE[i]; hi = EXPECTED_PRICE[i + 1]; break; }
  }
  const t = hi[0] === lo[0] ? 0 : (tier - lo[0]) / (hi[0] - lo[0]);
  const base = lo[1] + t * (hi[1] - lo[1]);
  // Full suspension, electric and premium frames carry legitimate cost beyond the groupset.
  const factor = category === "electric" ? 2.5 : 1;
  return base * factor;
}

export function materialGroup(m: string | null): "carbon" | "aluminium" | "steel" | "titanium" | "other" | null {
  if (!m) return null;
  if (/carbon|composite|cf|oclv|fact|t1100/i.test(m)) return "carbon";
  if (/alu|alloy|alx|aluxx|alpha|smartform|e5|m5/i.test(m)) return "aluminium";
  if (/steel|chromoly|cro-?mo|4130|reynolds|hi-?ten/i.test(m)) return "steel";
  if (/titan/i.test(m)) return "titanium";
  return "other";
}

/* ------------------------------------------------------------------ */
/* Finder                                                              */
/* ------------------------------------------------------------------ */

export interface FinderCriteria {
  q?: string;
  budgetMax?: number | null;
  budgetMin?: number | null;
  category?: CategoryId | "all";
  subcategory?: string | "all";
  region?: "all" | "Indonesia" | "International";
  country?: string | "all";
  brandIds?: string[];
  experience?: Experience | "any";
  usage?: Usage[];
  material?: "all" | "carbon" | "aluminium" | "steel" | "titanium";
  groupsetBrand?: "all" | "shimano" | "sram" | "campagnolo" | "other";
  brakes?: "all" | "disc" | "hydraulic" | "rim";
  wheelSize?: WheelSize | "all";
  suspension?: Suspension | "all";
  includeDiscontinued?: boolean;
  sort?: "match" | "value" | "price-asc" | "price-desc" | "newest";
}

export interface FinderResult {
  bike: BikeModel;
  brand: Brand | undefined;
  score: number; // 0–100
  valueIndex: number | null; // >1 = more drivetrain per rupiah than typical
  reasons: string[];
  cautions: string[];
}

const USAGE_LABEL: Record<Usage, string> = {
  commuting: "commuting", fitness: "fitness riding", racing: "racing", touring: "touring", trail: "trail riding", downhill: "descending",
  leisure: "leisure riding", tricks: "tricks and park", bikepacking: "bikepacking", cargo: "carrying cargo",
};

export function isDisc(b: BikeModel) { return b.brakeType === "hydraulic-disc" || b.brakeType === "mechanical-disc"; }

export function matchesHardFilters(b: BikeModel, brand: Brand | undefined, c: FinderCriteria): boolean {
  if (b.provenance.status === "archived") return false;
  if (!c.includeDiscontinued && b.provenance.status === "discontinued") return false;
  if (c.category && c.category !== "all" && b.category !== c.category) return false;
  if (c.subcategory && c.subcategory !== "all" && b.subcategory !== c.subcategory) return false;
  if (c.region && c.region !== "all" && brand?.region !== c.region) return false;
  if (c.country && c.country !== "all" && brand?.country !== c.country) return false;
  if (c.brandIds?.length && !c.brandIds.includes(b.brandId)) return false;
  if (c.budgetMax != null && (b.price?.amount == null || b.price.amount > c.budgetMax)) return false;
  if (c.budgetMin != null && b.price?.amount != null && b.price.amount < c.budgetMin) return false;
  if (c.material && c.material !== "all" && materialGroup(b.frameMaterial) !== c.material) return false;
  if (c.groupsetBrand && c.groupsetBrand !== "all" && groupsetBrand(b.groupset) !== c.groupsetBrand) return false;
  if (c.brakes === "disc" && !isDisc(b)) return false;
  if (c.brakes === "hydraulic" && b.brakeType !== "hydraulic-disc") return false;
  if (c.brakes === "rim" && (isDisc(b) || b.brakeType == null)) return false;
  if (c.wheelSize && c.wheelSize !== "all" && b.wheelSize !== c.wheelSize) return false;
  if (c.suspension && c.suspension !== "all" && b.suspension !== c.suspension) return false;
  if (c.q) {
    // name, brand, family, category and the published component list (groupset, wheelset, tyres, brakes, parts)
    const hay = `${brand?.name ?? ""} ${b.name} ${b.family} ${b.groupset ?? ""} ${b.frameMaterial ?? ""} ${b.category} ${b.subcategory} ${b.wheelset ?? ""} ${b.tires ?? ""} ${b.brakes ?? ""} ${b.usage.join(" ")} ${(b.componentSpec ?? []).map((r) => r.value).join(" ")}`.toLowerCase();
    if (!c.q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t))) return false;
  }
  return true;
}

export function scoreBike(b: BikeModel, brand: Brand | undefined, c: FinderCriteria): FinderResult {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 40;

  // 1. Usage fit (up to +25)
  if (c.usage?.length) {
    const hit = c.usage.filter((u) => b.usage.includes(u));
    score += Math.round((25 * hit.length) / c.usage.length);
    if (hit.length) reasons.push(`Built for ${hit.map((u) => USAGE_LABEL[u]).join(" and ")}.`);
    else { score -= 10; cautions.push(`Not primarily intended for ${c.usage.map((u) => USAGE_LABEL[u]).join(" or ")}.`); }
  } else score += 10;

  // 2. Experience fit (up to +15)
  if (c.experience && c.experience !== "any") {
    if (b.experience.includes(c.experience)) { score += 15; reasons.push(`Suited to ${c.experience} riders.`); }
    else if (c.experience === "beginner" && b.experience.every((e) => e === "advanced")) { score -= 12; cautions.push("Race-oriented — demanding for a first bike."); }
    else score -= 4;
  } else score += 6;

  // 3. Value — drivetrain level relative to price, NOT price itself (up to +20)
  const tier = groupsetTier(b.groupset);
  let valueIndex: number | null = null;
  if (tier != null && b.price?.amount) {
    valueIndex = expectedPrice(tier, b.category) / b.price.amount;
    const clamp = Math.max(0.5, Math.min(1.6, valueIndex));
    score += Math.round(((clamp - 0.5) / 1.1) * 20);
    if (valueIndex >= 1.15) reasons.push(`Strong value: ${b.groupset} is usually found on pricier bikes.`);
    else if (valueIndex < 0.6) cautions.push("You pay a premium beyond the drivetrain level (frame, brand or integration).");
  } else {
    score += 8;
    if (!b.groupset) cautions.push("Drivetrain not catalogued — value could not be assessed.");
  }

  // 4. Budget fit — never rewards spending more
  if (c.budgetMax && b.price?.amount) {
    const left = c.budgetMax - b.price.amount;
    if (left >= c.budgetMax * 0.12) reasons.push(`Leaves ${formatIdrShort(left)} of your budget for helmet, pedals and fit.`);
    score += 5;
  }

  // 5. Practical features
  if (b.brakeType === "hydraulic-disc") { score += 4; reasons.push("Hydraulic disc brakes stop reliably in heavy tropical rain."); }
  if (b.tireClearanceMm && b.tireClearanceMm >= 32 && (b.category === "road" || b.category === "gravel")) { score += 2; reasons.push(`Clears ${b.tireClearanceMm} mm tyres for comfort and rough roads.`); }
  if (brand?.region === "Indonesia") reasons.push("Local brand — broad dealer network and parts support in Indonesia.");

  // 6. Data completeness
  const unknown = [b.groupset, b.frameMaterial, b.wheelset, b.tires, b.weightKg].filter((v) => v == null).length;
  if (unknown >= 3) { score -= 4; cautions.push("Several specifications are not yet catalogued — confirm with the dealer."); }
  if (b.provenance.status === "discontinued") cautions.push("Discontinued — consider used-market availability and parts.");
  if (b.drawbacks[0]) cautions.push(b.drawbacks[0]);

  return { bike: b, brand, score: Math.max(0, Math.min(100, score)), valueIndex, reasons: Array.from(new Set(reasons)).slice(0, 4), cautions: Array.from(new Set(cautions)).slice(0, 3) };
}

export function findBikes(bikes: BikeModel[], brands: Map<string, Brand>, c: FinderCriteria): FinderResult[] {
  const results = bikes
    .filter((b) => matchesHardFilters(b, brands.get(b.brandId), c))
    .map((b) => scoreBike(b, brands.get(b.brandId), c));
  const price = (r: FinderResult) => r.bike.price?.amount ?? Number.POSITIVE_INFINITY;
  switch (c.sort ?? "match") {
    case "price-asc": return results.sort((a, b) => price(a) - price(b));
    case "price-desc": return results.sort((a, b) => (b.bike.price?.amount ?? -1) - (a.bike.price?.amount ?? -1));
    case "value": return results.sort((a, b) => (b.valueIndex ?? 0) - (a.valueIndex ?? 0));
    // undated records (manufacturer publishes no model year) never outrank dated ones
    case "newest": { const y = (r: FinderResult) => (r.bike.yearBasis === "undated" ? -Infinity : r.bike.year); return results.sort((a, b) => y(b) - y(a)); }
    default: return results.sort((a, b) => b.score - a.score || price(a) - price(b));
  }
}
