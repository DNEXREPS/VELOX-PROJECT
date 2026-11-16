/**
 * VELOX domain model.
 *
 * These types mirror the relational schema in `supabase/schema.sql`.
 * Every nullable field means "unknown" — the UI renders it as "Not Available"
 * and the compatibility engine treats it as insufficient information.
 */

export type VerificationStatus =
  | "verified-official" // confirmed against the manufacturer's own site / catalogue / manual
  | "verified-distributor" // confirmed against an authorised distributor
  | "cross-verified" // two or more independent reputable sources agree
  | "community" // community submitted, reviewed but not independently verified
  | "unverified" // seed or single-source data awaiting verification
  | "historical" // describes a past model year / product state
  | "discontinued" // no longer produced
  | "archived"; // hidden from public views

export type SourceType =
  | "official-website"
  | "official-catalog"
  | "technical-manual"
  | "authorized-distributor"
  | "retailer"
  | "manufacturer-announcement"
  | "official-social"
  | "publication"
  | "community"
  | "standard" // published industry / ISO standard
  | "editorial-seed";

export type Confidence = "high" | "medium" | "low";

export type PriceType =
  | "msrp" // manufacturer suggested retail price
  | "distributor" // authorised distributor price
  | "retailer" // a specific retailer
  | "estimated" // VELOX estimate — never official
  | "historical"; // price that applied in the past

export interface SourceRef {
  label: string;
  url?: string | null;
  type?: SourceType;
  retrievedAt?: string | null;
}

export interface Provenance {
  status: VerificationStatus;
  sources: SourceRef[];
  updatedAt: string; // ISO date
  /** true for seed/demo records that have not been checked against official sources */
  demo?: boolean;
  confidence?: Confidence;
  /** the company that actually designs / manufactures the product, when it differs from the brand */
  originalManufacturer?: string | null;
  reviewerNotes?: string | null;
}

export interface PriceEntry {
  amount: number; // in IDR
  currency: "IDR";
  type: PriceType;
  source?: string | null;
  /** where the price was published (official page, distributor listing…) */
  sourceUrl?: string | null;
  date?: string | null;
  note?: string | null;
  /**
   * The price exactly as published when it was not in IDR (e.g. a US MSRP). `amount` is then a
   * conversion at `rate` and is labelled as such — it is never an Indonesian price.
   */
  original?: { amount: number; currency: "USD" | "EUR" | "GBP" | "AUD" | "JPY" | "TWD" | "CNY"; rate: number } | null;
}

export type Region = "Indonesia" | "International";

/** What a company actually does — never claim manufacturing for a distributor or private label. */
export type BrandKind =
  | "bicycles" // designs/sells complete bicycles under its own name
  | "frames" // sells framesets
  | "wheels"
  | "components"
  | "e-bikes"
  | "oem-manufacturer" // contract manufacturer for other brands
  | "private-label" // sells rebranded / open-mould products
  | "distributor";

export interface Brand {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: Region;
  founded?: number | null;
  website?: string | null; // only when known
  description: string;
  history?: string | null;
  categories: CategoryId[];
  kinds?: BrandKind[];
  parentCompany?: string | null;
  headquarters?: string | null;
  /** two-letter monogram + colour used for the generated wordmark (no third-party logos are bundled) */
  mark?: { color: string } | null;
  logoUrl?: string | null;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export type CategoryId =
  | "road"
  | "mtb"
  | "gravel"
  | "urban"
  | "electric"
  | "folding"
  | "bmx"
  | "other";

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  description: string;
  subcategories: Subcategory[];
}

/* ------------------------------------------------------------------ */
/* Technical standards used by the compatibility engine                */
/* ------------------------------------------------------------------ */

