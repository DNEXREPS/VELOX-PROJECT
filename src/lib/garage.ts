import type { GarageBike } from "./types";

/**
 * Rough resale estimate: 15 %/yr straight depreciation from the purchase price, floored at 25 %,
 * plus half the recorded cost of component upgrades. Always presented as an estimate.
 */
export function estimateValue(b: GarageBike, now = new Date()): { value: number | null; basis: string } {
  if (!b.purchasePriceIdr) return { value: null, basis: "Add a purchase price to estimate value." };
  const age = b.purchaseYear ? Math.max(0, now.getFullYear() - b.purchaseYear) : 0;
  const factor = Math.max(0.25, Math.pow(0.85, age));
  const upgrades = b.log.filter((l) => l.kind === "component-change" || l.kind === "modification").reduce((s, l) => s + (l.costIdr ?? 0), 0);
  const value = Math.round((b.purchasePriceIdr * factor + upgrades * 0.5) / 50_000) * 50_000;
  return { value, basis: `${Math.round(factor * 100)}% of purchase price after ${age} year${age === 1 ? "" : "s"}${upgrades ? " + 50% of recorded upgrade spend" : ""}` };
}
