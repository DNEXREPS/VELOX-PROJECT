/**
 * Upgrade Advisor engine.
 *
 * Builds a "virtual" version of the rider's bike from its known attributes, then evaluates
 * catalogue components against it with the shared compatibility engine. Recommendations are
 * goal-weighted, tier-gated (no sideways or downward moves) and packed into three budget tiers.
 */
import type { BikeModel, CategoryId, CompatAttrs, Component, ComponentType, Discipline, Tier } from "./types";
import { checkBuild, type CompatCheck, type CompatStatus, type Selection, worst } from "./compat";
import { groupsetTier } from "./finder";

export type Goal = "speed" | "climbing" | "comfort" | "reliability" | "control" | "versatility";
export const GOALS: Array<{ id: Goal; label: string; hint: string }> = [
  { id: "speed", label: "Speed", hint: "Go faster on the flat" },
  { id: "climbing", label: "Climbing & weight", hint: "Lighter, easier climbs" },
  { id: "comfort", label: "Comfort", hint: "Less fatigue on long rides" },
  { id: "reliability", label: "Reliability", hint: "Fewer mechanicals, safer stops" },
  { id: "control", label: "Control", hint: "Confidence on descents and in the wet" },
  { id: "versatility", label: "Versatility", hint: "More terrain, more gears" },
];

export type UpgradeArea = "groupset" | "drivetrain" | "wheelset" | "tires" | "brakes" | "cockpit" | "saddle" | "pedals" | "seatpost";
export const AREA_TYPES: Record<UpgradeArea, ComponentType[]> = {
  groupset: ["groupset"],
  drivetrain: ["cassette"],
  wheelset: ["wheelset"],
  tires: ["tires"],
  brakes: ["brakes"],
  cockpit: ["handlebar"],
  saddle: ["saddle"],
  pedals: ["pedals"],
  seatpost: ["seatpost"],
};
export const AREA_LABEL: Record<UpgradeArea, string> = {
  groupset: "Groupset", drivetrain: "Cassette", wheelset: "Wheelset", tires: "Tyres", brakes: "Brakes",
  cockpit: "Cockpit", saddle: "Saddle", pedals: "Pedals", seatpost: "Seatpost",
};

const GOAL_WEIGHTS: Record<Goal, Partial<Record<UpgradeArea, number>>> = {
  speed: { wheelset: 1, tires: 0.9, pedals: 0.5, groupset: 0.4, cockpit: 0.35, saddle: 0.2 },
  climbing: { wheelset: 0.9, groupset: 0.6, drivetrain: 0.45, tires: 0.5, seatpost: 0.25, cockpit: 0.2 },
  comfort: { tires: 1, saddle: 0.9, seatpost: 0.6, cockpit: 0.45 },
  reliability: { brakes: 0.9, drivetrain: 0.8, tires: 0.7, groupset: 0.55 },
  control: { brakes: 1, tires: 0.9, seatpost: 0.6, cockpit: 0.7, pedals: 0.45 },
  versatility: { tires: 0.8, groupset: 0.6, wheelset: 0.45, drivetrain: 0.35 },
};

const IMPLICATION: Record<UpgradeArea, string> = {
  groupset: "Faster, more precise shifting and a wider or tighter gear range; often the biggest single change in how the bike feels.",
  drivetrain: "Smoother shifting and longer drivetrain life; a worn chain/cassette is the most common cause of poor shifting.",
  wheelset: "Lower rotating weight and stiffer, often more aerodynamic wheels — the most noticeable performance upgrade per rupiah.",
  tires: "Lower rolling resistance, better grip and comfort. Cheapest meaningful upgrade on most bikes.",
  brakes: "More power and better modulation, especially in the wet — a safety upgrade first, performance second.",
  cockpit: "Better fit and control; aero or carbon bars can add comfort or speed.",
  saddle: "Comfort and power delivery depend on fit — try before committing if possible.",
  pedals: "Clipless pedals improve pedalling efficiency and control compared with flats.",
  seatpost: "A dropper post transforms descending control on MTBs; carbon posts add comfort on road bikes.",
};

export const TIER_RANK: Record<Tier, number> = { entry: 0, mid: 1, performance: 2, pro: 3 };

