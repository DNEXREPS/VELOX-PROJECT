import type { PriceEntry, PriceType, VerificationStatus } from "./types";

export const NA = "Not Available";

export type Currency = "IDR" | "USD";
/** Demo conversion only — clearly labelled in the UI. */
export const DEMO_USD_RATE = 16_000;

export function formatMoney(amount: number | null | undefined, currency: Currency = "IDR"): string {
  if (amount == null || Number.isNaN(amount)) return NA;
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount / DEMO_USD_RATE);
  }
  return "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount);
}

/** Compact IDR, e.g. Rp 13,5 jt */
export function formatIdrShort(amount: number | null | undefined): string {
  if (amount == null) return NA;
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return `Rp ${amount}`;
}

export function formatPrice(p: PriceEntry | null | undefined, currency: Currency = "IDR"): string {
  if (!p) return NA;
  if (p.amount === 0 && p.note) return p.note;
  return formatMoney(p.amount, currency);
}

export function formatWeightG(g: number | null | undefined): string {
  if (g == null) return NA;
  if (g >= 1000) return `${(g / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
  return `${g} g`;
}

export function formatWeightKg(kg: number | null | undefined): string {
  if (kg == null) return NA;
  return `${kg.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
}

export const show = (v: unknown): string => {
  if (v == null || v === "") return NA;
  if (Array.isArray(v)) return v.length ? v.join(", ") : NA;
  return String(v);
};

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  msrp: "Manufacturer MSRP",
  distributor: "Authorised distributor",
  retailer: "Retailer price",
  estimated: "Estimated",
  historical: "Historical",
};

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  community: "Community Submitted",
  unverified: "Unverified",
  discontinued: "Discontinued",
  archived: "Archived",
};

export const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
