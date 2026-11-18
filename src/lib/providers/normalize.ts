import { detectCategory } from "@/lib/parts/categories";
import { extractSpecs, stripHtml } from "@/lib/parts/extract";
import type { Condition, Offer, SourceKind } from "@/lib/parts/types";

/** Component brands commonly resold by other stores — used to avoid labelling a resold item as the store's own product. */
export const KNOWN_PART_BRANDS = ["Shimano", "SRAM", "Campagnolo", "MicroSHIFT", "LTWOO", "Sensah", "Wheeltop", "SunRace", "KMC", "Prowheel", "FSA", "Token", "Novatec", "Bitex", "Powerway",
  "DT Swiss", "Hope", "Chris King", "Industry Nine", "Continental", "Maxxis", "Vittoria", "Schwalbe", "Pirelli", "Michelin", "Panaracer", "CST", "Kenda", "Challenge", "Rene Herse",
  "RockShox", "Fox", "Manitou", "Magene", "XOSS", "Garmin", "Wahoo", "Zipp", "ENVE", "Roval", "Fulcrum", "Mavic", "Hunt", "ICAN", "Winspace", "Elitewheels", "Farsports", "Superteam",
  "Light Bicycle", "Yoeleo", "Lún", "Fizik", "Selle Italia", "Prologo", "Ergon", "Look", "Time", "Muc-Off", "Stan's", "Tubolito", "Ceramicspeed", "Enduro Bearings", "SKF", "NSK"];

export function brandFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  const hit = [...KNOWN_PART_BRANDS].sort((a, b) => b.length - a.length).find((b) => t.startsWith(b.toLowerCase() + " ") || t === b.toLowerCase());
  return hit ?? null;
}

export interface ListingFacts {
  providerId: string;
  key: string;              // stable id within the provider (handle, item id, URL)
  url: string;
  title: string;
  storeBrand?: string | null;   // the store owner's brand (manufacturer stores)
  ownBrands?: string[];         // further brands owned by the store owner
  vendor?: string | null;
  sourceKind: SourceKind;
  seller: string;
  sellerCountry?: string | null;
  price?: number | null;
  currency?: string | null;
  listPrice?: number | null;
  available?: boolean | null;
  condition?: Condition;
  imageUrl?: string | null;
  text?: string | null;          // description HTML/text: used ONLY to extract facts, never stored
  extraForCategory?: string;     // product type / tags
  gtin?: string | null;
  mpn?: string | null;
  affiliate?: boolean;
  sponsored?: boolean;
  identification?: Offer["identification"];
  checkedAt: string;
}

/** Remove tracking parameters (utm_*, Shopify search position, click ids) so the same page de-duplicates. */
export function cleanUrl(u: string): string {
  try {
    const url = new URL(u);
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|_pos$|_psq$|_psid$|_ss$|_sid$|_v$|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|srsltid$)/i.test(k)) url.searchParams.delete(k);
    url.hash = "";
    return url.toString().replace(/\?$/, "");
  } catch { return u; }
}

/** Build an Offer from listing facts. Descriptions are reduced to extracted specifications. */
export function toOffer(f: ListingFacts): Offer {
  f = { ...f, url: cleanUrl(f.url) };
  const text = f.text ? stripHtml(f.text) : "";
  const specs = extractSpecs(`${f.title}\n${text}`);
  if (f.mpn) specs.partNumber = f.mpn;
  if (f.gtin) specs.gtin = f.gtin;
  // A manufacturer store reselling another brand's part is a retailer for that item.
  const titled = brandFromTitle(f.title);
  const own = [f.storeBrand, ...(f.ownBrands ?? [])].filter(Boolean).map((b) => b!.toLowerCase());
  const ownedBy = (name: string) => own.some((b) => name.toLowerCase().includes(b.split(" ")[0]));
  const vendorIsOther = !!(f.storeBrand && f.vendor && !ownedBy(f.vendor));
  const foreign = !!f.storeBrand && ((!!titled && !ownedBy(titled)) || vendorIsOther);
  const ownSubBrand = titled && f.storeBrand && ownedBy(titled) && titled.toLowerCase() !== f.storeBrand.toLowerCase() ? titled : null;
  const brand = foreign ? (titled ?? f.vendor ?? null) : (ownSubBrand ?? f.storeBrand ?? titled ?? f.vendor ?? null);
  const sourceKind: SourceKind = foreign && f.sourceKind === "official-manufacturer" ? "retailer" : f.sourceKind;
  const priced = f.price != null && f.price > 0 && f.currency;
  return {
    id: `${f.providerId}:${f.key}`,
    providerId: f.providerId,
    sourceKind,
    sourceSite: new URL(f.url).host,
    seller: f.seller,
    sellerCountry: f.sellerCountry ?? null,
    title: f.title.trim(),
    brand,
    model: null,
    category: detectCategory(`${f.title} ${f.extraForCategory ?? ""}`),
    imageUrl: f.imageUrl ?? null,
    url: f.url,
    price: priced ? { amount: f.price!, currency: f.currency!.toUpperCase(), kind: "advertised", checkedAt: f.checkedAt } : null,
    listPrice: f.listPrice && f.price && f.listPrice > f.price ? f.listPrice : null,
    availability: f.available == null ? "unknown" : f.available ? "in-stock" : "out-of-stock",
    availabilityVerified: false,
    shipping: null,
    condition: f.condition ?? "unknown",
    specs,
    description: null,
    retrievedAt: f.checkedAt,
    identification: f.identification ?? (foreign ? "probable" : f.storeBrand ? "exact" : "uncertain"),
    affiliate: !!f.affiliate,
    sponsored: !!f.sponsored,
    catalogId: null,
    verification: "unverified",
  };
}

export const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
