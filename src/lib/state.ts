"use client";
/**
 * Client state: catalogue overlay (admin edits merged over seed data) and user data
 * (garage, builds, wishlist, compare list, submissions, session). All persisted locally
 * in demo mode. The shape matches the Supabase schema so a remote adapter can replace it.
 */
import { createStore } from "./store";
import type { BikeModel, Brand, Build, Category, CategoryId, CompareItem, Component, GarageBike, Role, Subcategory, Submission, WishlistItem } from "./types";
import type { Currency } from "./format";
import type { StagedRecord } from "./ingest";

/* --------------------------------- stores --------------------------------- */

export interface CatalogOverlay {
  brands: Record<string, Brand>;
  models: Record<string, BikeModel>;
  components: Record<string, Component>;
  subcategories: Partial<Record<CategoryId, Subcategory[]>>;
}

export interface Session {
  signedIn: boolean;
  name: string;
  role: Role;
}

export const overlayStore = createStore<CatalogOverlay>("catalog-overlay", { brands: {}, models: {}, components: {}, subcategories: {} });
export const sessionStore = createStore<Session>("session", { signedIn: false, name: "", role: "guest" });
export const garageStore = createStore<GarageBike[]>("garage", []);
export const buildsStore = createStore<Build[]>("builds", []);
export const wishlistStore = createStore<WishlistItem[]>("wishlist", []);
export const compareStore = createStore<CompareItem[]>("compare", []);
export const submissionsStore = createStore<Submission[]>("submissions", []);
export interface Settings {
  currency: Currency;
  /** "auto" follows the browser language (Indonesian browsers → Bahasa Indonesia) */
  language: "auto" | "en" | "id";
  units: "metric" | "imperial";
  notifications: { priceChanges: boolean; productNews: boolean };
}
export const settingsStore = createStore<Settings>("settings", { currency: "IDR", language: "auto", units: "metric", notifications: { priceChanges: false, productNews: false } });

/** Saved upgrade plans (Upgrade Advisor) — synced to the account when signed in. */
export interface UpgradePlan { id: string; bikeLabel: string; bikeRef: string; goal: string; tier: string; parts: Array<{ slot: string; componentId: string; name: string }>; totalIdr: number | null; savedAt: string }
export const upgradePlansStore = createStore<UpgradePlan[]>("upgrade-plans", []);
/** AI Mechanic history — saved per diagnosis, synced when signed in. */
export interface MechanicHistoryEntry { id: string; at: string; text: string; bike?: string | null; safety: string; topCauses: string[]; systems: string[] }
export const mechanicHistoryStore = createStore<MechanicHistoryEntry[]>("mechanic-history", []);
/** Admin image review decisions (overlay over the generated registry). */
export const imageReviewStore = createStore<Record<string, "verified" | "rejected">>("image-reviews", {});
/** Ingestion staging queue — records wait here until an administrator reviews them. */
export const stagingStore = createStore<StagedRecord[]>("staging", []);

/* catalogue construction lives in ./catalog-client (kept out of this module so stores never bundle the catalogue) */

/* ------------------------------- permissions ------------------------------ */

export const canAdmin = (s: Session) => s.signedIn && s.role === "admin";

/** All catalogue writes go through these guards — regular users cannot modify catalogue data. */
function assertAdmin() {
  if (!canAdmin(sessionStore.get())) throw new Error("Administrator role required to modify catalogue data.");
}

export const catalogWrite = {
  upsertBrand(b: Brand) { assertAdmin(); overlayStore.set((o) => ({ ...o, brands: { ...o.brands, [b.id]: b } })); },
  upsertModel(m: BikeModel) { assertAdmin(); overlayStore.set((o) => ({ ...o, models: { ...o.models, [m.id]: m } })); },
  upsertComponent(c: Component) { assertAdmin(); overlayStore.set((o) => ({ ...o, components: { ...o.components, [c.id]: c } })); },
  addSubcategory(cat: CategoryId, s: Subcategory) {
    assertAdmin();
    overlayStore.set((o) => ({ ...o, subcategories: { ...o.subcategories, [cat]: [...(o.subcategories[cat] ?? []), s] } }));
  },
  bulk(input: { brands?: Brand[]; models?: BikeModel[]; components?: Component[] }) {
    assertAdmin();
    overlayStore.set((o) => ({
      ...o,
      brands: { ...o.brands, ...Object.fromEntries((input.brands ?? []).map((b) => [b.id, b])) },
      models: { ...o.models, ...Object.fromEntries((input.models ?? []).map((b) => [b.id, b])) },
      components: { ...o.components, ...Object.fromEntries((input.components ?? []).map((b) => [b.id, b])) },
    }));
  },
  resetOverlay() { assertAdmin(); overlayStore.reset(); },
  /** confirm or withdraw a product-image association (admin review) */
  reviewImage(imageId: string, decision: "verified" | "rejected" | null) {
    assertAdmin();
    imageReviewStore.set((r) => { const n = { ...r }; if (decision) n[imageId] = decision; else delete n[imageId]; return n; });
  },
};
