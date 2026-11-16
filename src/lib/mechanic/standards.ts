import type { Component } from "../types";

/**
 * Reference data for bearing identification.
 * Bottom-bracket shell figures are the published dimensions of each standard.
 * Bearing fitment varies by cup/brand, so VELOX lists "typical" bearings and always asks
 * the rider to measure or read markings before naming a part.
 */

export interface BBStandardRef {
  id: string;
  name: string;
  type: "threaded" | "press-fit" | "direct-bearing";
  shell: string; // shell width
  bore: string; // shell bore / thread
  typical: string;
  notes: string;
}

export const BB_STANDARDS: BBStandardRef[] = [
  { id: "BSA", name: "BSA / English threaded (BSC)", type: "threaded", shell: "68 mm road · 73 mm MTB · 83 mm DH", bore: "1.37\" × 24 TPI (≈34.8 mm); drive side left-hand thread", typical: "External cups; 24 mm spindles commonly use 24×37×7 bearings", notes: "Most serviceable standard. Cup bearing size depends on the BB model — measure or check the BB maker." },
  { id: "ITA", name: "Italian threaded", type: "threaded", shell: "70 mm", bore: "M36 × 24 TPI, both sides right-hand thread", typical: "External cups", notes: "Mostly Italian road frames." },
  { id: "T47", name: "T47", type: "threaded", shell: "68 mm (external) · 77 / 85.5 / 86.5 mm (internal)", bore: "M47 × 1 mm thread", typical: "Fits 24 mm, DUB and 30 mm spindles depending on the BB", notes: "Threaded alternative to press-fit with room for larger spindles." },
  { id: "BB86", name: "BB86 / PF86 (Shimano press-fit)", type: "press-fit", shell: "86.5 mm road (BB92: 89.5 / 92 mm MTB)", bore: "41 mm", typical: "Cups with 24 mm or DUB bearings", notes: "Creaks are often fit-related; thread-together press-fit BBs can help." },
  { id: "BB92", name: "BB92 / PF92", type: "press-fit", shell: "89.5 / 92 mm", bore: "41 mm", typical: "Cups with 24 mm or DUB bearings", notes: "MTB version of BB86." },
  { id: "PF30", name: "PF30", type: "press-fit", shell: "68 / 73 mm", bore: "46 mm", typical: "Cups holding 30 mm-ID bearings (often 6806)", notes: "Adapters exist for 24 mm cranks; check the cup maker." },
  { id: "BB30", name: "BB30", type: "direct-bearing", shell: "68 / 73 mm", bore: "42 mm (bearings press directly into the shell)", typical: "6806 (30 × 42 × 7) pressed into the shell with circlips", notes: "BB30A is an asymmetric 73 mm variant." },
  { id: "BB386EVO", name: "BB386EVO", type: "press-fit", shell: "86.5 mm", bore: "46 mm", typical: "30 mm-spindle cups", notes: "FSA-originated standard." },
  { id: "BBRIGHT", name: "BBright", type: "press-fit", shell: "79 mm", bore: "46 mm (press-fit version)", typical: "30 mm-spindle cups", notes: "Cervélo asymmetric standard." },
];

/**
 * SHIS (Standardized Headset Identification System) code format.
 * IS = integrated, ZS = zero-stack, EC = external cup; the number is the head-tube bore (mm);
 * after the slash is the steerer diameter (28.6 = 1-1/8", 30 = Campagnolo-style, 39.8/40 = 1.5").
 * Example: "ZS44/28.6 | EC44/40" = tapered head tube, zero-stack top, external-cup bottom.
 */
export function parseShis(code: string): Array<{ position: "top" | "bottom"; type: string; bore: number; steerer: number; meaning: string }> | null {
  const parts = code.toUpperCase().replace(/\s+/g, "").split("|").filter(Boolean);
  if (!parts.length || parts.length > 2) return null;
  const out = [];
  for (const [i, p] of parts.entries()) {
    const m = /^(IS|ZS|EC)(\d{2}(?:\.\d)?)\/(\d{2}(?:\.\d+)?)$/.exec(p);
    if (!m) return null;
    const type = { IS: "Integrated (bearing sits in the frame's angled seat)", ZS: "Zero-stack (cup pressed inside the head tube)", EC: "External cup (cup sits outside the head tube)" }[m[1] as "IS" | "ZS" | "EC"];
    const steerer = Number(m[3]);
    out.push({ position: (i === 0 ? "top" : "bottom") as "top" | "bottom", type, bore: Number(m[2]), steerer, meaning: `${m[2]} mm head-tube bore, ${steerer === 28.6 ? '1-1/8"' : steerer >= 39 ? '1.5"' : `${steerer} mm`} steerer` });
  }
  return out;
}

export interface BearingQuery {
  innerMm?: number | null;
  outerMm?: number | null;
  widthMm?: number | null;
  marking?: string | null;
  location?: string | null;
  tolerance?: number; // mm
}

export interface BearingMatch {
  bearing: Component;
  exact: boolean;
  deltas: { inner: number | null; outer: number | null; width: number | null };
  basis: string;
}

/** Match a bearing by its markings and/or measured dimensions. Never from a photo alone. */
export function matchBearings(q: BearingQuery, bearings: Component[]): BearingMatch[] {
  const tol = q.tolerance ?? 0.3;
  // strip seal suffixes (2RS, LLB, ZZ…) and map ISO "618xx/619xx" naming to the common "68xx/69xx"
  let marking = q.marking?.toUpperCase().replace(/[\s-]/g, "").replace(/(2RS1|2RSH|2RS|LLB|LLU|DDU|VRS|ZZ|RS|2Z)$/g, "") ?? "";
  if (/^61[89]\d{2}$/.test(marking)) marking = "6" + marking.slice(2);
  const out: BearingMatch[] = [];
  for (const b of bearings) {
    const s = b.bearing;
    if (!s) continue;
    const des = s.designation.toUpperCase().replace(/[\s-]/g, "");
    if (marking && des === marking) {
      out.push({ bearing: b, exact: true, deltas: { inner: null, outer: null, width: null }, basis: `Marking “${q.marking}” matches designation ${s.designation}` });
      continue;
    }
    const dims = [q.innerMm, q.outerMm, q.widthMm];
    if (dims.every((d) => d == null)) continue;
    const di = q.innerMm != null ? q.innerMm - s.innerMm : null;
    const dO = q.outerMm != null ? q.outerMm - s.outerMm : null;
    const dw = q.widthMm != null ? q.widthMm - s.widthMm : null;
    const ok = [di, dO, dw].every((d) => d == null || Math.abs(d) <= tol);
    if (!ok) continue;
    const given = dims.filter((d) => d != null).length;
    out.push({ bearing: b, exact: given === 3 && [di, dO, dw].every((d) => d != null && Math.abs(d) < 0.05), deltas: { inner: di, outer: dO, width: dw }, basis: `Measured ${given}/3 dimensions within ±${tol} mm` });
  }
  return out.sort((a, b) => Number(b.exact) - Number(a.exact) || sum(a) - sum(b));
}
const sum = (m: BearingMatch) => Math.abs(m.deltas.inner ?? 0) + Math.abs(m.deltas.outer ?? 0) + Math.abs(m.deltas.width ?? 0);
