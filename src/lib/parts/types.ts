/**
 * VELOX Parts Discovery — shared types (client + server).
 *
 * Two layers stay separate:
 *   INTERNAL CATALOG  — curated VELOX `Component` records (verified / reviewed)
 *   EXTERNAL DISCOVERY — `Offer`s retrieved live from configured providers; never auto-promoted
 */

export type PartCategory =
  | "wheelset" | "hub" | "bearing" | "groupset" | "crankset" | "derailleur" | "cassette" | "chain"
  | "brakes" | "rotor" | "tires" | "handlebar" | "stem" | "saddle" | "seatpost" | "pedals" | "fork"
  | "suspension" | "bottom-bracket" | "headset" | "freehub" | "rim" | "shifter" | "spokes" | "frame" | "apparel" | "accessory" | "other";

/** Who stands behind the listing. Marketplace listings are never presented as manufacturer-verified. */
export type SourceKind = "velox-catalog" | "official-manufacturer" | "authorized-distributor" | "retailer" | "marketplace" | "web" | "community";

export type ProviderType = "internal-catalog" | "manufacturer-store" | "retailer-feed" | "marketplace-api" | "web-search-api" | "compatibility-api";

export type Condition = "new" | "used" | "refurbished" | "open-box" | "unknown";

/** Specifications parsed from a listing. `basis` says where each value came from. */
export interface PartSpecs {
  wheelSize?: string | null; // "700c" | "29" | "27.5" | "26" | "20" | "451" | "406"…
  tireWidthMm?: number | null;
  frontAxle?: string | null; // "12x100" | "100QR" | "15x110"
  rearAxle?: string | null; // "12x142" | "135QR" | "12x148"
  freehubs?: string[] | null; // ["HG-road","XDR","MicroSpline","XD","Campagnolo","N3W"]
  brakeInterface?: "disc" | "rim" | null;
  rotorMount?: "centerlock" | "6-bolt" | null;
  speeds?: number | null;
  bbStandard?: string | null; // "BSA-68" | "BB86" | "PF30" | "T47"…
  spindle?: string | null; // "24mm" | "DUB" | "30mm" | "square-taper"
  barClampMm?: number | null;
  steererMm?: number | null; // 28.6 (1-1/8")
  seatpostMm?: number | null;
  internalRimMm?: number | null;
  rimDepthMm?: number | null;
  weightG?: number | null;
  material?: string | null;
  tubeless?: boolean | null;
  bearings?: string[] | null; // "6902-2RS", "15x28x7"
  cogRange?: string | null; // "11-34"
  partNumber?: string | null; // MPN / SKU
  gtin?: string | null;
  basis?: "structured" | "listing-text";
}

export interface Price {
  amount: number;
  currency: string; // ISO 4217
  /** advertised item price only — never includes shipping, tax or import duties unless stated */
  kind: "advertised";
  checkedAt: string; // ISO
}

export interface Offer {
  id: string; // provider-scoped unique id
  providerId: string;
  sourceKind: SourceKind;
  sourceSite: string; // host, e.g. "us.huntbikewheels.com"
  seller: string;
  sellerCountry?: string | null;
  title: string;
  brand?: string | null;
  model?: string | null;
  category: PartCategory | null;
  imageUrl?: string | null;
  url: string; // original product page
  price?: Price | null;
  /** compare-at / list price when the store publishes it */
  listPrice?: number | null;
  availability: "in-stock" | "out-of-stock" | "unknown";
  /** availability as reported by the source at checkedAt — not verified by VELOX */
  availabilityVerified: boolean;
  shipping?: { amount: number; currency: string; note?: string } | null; // only when the source states it
  condition: Condition;
  specs: PartSpecs;
  description?: string | null;
  retrievedAt: string; // ISO
  /** how sure we are that brand/model were identified correctly */
  identification: "exact" | "probable" | "uncertain";
  affiliate: boolean;
  sponsored: boolean;
  /** internal catalogue component id when the offer IS a VELOX catalogue record */
  catalogId?: string | null;
  verification: "verified" | "unverified";
  /** the listing's own variants (sizes, options) — kept on the offer, never merged into other products */
  variants?: Array<{ title: string; price: number | null; available: boolean | null; sku: string | null }> | null;
}

export interface ProductGroup {
  key: string;
  title: string;
  brand: string | null;
  category: PartCategory | null;
  imageUrl: string | null;
  offers: Offer[];
  specs: PartSpecs;
}

export interface PartsQuery {
  q: string;
  category?: PartCategory | null;
  brands?: string[];
  minIdr?: number | null;
  maxIdr?: number | null;
  includeUsed?: boolean;
  countries?: string[];
  sellers?: string[];
  condition?: Condition | null;
  sort?: "relevance" | "price-asc" | "price-desc" | "newest" | "availability";
  providers?: string[];
}

export type ProviderOutcome =
  | { providerId: string; status: "ok"; count: number; ms: number; cached: boolean }
  | { providerId: string; status: "error"; error: string; ms: number }
  | { providerId: string; status: "timeout"; ms: number }
  | { providerId: string; status: "not-configured"; missing: string[] }
  | { providerId: string; status: "skipped"; reason: string };

export interface PartsSearchResponse {
  query: PartsQuery;
  /** what VELOX understood from the query (category, budget, standards) */
  parsed: Record<string, unknown>;
  offers: Offer[];
  sources: ProviderOutcome[];
  searchedAt: string;
}