export type WheelSize = "700c" | "650b" | "29" | "27.5" | "26" | "24" | "20" | "16" | "451" | "12";
export type BrakeType = "hydraulic-disc" | "mechanical-disc" | "rim-caliper" | "v-brake" | "coaster" | "none";
export type BrakeMount = "flat-mount" | "post-mount" | "rim-caliper" | "direct-mount-rim" | "v-brake" | "none";
export type RotorMount = "centerlock" | "6-bolt";
export type Steerer = "tapered" | "straight-1-1/8" | "straight-1" | "1.5";
export type DrivetrainSupport = "mechanical" | "electronic-wired" | "electronic-wireless";
export type BBStandard =
  | "BSA-68"
  | "BSA-73"
  | "BSA-83"
  | "T47"
  | "PF86"
  | "BB86"
  | "BB92"
  | "BB386EVO"
  | "PF30"
  | "BB30"
  | "BBright"
  | "Mid-BMX"
  | "Euro-BMX"
  | "Integrated-Motor";
export type CrankSpindle = "24mm" | "DUB" | "30mm" | "square-taper" | "19mm-BMX" | "22mm-BMX" | "Campagnolo-UT" | "motor";
export type Freehub = "HG-road" | "HG-MTB" | "MicroSpline" | "XD" | "XDR" | "Campagnolo" | "N3W" | "Driver-BMX" | "Freewheel";

