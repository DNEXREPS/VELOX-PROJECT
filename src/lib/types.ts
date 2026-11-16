/**
 * VELOX domain model.
 *
 * These types mirror the relational schema in `supabase/schema.sql`.
 * Every nullable field means "unknown" — the UI renders it as "Not Available"
 * and the compatibility engine treats it as insufficient information.
 */

export type VerificationStatus =
  | "verified"
  | "community"
  | "unverified"
  | "discontinued"
  | "archived";

export type PriceType =
  | "msrp" // manufacturer suggested retail price
  | "distributor" // authorised distributor price
  | "retailer" // a specific retailer
  | "estimated" // VELOX estimate — never official
  | "historical"; // price that applied in the past

export interface SourceRef {
  label: string;
  url?: string | null;
  retrievedAt?: string | null;
}

export interface Provenance {
  status: VerificationStatus;
  sources: SourceRef[];
  updatedAt: string; // ISO date
  /** true for seed/demo records that have not been checked against official sources */
  demo?: boolean;
}

export interface PriceEntry {
  amount: number; // in IDR
  currency: "IDR";
  type: PriceType;
  source?: string | null;
  date?: string | null;
  note?: string | null;
}

export type Region = "Indonesia" | "International";

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
  provenance: Provenance;
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
  year: number;
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
