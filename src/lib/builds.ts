import type { Build, BuildSelection, Component, ComponentType, Discipline } from "./types";
import { checkBuild, type CompatReport, type Selection } from "./compat";

export const SLOT_GROUPS: Array<{ title: string; slots: ComponentType[] }> = [
  { title: "Frameset", slots: ["frame", "fork"] },
  { title: "Drivetrain", slots: ["groupset", "shifters", "front-derailleur", "rear-derailleur", "crankset", "cassette", "chain"] },
  { title: "Brakes & rolling", slots: ["brakes", "wheelset", "tires"] },
  { title: "Cockpit & contact points", slots: ["handlebar", "stem", "saddle", "seatpost", "pedals"] },
];

export const SLOT_LABEL: Record<ComponentType, string> = {
  frame: "Frame", fork: "Fork", groupset: "Groupset", shifters: "Shifters", "front-derailleur": "Front derailleur", "rear-derailleur": "Rear derailleur",
  crankset: "Crankset", cassette: "Cassette", chain: "Chain", brakes: "Brakes", wheelset: "Wheelset", tires: "Tyres", handlebar: "Handlebar",
  stem: "Stem", saddle: "Saddle", seatpost: "Seatpost", pedals: "Pedals", accessory: "Accessories",
};

export function resolveSelection(sel: BuildSelection, byId: Map<string, Component>): Selection {
  const out: Selection = {};
  for (const [slot, id] of Object.entries(sel)) {
    if (!id) continue;
    const c = byId.get(id);
    if (c) out[slot as ComponentType] = c;
  }
  return out;
}

export interface BuildSummary {
  parts: Component[];
  accessories: Component[];
  price: number;
  pricedCount: number;
  unpricedCount: number;
  weightG: number;
  weightKnown: number;
  weightMissing: number;
  report: CompatReport;
}

/** Totals exclude the groupset slot itself: it is a kit reference whose parts are counted individually. */
export function summarize(build: Pick<Build, "selection" | "accessories">, byId: Map<string, Component>): BuildSummary {
  const sel = resolveSelection(build.selection, byId);
  const parts = Object.entries(sel).filter(([slot]) => slot !== "groupset").map(([, c]) => c!) as Component[];
  const accessories = build.accessories.map((id) => byId.get(id)).filter(Boolean) as Component[];
  const all = [...parts, ...accessories];
  let price = 0, pricedCount = 0, unpricedCount = 0, weightG = 0, weightKnown = 0, weightMissing = 0;
  for (const c of all) {
    if (c.price?.amount != null) { price += c.price.amount; pricedCount++; } else unpricedCount++;
    if (c.weightG != null) { weightG += c.weightG; weightKnown++; } else weightMissing++;
  }
  return { parts, accessories, price, pricedCount, unpricedCount, weightG, weightKnown, weightMissing, report: checkBuild(sel) };
}

export function applyKit(selection: BuildSelection, groupset: Component): BuildSelection {
  const next: BuildSelection = { ...selection, groupset: groupset.id };
  const kitSlots: ComponentType[] = ["shifters", "front-derailleur", "rear-derailleur", "crankset", "cassette", "chain", "brakes"];
  for (const slot of kitSlots) {
    const id = groupset.kit?.[slot];
    if (id) next[slot] = id;
    else if (slot === "front-derailleur" && groupset.compat.chainrings === 1) delete next[slot];
  }
  return next;
}

export function disciplineMatches(c: Component, d: Discipline) {
  return c.discipline.includes(d) || c.discipline.includes("universal") || (d === "gravel" && c.discipline.includes("road") && c.type !== "frame" && c.type !== "fork" && c.type !== "tires" && c.type !== "wheelset");
}

export function buildToText(build: Build, s: BuildSummary, labelFor: (c: Component) => string, fmtPrice: (n: number | null | undefined) => string): string {
  const lines = [
    `VELOX BUILD SUMMARY — ${build.name}`,
    `Discipline: ${build.discipline}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    ...s.parts.map((c) => `${c.type.padEnd(18)} ${labelFor(c)}  |  ${fmtPrice(c.price?.amount)}  |  ${c.weightG != null ? c.weightG + " g" : "weight n/a"}`),
    ...s.accessories.map((c) => `${"accessory".padEnd(18)} ${labelFor(c)}  |  ${fmtPrice(c.price?.amount)}`),
    "",
    `Estimated total: ${fmtPrice(s.price)} (${s.unpricedCount} item(s) without price)`,
    `Listed weight: ${(s.weightG / 1000).toFixed(2)} kg (${s.weightMissing} item(s) without weight data)`,
    `Compatibility: ${s.report.overall}`,
    ...s.report.checks.filter((c) => c.status !== "compatible").map((c) => `  - [${c.status}] ${c.label}: ${c.message}`),
    "",
    "Prices are VELOX estimates in IDR, not official prices. Verify compatibility with the manufacturer before purchase.",
  ];
  return lines.join("\n");
}