export interface BikeProfile {
  label: string;
  category: CategoryId;
  groupset: string | null;
  priceIdr: number | null;
  compat: CompatAttrs;
  /** names of current parts for display */
  current: Partial<Record<UpgradeArea, string | null>>;
  /** known catalogue components currently installed (from a VELOX build) */
  installed?: Partial<Record<ComponentType, Component>>;
}

export interface Recommendation {
  area: UpgradeArea;
  component: Component;
  current: string;
  price: number;
  weightDeltaG: number | null;
  benefits: string[];
  implication: string;
  compatibility: CompatStatus;
  compatNotes: CompatCheck[];
  priority: "High" | "Medium" | "Low";
  score: number;
}

export interface UpgradePlan {
  id: "budget" | "balanced" | "performance";
  title: string;
  description: string;
  cap: number;
  items: Recommendation[];
  total: number;
}

export interface AdvisorResult {
  plans: UpgradePlan[];
  skipped: Array<{ area: UpgradeArea; reason: string }>;
  evaluated: number;
  excludedIncompatible: number;
}

const DISCIPLINES: Record<CategoryId, Discipline[]> = {
  road: ["road", "universal"], gravel: ["gravel", "road", "universal"], mtb: ["mtb", "universal"], urban: ["urban", "universal"],
  folding: ["urban", "universal"], electric: ["urban", "mtb", "universal"], bmx: ["bmx"], other: ["urban", "road", "gravel", "universal"],
};

export function profileFromModel(b: BikeModel, brandName: string): BikeProfile {
  return {
    label: `${brandName} ${b.name} (${b.year})`,
    category: b.category,
    groupset: b.groupset,
    priceIdr: b.price?.amount ?? null,
    compat: { ...b.compat, maxTireMm: b.compat.maxTireMm ?? b.tireClearanceMm, wheelSize: b.compat.wheelSize ?? b.wheelSize },
    current: { groupset: b.groupset, wheelset: b.wheelset, tires: b.tires, brakes: b.brakes, drivetrain: b.drivetrain, cockpit: null, saddle: null, pedals: null, seatpost: null },
  };
}

/** Estimate the tier of a stock component from the bike's drivetrain level / price. */
function currentTier(p: BikeProfile, area: UpgradeArea): number {
  const installed = AREA_TYPES[area].map((t) => p.installed?.[t]).find(Boolean);
  if (installed) return TIER_RANK[installed.tier];
  const g = groupsetTier(p.groupset);
  if (area === "groupset" || area === "drivetrain") {
    if (g == null) return p.priceIdr && p.priceIdr > 40_000_000 ? 2 : 0;
    return g >= 5.5 ? 3 : g >= 4 ? 2 : g >= 3 ? 1 : 0;
  }
  // Stock wheels/tyres/contact points are typically one step below the drivetrain level.
  const price = p.priceIdr ?? 0;
  if (price >= 90_000_000) return 2;
  if (price >= 35_000_000) return 1;
  return 0;
}

