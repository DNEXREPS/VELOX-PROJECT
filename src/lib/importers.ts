/**
 * Normalisers for JSON / CSV imports and form submissions.
 * Unknown values become null (→ "Not Available"); nothing is invented.
 */
import { slugify } from "@/data/brands";
import type { BikeModel, Brand, CategoryId, Component, ComponentType, PriceEntry, PriceType, Provenance, VerificationStatus } from "./types";

const CATS: CategoryId[] = ["road", "mtb", "gravel", "urban", "electric", "folding", "bmx", "other"];
const TYPES: ComponentType[] = ["frame", "fork", "groupset", "shifters", "front-derailleur", "rear-derailleur", "crankset", "cassette", "chain", "brakes", "wheelset", "tires", "handlebar", "stem", "saddle", "seatpost", "pedals", "hub", "bearing", "accessory"];
const STATUSES: VerificationStatus[] = ["verified-official", "verified-distributor", "cross-verified", "community", "unverified", "historical", "discontinued", "archived"];
const PRICE_TYPES: PriceType[] = ["msrp", "distributor", "retailer", "estimated", "historical"];

type Raw = Record<string, unknown>;
const str = (v: unknown): string | null => (v == null || String(v).trim() === "" ? null : String(v).trim());
const num = (v: unknown): number | null => {
  const s = str(v);
  if (s == null) return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : (str(v) ?? "").split(/[|;]/).map((s) => s.trim()).filter(Boolean));
const parseMaybeJson = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!(t.startsWith("{") || t.startsWith("["))) return v;
  try { return JSON.parse(t); } catch { return v; }
};

export function provenance(raw: Raw, fallback: VerificationStatus): Provenance {
  const status = (str(raw.status) as VerificationStatus) ?? fallback;
  const src = str(raw.source) ?? str(raw.sourceUrl);
  return {
    status: STATUSES.includes(status) ? status : fallback,
    sources: src ? [{ label: src, url: src.startsWith("http") ? src : null, retrievedAt: new Date().toISOString().slice(0, 10) }] : [],
    updatedAt: new Date().toISOString(),
  };
}

export function price(raw: Raw): PriceEntry | null {
  const p = parseMaybeJson(raw.price);
  if (p && typeof p === "object") return p as PriceEntry;
  const amount = num(raw.priceIdr ?? raw.price);
  if (amount == null) return null;
  const type = (str(raw.priceType) as PriceType) ?? "estimated";
  return { amount, currency: "IDR", type: PRICE_TYPES.includes(type) ? type : "estimated", source: str(raw.priceSource), date: str(raw.priceDate) ?? new Date().toISOString().slice(0, 10) };
}

export interface ImportResult<T> { ok: T[]; errors: string[] }

export function normalizeBrand(raw: Raw, status: VerificationStatus = "unverified"): Brand {
  const name = str(raw.name);
  if (!name) throw new Error("Brand requires a name");
  const slug = str(raw.slug) ?? slugify(name);
  const country = str(raw.country) ?? "Not Available";
  return {
    id: str(raw.id) ?? slug,
    slug,
    name,
    country,
    region: str(raw.region) === "Indonesia" || country === "Indonesia" ? "Indonesia" : "International",
    founded: num(raw.founded),
    website: str(raw.website),
    description: str(raw.description) ?? "",
    history: str(raw.history),
    categories: list(raw.categories).filter((c): c is CategoryId => CATS.includes(c as CategoryId)),
    mark: { color: str(raw.color) ?? "#C5F36A" },
    logoUrl: str(raw.logoUrl),
    provenance: provenance(raw, status),
  };
}

export function normalizeModel(raw: Raw, status: VerificationStatus = "unverified"): BikeModel {
  const brandId = str(raw.brandId) ?? (str(raw.brand) ? slugify(String(raw.brand)) : null);
  const name = str(raw.name);
  const year = num(raw.year);
  if (!brandId || !name || !year) throw new Error("Model requires brand, name and year");
  const category = (str(raw.category) as CategoryId) ?? "other";
  const slug = str(raw.slug) ?? slugify(`${brandId}-${name}-${year}`);
  const compat = parseMaybeJson(raw.compat);
  return {
    id: str(raw.id) ?? slug,
    slug,
    brandId,
    family: str(raw.family) ?? name.split(" ")[0],
    name,
    year,
    generation: str(raw.generation),
    category: CATS.includes(category) ? category : "other",
    subcategory: str(raw.subcategory) ?? "",
    frameMaterial: str(raw.frameMaterial),
    geometry: null,
    groupset: str(raw.groupset),
    drivetrain: str(raw.drivetrain),
    brakes: str(raw.brakes),
    brakeType: (str(raw.brakeType) as BikeModel["brakeType"]) ?? null,
    wheelset: str(raw.wheelset),
    tires: str(raw.tires),
    wheelSize: (str(raw.wheelSize) as BikeModel["wheelSize"]) ?? null,
    tireClearanceMm: num(raw.tireClearanceMm),
    suspension: (str(raw.suspension) as BikeModel["suspension"]) ?? "rigid",
    travel: str(raw.travel),
    weightKg: num(raw.weightKg),
    price: price(raw),
    priceHistory: [],
    sizes: list(raw.sizes),
    ridingStyle: str(raw.ridingStyle) ?? "",
    usage: list(raw.usage) as BikeModel["usage"],
    experience: list(raw.experience) as BikeModel["experience"],
    highlights: list(raw.highlights),
    drawbacks: list(raw.drawbacks),
    compat: compat && typeof compat === "object" ? (compat as BikeModel["compat"]) : {},
    officialUrl: str(raw.officialUrl),
    imageUrl: str(raw.imageUrl),
    frameColor: str(raw.frameColor) ?? undefined,
    provenance: provenance(raw, status),
  };
}

export function normalizeComponent(raw: Raw, status: VerificationStatus = "unverified"): Component {
  const manufacturer = str(raw.manufacturer);
  const name = str(raw.name);
  const type = str(raw.type) as ComponentType;
  if (!manufacturer || !name || !TYPES.includes(type)) throw new Error("Component requires manufacturer, name and a valid type");
  const specs = parseMaybeJson(raw.specs);
  const compat = parseMaybeJson(raw.compat);
  return {
    id: str(raw.id) ?? slugify(`${manufacturer}-${name}`),
    manufacturer,
    manufacturerSlug: slugify(manufacturer),
    name,
    type,
    discipline: (list(raw.discipline).length ? list(raw.discipline) : ["universal"]) as Component["discipline"],
    tier: (str(raw.tier) as Component["tier"]) ?? "mid",
    series: str(raw.series),
    weightG: num(raw.weightG),
    material: str(raw.material),
    price: price(raw),
    specs: specs && typeof specs === "object" ? (specs as Component["specs"]) : {},
    compat: compat && typeof compat === "object" ? (compat as Component["compat"]) : {},
    kit: null,
    benefits: list(raw.benefits),
    imageUrl: str(raw.imageUrl),
    officialUrl: str(raw.officialUrl),
    provenance: provenance(raw, status),
  };
}

export function importMany<T>(rows: Raw[], fn: (r: Raw) => T): ImportResult<T> {
  const ok: T[] = [];
  const errors: string[] = [];
  rows.forEach((r, i) => {
    try { ok.push(fn(r)); } catch (e) { errors.push(`Row ${i + 1}: ${(e as Error).message}`); }
  });
  return { ok, errors };
}
