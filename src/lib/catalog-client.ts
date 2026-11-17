"use client";
/**
 * The catalogue as seen by client components: bundled seed data with the admin overlay merged on top.
 * Importing this module bundles the full catalogue — pages that scale (component explorer, global
 * search) use the paginated /api/catalog endpoints instead.
 */
import { useMemo } from "react";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { COMPONENTS } from "@/data/components";
import { useStore } from "./store";
import { overlayStore, type CatalogOverlay } from "./state";
import type { BikeModel, Brand, Category, Component } from "./types";


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