/** Synthesise pseudo-components from the profile so the compatibility engine can reason about the bike. */
export function virtualSelection(p: BikeProfile): Selection {
  const a = p.compat;
  const pseudo = (type: ComponentType, compat: CompatAttrs): Component => ({
    id: `current-${type}`, type, manufacturer: "Current", manufacturerSlug: "current", name: `Current ${type}`, discipline: ["universal"], tier: "entry",
    specs: {}, compat, provenance: { status: "unverified", sources: [], updatedAt: "" },
  });
  const sel: Selection = {
    frame: pseudo("frame", {
      bbStandard: a.bbStandard, brakeMount: a.brakeMount, brakeInterface: a.brakeInterface, rearAxle: a.rearAxle, wheelSizes: a.wheelSizes ?? (a.wheelSize ? [a.wheelSize] : null),
      maxTireMm: a.maxTireMm, seatpostDiameter: a.seatpostDiameter, drivetrainSupport: a.drivetrainSupport, frontDerailleurMount: a.frontDerailleurMount, udh: a.udh, steerer: a.steerer,
    }),
    fork: pseudo("fork", { frontAxle: a.frontAxle, brakeMount: a.brakeMount, brakeInterface: a.brakeInterface, wheelSizes: a.wheelSizes ?? (a.wheelSize ? [a.wheelSize] : null), maxTireMm: a.maxTireMm, steerer: a.steerer, steererTopMm: 28.6 }),
    shifters: pseudo("shifters", { speeds: a.speeds, protocol: a.protocol, chainrings: a.chainrings, brakeType: a.brakeMount === "flat-mount" || a.brakeMount === "rim-caliper" ? a.brakeType : null, electronic: a.protocol ? /di2|axs/.test(a.protocol) : null }),
    "rear-derailleur": pseudo("rear-derailleur", { speeds: a.speeds, protocol: a.protocol, electronic: a.protocol ? /di2|axs/.test(a.protocol) : null, maxCog: null }),
    cassette: pseudo("cassette", { speeds: a.speeds, freehub: a.freehub }),
    wheelset: pseudo("wheelset", { wheelSize: a.wheelSize, rearAxle: a.rearAxle, frontAxle: a.frontAxle, brakeInterface: a.brakeInterface, rotorMount: a.rotorMount, freehubOptions: a.freehub ? [a.freehub] : null }),
    brakes: pseudo("brakes", { brakeType: a.brakeType, brakeMount: a.brakeMount, brakeInterface: a.brakeInterface, rotorMount: a.rotorMount }),
    stem: pseudo("stem", { barClampMm: a.barClampMm, stemSteererMm: 28.6 }),
  };
  for (const [k, v] of Object.entries(p.installed ?? {})) if (v) sel[k as ComponentType] = v;
  return sel;
}

function evaluate(base: Selection, candidate: Component): { status: CompatStatus; checks: CompatCheck[] } {
  const next: Selection = { ...base };
  const replaced: ComponentType[] = [candidate.type];
  if (candidate.type === "groupset" && candidate.kit) {
    // a groupset upgrade swaps every part in its kit; parts the kit lacks stay as they are
    for (const [slot] of Object.entries(candidate.kit)) replaced.push(slot as ComponentType);
  }
  next[candidate.type] = candidate;
  const kitParts = (candidate as Component & { _kitParts?: Component[] })._kitParts;
  if (kitParts) for (const part of kitParts) next[part.type] = part;
  const { checks } = checkBuild(next);
  const rel = checks.filter((c) => c.slots.some((s) => replaced.includes(s)));
  // Drop "missing data" checks that only concern pseudo-parts the user can't see, but keep them when they involve the candidate.
  let status: CompatStatus = "compatible";
  for (const c of rel) status = worst(status, c.status);
  return { status, checks: rel.filter((c) => c.status !== "compatible") };
}

export interface AdvisorInput {
  profile: BikeProfile;
  budget: number;
  goals: Goal[];
  areas?: UpgradeArea[]; // restrict
  catalog: Component[];
  componentById: Map<string, Component>;
}