/** Compatibility-relevant attributes. All optional; missing = insufficient information. */
export interface CompatAttrs {
  // frame
  bbStandard?: BBStandard | null;
  brakeMount?: BrakeMount | null; // rear for frames, front for forks
  rearAxle?: string | null; // e.g. "12x142", "12x148", "135QR"
  frontAxle?: string | null; // e.g. "12x100", "15x110", "100QR"
  wheelSizes?: WheelSize[] | null;
  maxTireMm?: number | null;
  seatpostDiameter?: string | null; // "27.2" | "30.9" | "31.6" | "34.9" | "aero:<id>"
  steerer?: Steerer | null;
  steererTopMm?: number | null; // 28.6 for 1-1/8"
  drivetrainSupport?: DrivetrainSupport[] | null;
  frontDerailleurMount?: "braze-on" | "clamp" | "direct-mount" | "none" | null;
  udh?: boolean | null;
  maxRotorMm?: number | null;
  // fork
  travelMm?: number | null;
  // drivetrain
  speeds?: number | null;
  protocol?: string | null; // shifter/derailleur pull ratio / electronic system
  electronic?: boolean | null;
  chainrings?: number | null; // 1 or 2 (crank) / max (FD)
  maxCog?: number | null; // rear derailleur capacity
  minCog?: number | null;
  cogRange?: string | null; // "11-34"
  freehub?: Freehub | null; // cassette requirement
  freehubOptions?: Freehub[] | null; // wheel options
  spindle?: CrankSpindle | null;
  requiresUDH?: boolean | null;
  pedalThread?: "9/16" | "1/2" | null;
  // brakes
  brakeType?: BrakeType | null;
  /** disc vs rim interface of a frame, fork or wheel */
  brakeInterface?: "disc" | "rim" | "none" | null;
  rotorMount?: RotorMount | null;
  rotorMm?: number | null;
  // wheels / tires
  wheelSize?: WheelSize | null;
  tubeless?: boolean | null;
  internalRimMm?: number | null;
  tireWidthMm?: number | null;
  // cockpit
  barClampMm?: number | null; // handlebar clamp diameter / stem bar clamp
  stemSteererMm?: number | null;
  postDiameter?: string | null; // seatpost diameter
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

export type ComponentType =
  | "frame"
  | "fork"
  | "groupset"
  | "shifters"
  | "front-derailleur"
  | "rear-derailleur"
  | "crankset"
  | "cassette"
  | "chain"
  | "brakes"
  | "wheelset"
  | "tires"
  | "handlebar"
  | "stem"
  | "saddle"
  | "seatpost"
  | "pedals"
  | "hub"
  | "bearing"
  | "accessory";

export type Discipline = "road" | "gravel" | "mtb" | "urban" | "bmx" | "universal";
export type Tier = "entry" | "mid" | "performance" | "pro";

export interface Component {
  id: string;
  manufacturer: string; // brand name of the component maker
  manufacturerSlug: string;
  name: string;
  type: ComponentType;
  discipline: Discipline[];
  tier: Tier;
  series?: string | null;
  weightG?: number | null;
  material?: string | null;
  price?: PriceEntry | null;
  specs: Record<string, string | number | null>;
  compat: CompatAttrs;
  /** groupset kits reference the parts they install */
  kit?: Partial<Record<ComponentType, string>> | null;
  benefits?: string[];
  imageUrl?: string | null;
  officialUrl?: string | null;
  /** manufacturer part number / SKU / GTIN when documented — used for duplicate detection */
  productId?: string | null;
  modelYear?: number | null;
  wheel?: WheelsetSpec | null;
  bearing?: BearingSpec | null;
  provenance: Provenance;
}

/** Extended wheelset specification — every field optional; null renders "Not Available". */
export interface WheelsetSpec {
  rimMaterial?: string | null;
  rimDepthMm?: number | string | null; // "50/56" for staggered
  internalWidthMm?: number | null;
  externalWidthMm?: number | null;
  hubManufacturer?: string | null;
  hubModel?: string | null;
  spokeCount?: string | null; // "24/24"
  spokeType?: string | null;
  bearings?: string | null;
  maxSystemWeightKg?: number | null;
  warranty?: string | null;
}

export interface BearingSpec {
  designation: string; // e.g. "6802", "MR15267", "ACB 41.8x30.15x8 45/45"
  innerMm: number;
  outerMm: number;
  widthMm: number;
  kind: "deep-groove" | "angular-contact" | "headset-acb" | "needle";
  contactAngle?: string | null; // "45x45", "36x45"
  sealing?: string | null; // "2RS", "LLB", "open"
  typicalUse: string[];
}

/** Centralised image record — every image shown in VELOX has licence and attribution data. */
export interface MediaAsset {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  subject: string;
  source: string;
  sourceUrl: string | null;
  photographer: string | null;
  license: "Pexels License" | "Manufacturer press" | "Licensed" | "Admin upload" | "AI generated";
  licenseUrl: string | null;
  quality: "hero" | "high" | "standard";
  verifiedAt: string;
  /** representative imagery must never be presented as a specific product */
  representative: boolean;
  focal?: string; // CSS object-position
}

/* ------------------------------------------------------------------ */
/* Product images — model-specific photography                         */
/* ------------------------------------------------------------------ */

export type ImageSourceType =
  | "manufacturer" // official product photography
  | "manufacturer-catalog"
  | "distributor"
  | "retailer"
  | "wikimedia-commons" // openly licensed, individually attributed
  | "licensed" // licence obtained and recorded by an admin
  | "admin-upload";

/** Whether VELOX may display the file. Only "open-license" and "licensed" are ever rendered. */
export type ImageLicenseStatus = "open-license" | "licensed" | "permission-required" | "unknown" | "rejected";

/** How the photographed bicycle relates to the catalogue record it is attached to. */
export type ImageModelMatch =
  | "exact" // same model, variant and model year
  | "model" // same model and variant; model year not identifiable from the photo
  | "generation" // same frame generation, different build / trim / colour
  | "family"; // same family, different generation — never used as a primary image

export type ImageVerificationStatus = "verified" | "pending-review" | "rejected";

export interface ProductImage {
  id: string;
  subjectKind: "bike" | "component";
  /** catalogue record(s) this photograph depicts */
  subjectId: string;
  /** local, stable copy served by VELOX (never a search-result or hot-linked URL) */
  primary_image_url: string;
  gallery_images?: string[];
  width: number;
  height: number;
  alt: string;
  /** page that documents the file and its licence */
  image_source_url: string;
  /** original file URL at the source */
  original_file_url: string | null;
  image_source_type: ImageSourceType;
  image_license_status: ImageLicenseStatus;
  license: string; // e.g. "CC BY-SA 2.0"
  licenseUrl: string | null;
  author: string | null;
  image_verification_status: ImageVerificationStatus;
  image_model_match: ImageModelMatch;
  /** what was checked to establish the match (decals, frame shape, title, uploader…) */
  matchNotes: string;
  view: "side-profile" | "three-quarter" | "detail" | "in-use";
  last_image_verified_at: string; // ISO date
  /** sha-256 of the stored file, used to detect the same photo assigned to different models */
  sha256: string;
}

/* ------------------------------------------------------------------ */
/* Bicycle models                                                      */
/* ------------------------------------------------------------------ */

export type Experience = "beginner" | "intermediate" | "advanced";
export type Suspension = "rigid" | "front" | "full";
export type Usage = "commuting" | "fitness" | "racing" | "touring" | "trail" | "downhill" | "leisure" | "tricks" | "bikepacking" | "cargo";

export interface BikeModel {
  id: string; // unique per model-year-variant
  slug: string;
  brandId: string;
  family: string; // "Strattos" — groups generations / years
  name: string; // "Strattos S4"
  variant?: string | null; // trim / configuration within a model year
  year: number;
  /**
   * "model-year" (default): the manufacturer's model year. "listed-in-range": the manufacturer does
   * not publish a model year — `year` is when VELOX confirmed the model in the official range.
   */
  yearBasis?: "model-year" | "listed-in-range";
  generation?: string | null;
  category: CategoryId;
  subcategory: string; // subcategory id
  frameMaterial: string | null;
  geometry?: { stackMm?: number | null; reachMm?: number | null; headAngle?: number | null; seatAngle?: number | null; note?: string | null } | null;
  groupset: string | null;
  drivetrain: string | null; // "2x11", "1x12"
  brakes: string | null;
  brakeType: BrakeType | null;
  wheelset: string | null;
  tires: string | null;
  wheelSize: WheelSize | null;
  tireClearanceMm: number | null;
  suspension: Suspension;
  travel?: string | null;
  weightKg: number | null;
  price: PriceEntry | null;
  priceHistory?: PriceEntry[];
  sizes: string[];
  ridingStyle: string;
  usage: Usage[];
  experience: Experience[];
  electric?: { motor: string | null; batteryWh: number | null } | null;
  highlights: string[];
  drawbacks: string[];
  /** structured attributes so Upgrade Advisor and Build a Bike can reason about the bike */
  compat: CompatAttrs;
  officialUrl?: string | null;
  imageUrl?: string | null;
  frameColor?: string; // decorative colour for the generated illustration
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* User data                                                           */
/* ------------------------------------------------------------------ */

export type BuildSelection = Partial<Record<ComponentType, string>>;

export interface Build {
  id: string;
  name: string;
  discipline: Discipline;
  selection: BuildSelection;
  accessories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GarageLogEntry {
  id: string;
  date: string;
  kind: "modification" | "component-change" | "maintenance" | "note";
  title: string;
  detail?: string;
  costIdr?: number | null;
}

export interface GarageBike {
  id: string;
  nickname: string;
  modelId?: string | null; // linked catalog model
  buildId?: string | null; // linked custom build
  manual?: {
    brand: string;
    model: string;
    year: number | null;
    category: CategoryId;
    frameMaterial: string | null;
    groupset: string | null;
    wheelset: string | null;
    brakes: string | null;
    brakeType: BrakeType | null;
    wheelSize: WheelSize | null;
  } | null;
  purchaseYear?: number | null;
  purchasePriceIdr?: number | null;
  odometerKm?: number | null;
  log: GarageLogEntry[];
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  kind: "bike" | "component";
  refId: string;
  addedAt: string;
}

export type CompareKind = "bike" | "brand" | "component" | "build";
export interface CompareItem {
  kind: CompareKind;
  id: string;
}

export type Role = "guest" | "user" | "admin";

export interface Submission {
  id: string;
  kind: "brand" | "bike" | "component" | "correction";
  payload: Record<string, unknown>;
  note?: string;
  submittedBy: string;
  submittedAt: string;
  state: "pending" | "approved" | "rejected";
}
