import type { ComponentType } from "@/lib/types";
import type { PartCategory } from "./types";

export interface CategoryDef {
  id: PartCategory;
  en: string;
  id_: string;
  /** keywords (lower-case, word-boundary matched) in English and Indonesian */
  words: string[];
  /** VELOX catalogue component types that belong to this category */
  types: ComponentType[];
}

/** Order matters: more specific categories first (e.g. "freehub" before "hub", "rotor" before "brakes"). */
export const PART_CATEGORIES: CategoryDef[] = [
  { id: "bottom-bracket", en: "Bottom brackets", id_: "Bottom bracket (BB)", words: ["bottom bracket", "bottom brackets", "bb shell", "bsa bb", "bb86", "bb92", "pf30", "bb30", "bb386", "t47", "bb"], types: [] },
  { id: "headset", en: "Headsets", id_: "Headset (komstir)", words: ["headset", "headsets", "komstir", "headset bearing"], types: [] },
  { id: "freehub", en: "Freehub bodies", id_: "Body freehub", words: ["freehub", "freehub body", "free hub", "driver body", "ratchet", "pawl", "pawls", "body hub"], types: [] },
  { id: "bearing", en: "Bearings", id_: "Bearing (laher)", words: ["bearing", "bearings", "laher", "lahar", "2rs", "ceramic bearing"], types: ["bearing"] },
  { id: "wheelset", en: "Wheelsets", id_: "Wheelset", words: ["wheelset", "wheelsets", "wheel set", "wheels", "sepasang roda", "roda", "velg set"], types: ["wheelset"] },
  { id: "rim", en: "Rims", id_: "Rim / velg", words: ["rim", "rims", "velg", "velk"], types: ["rim"] },
  { id: "hub", en: "Hubs", id_: "Hub (hab)", words: ["hub", "hubs", "hubset", "hab", "front hub", "rear hub"], types: ["hub"] },
  { id: "groupset", en: "Groupsets", id_: "Groupset", words: ["groupset", "groupsets", "group set", "gruppo"], types: ["groupset"] },
  { id: "crankset", en: "Cranksets", id_: "Crankset", words: ["crankset", "cranksets", "crank", "cranks", "chainring", "chainrings", "gir depan"], types: ["crankset"] },
  { id: "derailleur", en: "Derailleurs", id_: "Derailleur (RD/FD)", words: ["derailleur", "derailleurs", "rear derailleur", "front derailleur", "rd", "fd", "dérailleur"], types: ["rear-derailleur", "front-derailleur"] },
  { id: "shifter", en: "Shifters", id_: "Shifter", words: ["shifter", "shifters", "shift lever", "sti", "brifter", "operan", "trigger shifter"], types: ["shifters"] },
  { id: "cassette", en: "Cassettes", id_: "Cassette (sproket)", words: ["cassette", "cassettes", "sprocket", "sproket", "gir belakang", "cogs"], types: ["cassette"] },
  { id: "chain", en: "Chains", id_: "Rantai", words: ["chain", "chains", "rantai", "quick link"], types: ["chain"] },
  { id: "rotor", en: "Disc rotors", id_: "Rotor / piringan", words: ["rotor", "rotors", "disc rotor", "piringan cakram", "piringan"], types: [] },
  { id: "brakes", en: "Brakes", id_: "Rem", words: ["brake", "brakes", "caliper", "calipers", "rem", "rem cakram", "brake pads", "brake pad", "kampas rem"], types: ["brakes"] },
  { id: "tires", en: "Tyres", id_: "Ban", words: ["tire", "tires", "tyre", "tyres", "ban", "ban luar", "inner tube", "tube", "ban dalam", "clincher"], types: ["tires"] },
  { id: "handlebar", en: "Handlebars", id_: "Stang / handlebar", words: ["handlebar", "handlebars", "bar", "drop bar", "flat bar", "riser bar", "stang", "setang", "cockpit"], types: ["handlebar"] },
  { id: "stem", en: "Stems", id_: "Stem", words: ["stem", "stems", "pipa stang"], types: ["stem"] },
  { id: "saddle", en: "Saddles", id_: "Sadel", words: ["saddle", "saddles", "sadel", "jok"], types: ["saddle"] },
  { id: "seatpost", en: "Seatposts", id_: "Seatpost", words: ["seatpost", "seatposts", "seat post", "dropper", "dropper post", "tiang sadel"], types: ["seatpost"] },
  { id: "pedals", en: "Pedals", id_: "Pedal", words: ["pedal", "pedals", "cleat", "cleats", "clipless"], types: ["pedals"] },
  { id: "fork", en: "Forks", id_: "Fork (garpu)", words: ["fork", "forks", "garpu", "suspension fork", "rigid fork"], types: ["fork"] },
  { id: "suspension", en: "Suspension", id_: "Suspensi", words: ["shock", "rear shock", "suspension", "suspensi", "shock absorber", "per belakang"], types: [] },
  { id: "accessory", en: "Accessories", id_: "Aksesori", words: ["accessory", "accessories", "aksesori", "bottle cage", "light", "lights", "lampu", "computer", "bag", "tas", "pump", "pompa", "tool", "tools", "valve", "sealant", "bar tape"], types: ["accessory", "frame"] },
];

export const CATEGORY_BY_ID = new Map(PART_CATEGORIES.map((c) => [c.id, c]));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MATCHERS = PART_CATEGORIES.map((c) => ({ id: c.id, re: new RegExp(`(^|[^a-z0-9])(${[...c.words].sort((a, b) => b.length - a.length).map(escape).join("|")})(?=$|[^a-z0-9])`, "i") }));

/** First category whose vocabulary appears in the text (specific categories win). */
export function detectCategory(text: string): PartCategory | null {
  const t = text.toLowerCase();
  // a complete wheel/wheelset mention beats the hub it is built on ("… wheelset with DT 350 hubs")
  if (/\bwheel ?sets?\b|\bsepasang roda\b/.test(t)) return "wheelset";
  for (const m of MATCHERS) if (m.re.test(t)) return m.id;
  return null;
}

export function categoryForType(t: ComponentType): PartCategory {
  if (t === "front-derailleur" || t === "rear-derailleur") return "derailleur";
  if (t === "shifters") return "shifter";
  if (t === "frame") return "accessory";
  return (PART_CATEGORIES.find((c) => c.types.includes(t))?.id ?? "other") as PartCategory;
}
