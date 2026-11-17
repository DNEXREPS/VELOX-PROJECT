/**
 * Extract compatibility-relevant specifications from listing text (title + description).
 * Conservative: a value is only returned when the text states it in a recognised form.
 * Everything extracted here is "listing-text" basis — never treated as manufacturer-verified.
 */
import type { PartSpecs } from "./types";

const num = (s: string) => Number(s.replace(",", "."));

export function stripHtml(html: string): string {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|li|div|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&times;/g, "x").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim();
}

function wheelSize(t: string): string | null {
  if (/\b700\s*c\b|\b700\s*[x×]\s*\d{2}|\b\d{2}-622\b|\b622\s*mm\b|\b622x/i.test(t)) return "700c";
  if (/\b29(?:er|\s*(?:"|''|inch|in\b|”))|\b29\s*[x×]\s*\d/i.test(t)) return "29";
  if (/\b27\.5\b|\b650\s*b\b|\b\d{2}-584\b|\b584\s*mm\b/i.test(t)) return "27.5";
  if (/\b26(?:\s*(?:"|''|inch|in\b|”))|\b26\s*[x×]\s*\d\.\d/i.test(t)) return "26";
  if (/\b451\b/.test(t)) return "451";
  if (/\b406\b|\b20(?:\s*(?:"|''|inch|in\b|”))|\b20\s*[x×]\s*\d\.\d/i.test(t)) return "20";
  return null;
}

function tireWidth(t: string): number | null {
  let m = t.match(/\b700\s*[x×]\s*(\d{2})\s*c?\b/i) ?? t.match(/\b(\d{2})-(?:622|584|559)\b/);
  if (m) return Number(m[1]);
  m = t.match(/\b(?:29|27\.5|26|20)\s*[x×]\s*(\d\.\d{1,2})\b/i);
  if (m) return Math.round(num(m[1]) * 25.4);
  return null;
}

function axles(t: string): { front: string | null; rear: string | null } {
  let front: string | null = null, rear: string | null = null;
  const thru = [...t.matchAll(/\b(12|15|20)\s*[x×]\s*(100|110|135|142|148|157)\b|\b(100|110|142|148|157)\s*[x×]\s*(12|15|20)\b/gi)];
  for (const m of thru) {
    const d = m[1] ? Number(m[1]) : Number(m[4]); const w = m[2] ? Number(m[2]) : Number(m[3]);
    const v = `${d}x${w}`;
    if (w <= 110) front ??= v; else rear ??= v;
  }
  if (/\bboost\b/i.test(t)) { front ??= /\b15\s*mm\b/.test(t) ? "15x110" : null; rear ??= "12x148"; }
  const qr = [...t.matchAll(/\b(?:qr|quick[- ]release)\s*(100|130|135)\b|\b(100|130|135)\s*(?:mm\s*)?qr\b/gi)];
  for (const m of qr) { const w = Number(m[1] ?? m[2]); if (w === 100) front ??= "100QR"; else rear ??= `${w}QR`; }
  return { front, rear };
}

function freehubs(t: string): string[] | null {
  const out = new Set<string>();
  if (/\bxdr\b/i.test(t)) out.add("XDR");
  if (/\bxd\b(?!r)/i.test(t)) out.add("XD");
  if (/micro\s*spline/i.test(t)) out.add("MicroSpline");
  if (/\bn3w\b/i.test(t)) out.add("N3W");
  if (/\bcampag(?:nolo)?\b(?!.*\bhub\b)|\bcampy\b/i.test(t) && /freehub|driver|body|cassette|compatible|wheel/i.test(t)) out.add("Campagnolo");
  if (/\b(shimano|sram)\s*(hg|11|10|8-?11|8\/9\/10\/11|road)\b|\bhg\b|\bhg\s*11\b|shimano\/sram\b/i.test(t)) out.add("HG");
  return out.size ? [...out] : null;
}

function bbStandard(t: string): string | null {
  if (/\bt47\b/i.test(t)) return "T47";
  if (/\bbb\s*386\s*(evo)?\b/i.test(t)) return "BB386EVO";
  if (/\bpf\s*30\b|\bpressfit\s*30\b/i.test(t)) return "PF30";
  if (/\bbb\s*30\b/i.test(t)) return "BB30";
  if (/\bbb\s*92\b|\bpf\s*92\b/i.test(t)) return "BB92";
  if (/\bbb\s*86\b|\bpf\s*86\b|\bpf\s*41\b/i.test(t)) return "BB86";
  if (/\bbbright\b/i.test(t)) return "BBright";
  if (/\bbsa\b|\benglish thread|\bitalian thread|\bita\b|\bthreaded\b|\b68\s*\/\s*73\b|\b1\.37\s*[x×]\s*24/i.test(t)) {
    if (/\bita(lian)?\b/i.test(t)) return "ITA-70";
    return /\b73\s*mm\b/.test(t) && !/\b68\s*\/?\s*73\b/.test(t) ? "BSA-73" : "BSA-68";
  }
  return null;
}

function spindle(t: string): string | null {
  if (/\bdub\b/i.test(t)) return "DUB";
  if (/hollowtech|\b24\s*mm\s*(spindle|axle)|\bfor\s+24\s*mm\b|\b24mm\b/i.test(t)) return "24mm";
  if (/\b30\s*mm\s*(spindle|axle)|\bfor\s+30\s*mm\b/i.test(t)) return "30mm";
  if (/square\s*taper|\bjis\b/i.test(t)) return "square-taper";
  if (/ultra[- ]torque/i.test(t)) return "Campagnolo-UT";
  return null;
}

function speeds(t: string): number | null {
  const m = t.match(/\b(1[0-3]|[7-9])\s*(?:-|\s)?(?:speed|spd|sp|s)\b|\b(1[0-3]|[7-9])v\b|\b(?:1|2)\s*[x×]\s*(1[0-3]|[7-9])\b/i);
  return m ? Number(m[1] ?? m[2] ?? m[3]) : null;
}

const mm = (re: RegExp, t: string) => { const m = t.match(re); return m ? num(m[1]) : null; };

export function extractSpecs(raw: string): PartSpecs {
  const t = raw.replace(/\s+/g, " ");
  const { front, rear } = axles(t);
  const specs: PartSpecs = { basis: "listing-text" };
  specs.wheelSize = wheelSize(t);
  specs.tireWidthMm = tireWidth(t);
  specs.frontAxle = front;
  specs.rearAxle = rear;
  specs.freehubs = freehubs(t);
  specs.brakeInterface = /\bdisc\b|\bdisk\b|\bcenter\s*lock\b|\bcentre\s*lock\b|\b6[- ]bolt\b|\bcakram\b/i.test(t) ? "disc" : /\brim\s*brake\b|\bcaliper\s*brake\b|\bv-?brake\b|\brem\s*kaliper\b/i.test(t) ? "rim" : null;
  specs.rotorMount = /cent(er|re)\s*-?\s*lock/i.test(t) ? "centerlock" : /\b6[- ]bolt\b|\bsix[- ]bolt\b|\bis\s*mount\b/i.test(t) ? "6-bolt" : null;
  specs.speeds = speeds(t);
  specs.bbStandard = bbStandard(t);
  specs.spindle = spindle(t);
  specs.barClampMm = mm(/\b(31\.8|35|25\.4|26\.0|26)\s*mm\s*(?:clamp|bar|handlebar)|\bclamp(?:ing)?(?: diameter)?\s*[:\-]?\s*(31\.8|35|25\.4)\b/i, t) ?? mm(/(?:clamp|bar)[^.\n]{0,20}?\b(31\.8|35|25\.4)\s*mm/i, t);
  if (specs.barClampMm == null) { const m = t.match(/\b(31\.8|25\.4)\s*mm\b/); if (m) specs.barClampMm = num(m[1]); }
  specs.steererMm = /1[- ]?1\/8|1\s*⅛|28\.6\s*mm/i.test(t) ? 28.6 : /\btapered\b/i.test(t) ? 28.6 : null;
  specs.seatpostMm = mm(/\b(27\.2|30\.9|31\.6|34\.9|25\.4)\s*mm/i, t);
  if (specs.seatpostMm === 25.4 || (specs.seatpostMm && specs.barClampMm === specs.seatpostMm)) specs.seatpostMm = /seat\s*post|tiang sadel/i.test(t) ? specs.seatpostMm : null;
  specs.internalRimMm = mm(/\b(?:internal|inner|inside)\s*(?:rim\s*)?width\s*[:\-]?\s*(\d{2}(?:\.\d)?)\s*mm/i, t) ?? mm(/\b(\d{2}(?:\.\d)?)\s*mm\s*(?:internal|inner|id)\b/i, t) ?? mm(/\bid\s*[:\-]?\s*(\d{2}(?:\.\d)?)\s*mm/i, t);
  specs.rimDepthMm = mm(/\b(?:rim\s*)?depth\s*[:\-]?\s*(\d{2})\s*mm/i, t) ?? mm(/\b(\d{2})\s*mm\s*(?:deep|depth|profile)\b/i, t);
  const w = t.match(/\b(?:weight|berat|wt)\s*[:\-]?\s*(?:approx\.?\s*|~\s*|±\s*)?(\d{1,2}[.,]?\d{2,3})\s*(g|gr|gram|grams|kg)\b/i) ?? t.match(/\b(\d{3,4})\s*(g|gr|gram|grams)\b/i);
  if (w) { const v = num(w[1].replace(/[.,](?=\d{3}\b)/, "")); specs.weightG = /kg/i.test(w[2]) ? Math.round(v * 1000) : Math.round(v); if (specs.weightG < 5 || specs.weightG > 30000) specs.weightG = null; }
  specs.material = /\bcarbon\b|\bkarbon\b/i.test(t) ? "Carbon" : /\btitanium\b|\bti\b/i.test(t) ? "Titanium" : /\balloy\b|\balumin(i?)um\b|\b6061\b|\b7075\b|\balloi\b/i.test(t) ? "Aluminium" : /\bsteel\b|\bbaja\b|\bcro-?mo\b|\bchromoly\b/i.test(t) ? "Steel" : null;
  specs.tubeless = /\btubeless\b|\btlr\b|\btl[- ]ready\b|\btubeless[- ]ready\b/i.test(t) ? true : null;
  const brg = new Set<string>();
  // designations such as 6902-2RS, 61803, MR15267 — only in text that is about bearings
  if (/bearing|laher|2rs|llb/i.test(t)) for (const m of t.matchAll(/\b((?:6[0-9]{3,4}|MR\s?\d{4,5})(?:-?2RS|-?LLB|-?LLU|-?RS)?)\b/gi)) { const d = m[1].replace(/\s/g, "").toUpperCase(); if (!/^6061|^6063/.test(d)) brg.add(d); }
  for (const m of t.matchAll(/\b(\d{1,2}(?:\.\d{1,2})?)\s*[x×]\s*(\d{2}(?:\.\d{1,2})?)\s*[x×]\s*(\d{1,2}(?:\.\d{1,2})?)\s*mm\b/gi)) brg.add(`${m[1]}x${m[2]}x${m[3]}`);
  specs.bearings = brg.size && /bearing|laher|2rs|llb/i.test(t) ? [...brg].slice(0, 8) : null;
  const cog = t.match(/\b(1[01]|9|10)\s*-\s*(2[3-9]|3\d|4\d|5[0-2])\s*t?\b/);
  specs.cogRange = cog && /cassette|sprocket|sproket|gir|cog|\d+t\b/i.test(t) ? `${cog[1]}-${cog[2]}` : null;
  return specs;
}

/** Merge specs, preferring values from `primary`. */
export function mergeSpecs(primary: PartSpecs, secondary: PartSpecs): PartSpecs {
  const out: PartSpecs = { ...secondary };
  for (const [k, v] of Object.entries(primary)) if (v != null && !(Array.isArray(v) && !v.length)) (out as Record<string, unknown>)[k] = v;
  return out;
}
