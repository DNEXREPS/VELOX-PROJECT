"use client";
/**
 * Client state: catalogue overlay (admin edits merged over seed data) and user data
 * (garage, builds, wishlist, compare list, submissions, session). All persisted locally
 * in demo mode. The shape matches the Supabase schema so a remote adapter can replace it.
 */
import { useMemo } from "react";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { COMPONENTS } from "@/data/components";
import { createStore, useStore } from "./store";
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
export const settingsStore = createStore<{ currency: Currency }>("settings", { currency: "IDR" });
/** Ingestion staging queue — records wait here until an administrator reviews them. */
export const stagingStore = createStore<StagedRecord[]>("staging", []);

/* --------------------------------- catalog -------------------------------- */

export interface Catalog {
  brands: Brand[];
  bikes: BikeModel[];
  components: Component[];
  categories: Category[];
  brandById: Map<string, Brand>;
  brandBySlug: Map<string, Brand>;
  bikeById: Map<string, BikeModel>;
  bikeBySlug: Map<string, BikeModel>;
  componentById: Map<string, Component>;
  /** includes archived records (admin views) */
  all: { brands: Brand[]; bikes: BikeModel[]; components: Component[] };
}

function merge<T extends { id: string }>(seed: T[], overlay: Record<string, T>): T[] {
  const out = seed.map((s) => overlay[s.id] ?? s);
  const seen = new Set(seed.map((s) => s.id));
  for (const [id, v] of Object.entries(overlay)) if (!seen.has(id)) out.push(v);
  return out;
}

export function buildCatalog(o: CatalogOverlay): Catalog {
  const allBrands = merge(BRANDS, o.brands).sort((a, b) => a.name.localeCompare(b.name));
  const allBikes = merge(BIKES, o.models);
  const allComponents = merge(COMPONENTS, o.components);
  const categories = CATEGORIES.map((c) => ({ ...c, subcategories: [...c.subcategories, ...(o.subcategories[c.id] ?? [])] }));
  const live = <T extends { provenance: { status: string } }>(xs: T[]) => xs.filter((x) => x.provenance.status !== "archived");
  const brands = live(allBrands);
  const bikes = live(allBikes);
  const components = live(allComponents);
  return {
    brands,
    bikes,
    components,
    categories,
    brandById: new Map(allBrands.map((b) => [b.id, b])),
    brandBySlug: new Map(allBrands.map((b) => [b.slug, b])),
    bikeById: new Map(allBikes.map((b) => [b.id, b])),
    bikeBySlug: new Map(allBikes.map((b) => [b.slug, b])),
    componentById: new Map(allComponents.map((c) => [c.id, c])),
    all: { brands: allBrands, bikes: allBikes, components: allComponents },
  };
}

export function useCatalog(): Catalog {
  const overlay = useStore(overlayStore);
  return useMemo(() => buildCatalog(overlay), [overlay]);
}

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
};
