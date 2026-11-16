/**
 * Local (rule-based) diagnostic engine for VELOX AI Mechanic.
 * Deterministic, offline, explainable. When an AI provider is connected, its output is
 * layered on top of — and checked against — this engine's result.
 */
import { CAUSES, QUESTIONS, SAFETY_SYSTEMS, SYMPTOM_KEYWORDS, SYSTEM_KEYWORDS, SYSTEM_LABEL, type Cause, type Question, type Symptom, type System } from "./knowledge";
import type { CompatAttrs, Component, ComponentType } from "../types";

export interface DiagnoseInput {
  text: string;
  answers: Record<string, string>;
  /** systems the rider explicitly selected */
  systems?: System[];
  /** known bike data (from My Garage / catalogue) */
  bike?: { label: string; compat: CompatAttrs; groupset?: string | null; brakes?: string | null } | null;
  imageCount?: number;
}

export interface RankedCause extends Omit<Cause, "answers" | "symptoms" | "base"> {
  score: number;
  band: "likely" | "possible";
  evidence: string[];
}

export interface Diagnosis {
  systems: Array<{ system: System; label: string; weight: number }>;
  symptoms: Symptom[];
  confirmed: string[]; // facts from rider answers or bike data — not diagnoses
  likely: RankedCause[];
  possible: RankedCause[];
  unknown: string[];
  followUps: Question[];
  safety: { level: "stop" | "caution" | "none"; message: string | null };
  complexity: Cause["complexity"] | null;
  bearingRelated: boolean;
  componentTypes: ComponentType[];
}

const contains = (text: string, kw: string) => {
  const t = ` ${text} `;
  return kw.length <= 3 ? new RegExp(`[^a-z]${kw}[^a-z]`).test(t) : t.includes(kw);
};

export function detectSystems(text: string): Map<System, number> {
  const t = text.toLowerCase();
  const out = new Map<System, number>();
  for (const [sys, kws] of Object.entries(SYSTEM_KEYWORDS) as Array<[System, string[]]>) {
    const hits = kws.filter((k) => contains(t, k)).length;
    if (hits) out.set(sys, hits);
  }
  // "hub" or "wheel" mentions with front/rear qualifiers
  if (out.has("front-hub") || out.has("rear-hub")) out.set("wheel-bearings", (out.get("wheel-bearings") ?? 0) + 1);
  return out;
}

export function detectSymptoms(text: string): Symptom[] {
  const t = text.toLowerCase();
  return (Object.entries(SYMPTOM_KEYWORDS) as Array<[Symptom, string[]]>).filter(([, kws]) => kws.some((k) => contains(t, k))).map(([s]) => s);
}

const RELATED: Partial<Record<System, System[]>> = {
  "front-hub": ["wheel-bearings"], "rear-hub": ["wheel-bearings", "freehub"], "wheel-bearings": ["freehub"], "bottom-bracket": ["crankset", "pedals", "seatpost"],
  crankset: ["bottom-bracket", "pedals"], derailleurs: ["chain", "cassette"], chain: ["cassette", "derailleurs"], cassette: ["chain", "freehub"],
  brakes: ["rotors"], rotors: ["brakes"], fork: ["suspension", "headset"], suspension: ["fork"], headset: ["cockpit", "fork"],
};

