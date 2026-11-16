/**
 * Performance Upgrade Simulator.
 *
 * Only arithmetic on catalogued figures — no invented performance claims.
 *   Δweight(part) = replacement.weightG − original.weightG   (only when BOTH are known)
 *   new bike weight = catalogued bike weight + Σ known Δweight   (only when the bike weight is known)
 *   cost = Σ replacement prices (estimates are labelled as such)
 * Any unknown input makes the dependent output "Not Available" and is listed explicitly.
 */
import type { Component, ComponentType } from "./types";

export interface SimSwap {
  slot: ComponentType;
  original: { name: string; weightG: number | null; source: "catalogue" | "unknown" } ;
  replacement: Component;
}

export interface SimLine {
  slot: ComponentType;
  originalName: string;
  originalWeightG: number | null;
  replacementName: string;
  replacementWeightG: number | null;
  deltaG: number | null;
  price: number | null;
  priceType: string | null;
  benefits: string[];
  weightBasis: string;
}

export interface SimResult {
  lines: SimLine[];
  knownDeltaG: number;
  deltasKnown: number;
  deltasUnknown: number;
  totalCost: number;
  unpriced: number;
  estimatedPrices: boolean;
  bikeWeightBeforeKg: number | null;
  bikeWeightAfterKg: number | null;
  bikeWeightNote: string;
  method: string[];
}

export function simulate(swaps: SimSwap[], bikeWeightKg: number | null): SimResult {
  const lines: SimLine[] = swaps.map(({ slot, original, replacement }) => {
    const rw = replacement.weightG ?? null;
    const ow = original.weightG;
    const deltaG = rw != null && ow != null ? rw - ow : null;
    return {
      slot,
      originalName: original.name,
      originalWeightG: ow,
      replacementName: `${replacement.manufacturer} ${replacement.name}`,
      replacementWeightG: rw,
      deltaG,
      price: replacement.price?.amount || null,
      priceType: replacement.price?.type ?? null,
      benefits: replacement.benefits ?? [],
      weightBasis: deltaG != null ? "Both weights catalogued (manufacturer-claimed, unverified)" : ow == null ? "Original part weight unknown" : "Replacement weight not catalogued",
    };
  });
  const known = lines.filter((l) => l.deltaG != null);
  const knownDeltaG = known.reduce((s, l) => s + (l.deltaG ?? 0), 0);
  const priced = lines.filter((l) => l.price != null);
  const totalCost = priced.reduce((s, l) => s + (l.price ?? 0), 0);
  const allKnown = known.length === lines.length && lines.length > 0;
  const bikeWeightAfterKg = bikeWeightKg != null && allKnown ? Math.round((bikeWeightKg + knownDeltaG / 1000) * 100) / 100 : null;
  return {
    lines,
    knownDeltaG,
    deltasKnown: known.length,
    deltasUnknown: lines.length - known.length,
    totalCost,
    unpriced: lines.length - priced.length,
    estimatedPrices: priced.some((l) => l.priceType === "estimated"),
    bikeWeightBeforeKg: bikeWeightKg,
    bikeWeightAfterKg,
    bikeWeightNote:
      bikeWeightKg == null
        ? "Complete-bike weight is not catalogued, so a new total cannot be calculated."
        : !allKnown
          ? `${lines.length - known.length} weight difference(s) unknown, so a new total would be misleading and is not shown.`
          : "Catalogued bike weight plus the sum of known part-weight differences.",
    method: [
      "Weight difference per part = replacement weight − original weight, only when both are catalogued.",
      "Catalogued weights are manufacturer-claimed figures, not VELOX measurements; real weights vary with size and configuration.",
      "Total cost = sum of replacement prices; VELOX estimates are labelled “Estimated” and exclude fitting labour.",
      "No speed, watt or time savings are calculated — those depend on rider, course and conditions and cannot be derived from part weights alone.",
    ],
  };
}

/** Qualitative, non-numeric implications per slot (no invented performance figures). */
export const PRACTICAL_NOTES: Partial<Record<ComponentType, string>> = {
  wheelset: "Lighter wheels reduce rotating mass, most noticeable when accelerating and climbing; deeper rims may be faster at speed but more affected by crosswinds.",
  tires: "Tyre casing and compound usually change rolling resistance and grip more than weight does.",
  groupset: "Affects shifting speed, gear range and ergonomics; weight change is usually secondary.",
  saddle: "A comfort and fit decision first — weight savings are minor.",
  handlebar: "Shape and width change fit and control; carbon may add some vibration damping.",
  stem: "Length and angle change your position — fit first.",
  seatpost: "Carbon posts can add compliance; droppers add weight but transform descending control on MTBs.",
  pedals: "Clipless systems improve pedalling connection; weight differences are small.",
  brakes: "Braking power and modulation matter more than weight.",
  cassette: "Range changes climbing gears; weight differences are modest.",
};
