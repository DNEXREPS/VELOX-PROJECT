import type { Component } from "@/lib/types";

/** What a list row needs — never the whole record. */
export type ComponentSummary = Pick<Component, "id" | "manufacturer" | "manufacturerSlug" | "name" | "type" | "discipline" | "tier" | "material" | "weightG" | "price">;

export interface ComponentPage {
  items: ComponentSummary[];
  total: number;
  page: number;
  pageSize: number;
  manufacturers: Array<{ id: string; name: string; count: number }>;
  source: "static" | "database";
}