export function diagnose(input: DiagnoseInput): Diagnosis {
  const text = input.text ?? "";
  const sysHits = detectSystems(text);
  for (const s of input.systems ?? []) sysHits.set(s, (sysHits.get(s) ?? 0) + 3);
  for (const [s, w] of [...sysHits]) for (const r of RELATED[s] ?? []) if (!sysHits.has(r)) sysHits.set(r, Math.max(0.5, w * 0.3));
  const symptoms = detectSymptoms(text);
  const answers = input.answers ?? {};

  const scored: RankedCause[] = [];
  for (const c of CAUSES) {
    const sysWeight = sysHits.get(c.system) ?? 0;
    const symptomScore = symptoms.reduce((s, sym) => s + (c.symptoms[sym] ?? 0), 0);
    if (!sysWeight && symptomScore < 0.3) continue;
    let score = c.base * (sysWeight ? Math.min(1.2, 0.6 + sysWeight * 0.2) : 0.4) + symptomScore;
    const evidence: string[] = [];
    if (sysWeight >= 1) evidence.push(`You mentioned the ${SYSTEM_LABEL[c.system].toLowerCase()}`);
    for (const sym of symptoms) if (c.symptoms[sym]) evidence.push(`Symptom: ${sym}`);
    for (const a of c.answers ?? []) {
      if (answers[a.q] === a.a) {
        score += a.delta;
        evidence.push(`${QUESTIONS.find((q) => q.id === a.q)?.text.split("?")[0]}: “${a.a}”`);
      }
    }
    // negative evidence
    if (c.bearing && c.system === "wheel-bearings" && answers["wheel-play"] === "No play" && answers["wheel-spin"] === "Smooth and quiet") score -= 0.3;
    if (c.system === "headset" && answers["headset-brake-test"] === "No clunk" && c.id === "headset-loose") score -= 0.3;
    if (c.id === "chain-worn" && answers["chain-wear"] === "Checker shows OK") score -= 0.35;
    if (score <= 0.12) continue;
    const { answers: _a, symptoms: _s, base: _b, ...rest } = c;
    void _a; void _s; void _b;
    scored.push({ ...rest, score: Math.min(0.99, score), band: "possible", evidence });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.score ?? 0;
  for (const c of scored) c.band = c.score >= 0.55 && c.score >= top - 0.15 ? "likely" : "possible";

  const likely = scored.filter((c) => c.band === "likely").slice(0, 3);
  const possible = scored.filter((c) => c.band === "possible").slice(0, 5);

  // follow-ups: unanswered questions relevant to the top systems
  const focus = new Set([...likely, ...possible].slice(0, 4).map((c) => c.system));
  for (const [s, w] of sysHits) if (w >= 1) focus.add(s);
  const followUps = QUESTIONS.filter((q) => !answers[q.id] && q.systems.some((s) => focus.has(s))).slice(0, 4);

  const confirmed: string[] = [];
  for (const [qid, a] of Object.entries(answers)) {
    const q = QUESTIONS.find((x) => x.id === qid);
    if (q && a) confirmed.push(`You reported — ${q.text.replace(/\?$/, "")}: ${a}`);
  }
  if (input.bike) {
    const b = input.bike.compat;
    const facts: Array<[string, unknown]> = [["BB standard", b.bbStandard], ["Brakes", input.bike.brakes ?? b.brakeType], ["Rear axle", b.rearAxle], ["Freehub", b.freehub], ["Steerer", b.steerer], ["Groupset", input.bike.groupset]];
    for (const [k, v] of facts) if (v) confirmed.push(`Catalogue data for ${input.bike.label} — ${k}: ${v} (catalogue record, verify on the bike)`);
  }

  const unknown: string[] = [];
  const all = [...likely, ...possible];
  if (all.some((c) => c.bearing)) unknown.push("Exact bearing size — needs the hub/BB/headset model or measured ID × OD × width (or the marking on the bearing seal).");
  if (input.bike && all.some((c) => c.system === "bottom-bracket") && !input.bike.compat.bbStandard) unknown.push("Your frame's bottom-bracket standard is not in the catalogue.");
  if (!input.bike) unknown.push("Bike model — select one from My Garage or the catalogue so VELOX can check part compatibility.");
  if (input.imageCount) unknown.push(`${input.imageCount} photo(s) attached — photos can show context, but the local engine does not analyse images and no part is identified from a photo alone.`);
  if (!all.length) unknown.push("Not enough detail to suggest causes — describe the sound, when it happens, and which part of the bike it seems to come from.");

  const involvesSafety = all.find((c) => c.safety === "stop" && c.score >= 0.35) ?? all.find((c) => SAFETY_SYSTEMS.includes(c.system) && c.score >= 0.45);
  const anySafetySystem = [...sysHits.keys()].some((s) => SAFETY_SYSTEMS.includes(s));
  const safety: Diagnosis["safety"] = involvesSafety
    ? { level: "stop", message: `This could affect ${SYSTEM_LABEL[involvesSafety.system].toLowerCase()} — ${["brakes", "rotors"].includes(involvesSafety.system) ? "braking" : ["frame", "fork"].includes(involvesSafety.system) ? "structural integrity" : "steering"}. Stop riding the bike until it has been inspected by a qualified mechanic.` }
    : anySafetySystem
      ? { level: "caution", message: "The area you describe is safety-related (braking, steering or structure). If in any doubt, don't ride until it has been checked." }
      : { level: "none", message: null };

  const order: Cause["complexity"][] = ["Easy (home)", "Moderate (basic tools)", "Advanced (special tools)", "Workshop recommended"];
  const complexity = likely[0]?.complexity ?? possible[0]?.complexity ?? null;
  void order;

  return {
    systems: [...sysHits.entries()].sort((a, b) => b[1] - a[1]).map(([system, weight]) => ({ system, label: SYSTEM_LABEL[system], weight })),
    symptoms,
    confirmed,
    likely,
    possible,
    unknown,
    followUps,
    safety,
    complexity,
    bearingRelated: all.some((c) => c.bearing),
    componentTypes: Array.from(new Set(all.slice(0, 4).flatMap((c) => c.components))),
  };
}

/** Catalogue parts relevant to the diagnosis, for the "possible replacements" panel. */
export function suggestReplacements(d: Diagnosis, catalog: Component[], discipline?: string | null): Component[] {
  const types: ComponentType[] = d.componentTypes.filter((t) => t !== "frame" && t !== "bearing");
  return catalog
    .filter((c) => types.includes(c.type as ComponentType) && c.provenance.status !== "archived" && (!discipline || c.discipline.includes(discipline as never) || c.discipline.includes("universal")))
    .slice(0, 12);
}
