/**
 * Currency and price tiers for Parts Discovery.
 *
 * Only rates with a cited source are used. A price in a currency without a cited rate is shown
 * as listed and is NOT converted, ranked against an IDR budget, or called "lowest".
 */
import { DEMO_USD_RATE, USD_RATE_SOURCE } from "@/lib/format";
import type { Offer, PartCategory, Price } from "./types";

export interface Rate { idrPerUnit: number; source: string }
/** Add a currency only together with its source (e.g. Bank Indonesia kurs transaksi, with date). */
export const RATES: Record<string, Rate> = {
  IDR: { idrPerUnit: 1, source: "native" },
  USD: { idrPerUnit: DEMO_USD_RATE, source: USD_RATE_SOURCE },
};

export function toIdr(p: Pick<Price, "amount" | "currency"> | null | undefined): number | null {
  if (!p) return null;
  const r = RATES[p.currency.toUpperCase()];
  return r ? Math.round(p.amount * r.idrPerUnit) : null;
}

export function formatPrice(p: Pick<Price, "amount" | "currency">): string {
  const cur = p.currency.toUpperCase();
  if (cur === "IDR") return "Rp " + Math.round(p.amount).toLocaleString("id-ID");
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: p.amount < 100 ? 2 : 0 }).format(p.amount); }
  catch { return `${cur} ${p.amount}`; }
}

/** A price is "current" for 24 hours after it was checked; older prices are labelled with their date. */
export const PRICE_FRESH_MS = 24 * 3600 * 1000;
export const isFresh = (checkedAt: string, now = Date.now()) => now - Date.parse(checkedAt) < PRICE_FRESH_MS;

/* -------------------------------- tiers -------------------------------- */

export type PriceTier = "entry" | "budget" | "value" | "mid" | "performance" | "premium" | "professional";
export const TIERS: PriceTier[] = ["entry", "budget", "value", "mid", "performance", "premium", "professional"];
export const TIER_LABEL: Record<PriceTier, { en: string; id: string }> = {
  entry: { en: "Entry Level", id: "Entry level" }, budget: { en: "Budget", id: "Hemat" }, value: { en: "Value for Money", id: "Value for money" },
  mid: { en: "Mid Range", id: "Kelas menengah" }, performance: { en: "Performance", id: "Performa" }, premium: { en: "Premium", id: "Premium" }, professional: { en: "Professional", id: "Profesional" },
};

/**
 * Upper bounds (IDR, exclusive) for entry → premium; above the last bound is "professional".
 * Based on price only — never on brand reputation. Editable here (and shown in Admin → Parts).
 */
export const TIER_BOUNDS: Partial<Record<PartCategory, [number, number, number, number, number, number]>> & { default: [number, number, number, number, number, number] } = {
  default: [150_000, 400_000, 900_000, 2_000_000, 4_000_000, 8_000_000],
  wheelset: [1_500_000, 3_000_000, 5_500_000, 10_000_000, 18_000_000, 30_000_000],
  groupset: [1_500_000, 3_500_000, 6_000_000, 10_000_000, 18_000_000, 30_000_000],
  fork: [1_000_000, 2_500_000, 5_000_000, 9_000_000, 14_000_000, 20_000_000],
  suspension: [1_000_000, 2_500_000, 5_000_000, 9_000_000, 14_000_000, 20_000_000],
  crankset: [400_000, 900_000, 2_000_000, 4_000_000, 7_000_000, 12_000_000],
  derailleur: [250_000, 600_000, 1_200_000, 2_500_000, 5_000_000, 9_000_000],
  shifter: [250_000, 600_000, 1_200_000, 2_500_000, 5_000_000, 9_000_000],
  brakes: [250_000, 600_000, 1_200_000, 2_500_000, 4_500_000, 8_000_000],
  hub: [300_000, 800_000, 1_800_000, 3_500_000, 6_000_000, 10_000_000],
  rim: [300_000, 800_000, 1_800_000, 3_500_000, 6_000_000, 10_000_000],
  handlebar: [150_000, 400_000, 900_000, 2_000_000, 4_000_000, 7_000_000],
  seatpost: [150_000, 400_000, 900_000, 2_000_000, 4_000_000, 7_000_000],
  saddle: [150_000, 400_000, 900_000, 2_000_000, 3_500_000, 6_000_000],
  tires: [100_000, 250_000, 500_000, 900_000, 1_400_000, 2_200_000],
  bearing: [30_000, 80_000, 200_000, 500_000, 1_000_000, 2_000_000],
  chain: [80_000, 200_000, 400_000, 700_000, 1_100_000, 1_800_000],
  cassette: [150_000, 400_000, 900_000, 1_800_000, 3_500_000, 6_000_000],
};

export function tierFor(idr: number | null, category: PartCategory | null): PriceTier | null {
  if (idr == null) return null;
  const b = (category && TIER_BOUNDS[category]) || TIER_BOUNDS.default;
  const i = b.findIndex((x) => idr < x);
  return TIERS[i < 0 ? 6 : i];
}

export const offerIdr = (o: Offer) => toIdr(o.price);