export function adviseUpgrades({ profile, budget, goals, areas, catalog, componentById }: AdvisorInput): AdvisorResult {
  const goalsUsed: Goal[] = goals.length ? goals : ["speed", "comfort", "reliability"];
  const discs = DISCIPLINES[profile.category];
  const base = virtualSelection(profile);
  const allowedAreas = (areas?.length ? areas : (Object.keys(AREA_TYPES) as UpgradeArea[]));
  const skipped: AdvisorResult["skipped"] = [];
  let evaluated = 0;
  let excludedIncompatible = 0;

  const relevance = (area: UpgradeArea) => goalsUsed.reduce((s, g) => s + (GOAL_WEIGHTS[g][area] ?? 0), 0) / goalsUsed.length;

  const candidatesByArea = new Map<UpgradeArea, Recommendation[]>();
  for (const area of allowedAreas) {
    const rel = relevance(area);
    if (rel < 0.15) { skipped.push({ area, reason: "Not relevant to your selected riding goals." }); continue; }
    if (profile.category === "bmx" && (area === "groupset" || area === "drivetrain")) { skipped.push({ area, reason: "Single-speed BMX — no drivetrain upgrade path." }); continue; }
    const curTier = currentTier(profile, area);
    const types = AREA_TYPES[area];
    const recs: Recommendation[] = [];
    for (const comp of catalog) {
      if (!types.includes(comp.type)) continue;
      if (comp.provenance.status === "archived") continue;
      if (!comp.price?.amount) continue; // never recommend unpriced or "included" parts
      if (!comp.discipline.some((d) => discs.includes(d))) continue;
      const tierGain = TIER_RANK[comp.tier] - curTier;
      const tyreSidegrade = area === "tires" && tierGain === 0 && (goalsUsed.includes("comfort") || goalsUsed.includes("control")) && (comp.compat.tireWidthMm ?? 0) >= 32;
      if (tierGain <= 0 && !tyreSidegrade) continue; // no sideways or downward moves
      if (area === "groupset" && profile.compat.speeds && (comp.compat.speeds ?? 0) < profile.compat.speeds) continue;
      if (area === "seatpost" && profile.category === "mtb" && !/dropper/i.test(comp.name)) continue;
      if (area === "seatpost" && profile.category !== "mtb" && /dropper/i.test(comp.name)) continue;
      evaluated++;
      const withKit = comp.type === "groupset" && comp.kit
        ? Object.assign({}, comp, { _kitParts: Object.values(comp.kit).map((id) => componentById.get(id!)).filter(Boolean) as Component[] })
        : comp;
      const { status, checks } = evaluate(base, withKit);
      if (status === "incompatible") { excludedIncompatible++; continue; }
      const installed = types.map((t) => profile.installed?.[t]).find(Boolean);
      const weightDeltaG = installed?.weightG != null && comp.weightG != null ? comp.weightG - installed.weightG : null;
      // Contact points and wear parts don't scale with price the way wheels or groupsets do.
      const gain = Math.min(Math.max(tierGain, 0.4), ["saddle", "cockpit", "pedals", "drivetrain"].includes(area) ? 1 : 3);
      const score = rel * (1 + 0.5 * gain) * (status === "compatible" ? 1 : status === "potential" ? 0.8 : 0.65);
      recs.push({
        area,
        component: comp,
        current: profile.current[area] ?? installed?.name ?? "Stock component",
        price: comp.price.amount,
        weightDeltaG,
        benefits: comp.benefits?.length ? comp.benefits : [IMPLICATION[area].split(";")[0]],
        implication: IMPLICATION[area],
        compatibility: status,
        compatNotes: checks,
        priority: rel * gain >= 0.9 ? "High" : rel * gain >= 0.45 ? "Medium" : "Low",
        score,
      });
    }
    if (!recs.length) skipped.push({ area, reason: "No compatible upgrade above your current level in the catalogue — your current part is already well matched." });
    else candidatesByArea.set(area, recs);
  }

  const planDefs: Array<Omit<UpgradePlan, "items" | "total">> = [
    { id: "budget", title: "Budget Upgrade", description: "Affordable changes with the best return per rupiah.", cap: Math.round(budget * 0.35) },
    { id: "balanced", title: "Balanced Upgrade", description: "A balance of price, performance and practicality.", cap: Math.round(budget * 0.7) },
    { id: "performance", title: "Performance Upgrade", description: "Higher-end parts for riders prioritising performance.", cap: budget },
  ];

  const plans = planDefs.map((def) => {
    const picks: Recommendation[] = [];
    let total = 0;
    const areaOrder = [...candidatesByArea.entries()].sort((a, b) => Math.max(...b[1].map((r) => r.score)) - Math.max(...a[1].map((r) => r.score)));
    for (const [, recs] of areaOrder) {
      const affordable = recs.filter((r) => total + r.price <= def.cap);
      if (!affordable.length) continue;
      let choice: Recommendation;
      if (def.id === "budget") choice = affordable.sort((a, b) => b.score / Math.sqrt(b.price) - a.score / Math.sqrt(a.price))[0];
      else if (def.id === "balanced") choice = affordable.sort((a, b) => b.score / Math.pow(b.price, 0.25) - a.score / Math.pow(a.price, 0.25))[0];
      else {
        // performance: best part that still leaves room for the next most important area
        choice = affordable.sort((a, b) => b.score - a.score || b.price - a.price)[0];
      }
      picks.push(choice);
      total += choice.price;
      if (picks.length >= 5) break;
    }
    picks.sort((a, b) => ({ High: 0, Medium: 1, Low: 2 })[a.priority] - ({ High: 0, Medium: 1, Low: 2 })[b.priority] || b.score - a.score);
    return { ...def, items: picks, total };
  });

  return { plans, skipped, evaluated, excludedIncompatible };
}
