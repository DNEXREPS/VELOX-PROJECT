import type { SourceType } from "@/lib/types";

/**
 * Research registry: what has been researched, what is waiting, and which official sources the
 * ingestion pipeline should use once network access / permissions allow. Nothing in this file is
 * presented to users as catalogue data.
 */

export interface PendingBrand {
  name: string;
  context: string; // why it is on the list
  finding: string; // what the 2026-11-16 research pass found
}

/** Names requested for the catalogue that could not be substantiated in the research pass. */
export const PENDING_BRANDS: PendingBrand[] = [
  { name: "Hygge", context: "Requested wheel brand", finding: "No search results referencing a bicycle wheel brand of this name." },
  { name: "OG-EVKIN", context: "Requested wheel brand", finding: "No search results — spelling and existence unconfirmed." },
  { name: "ONIRII", context: "Requested wheel brand", finding: "No search results — spelling and existence unconfirmed." },
  { name: "BXT", context: "Requested wheel brand", finding: "No relevant results." },
  { name: "Carbonal", context: "Requested wheel brand (Taiwan?)", finding: "No relevant results." },
  { name: "CSC", context: "Requested wheel brand", finding: "No relevant results." },
  { name: "Tideace", context: "Requested frame brand", finding: "No relevant results." },
  { name: "VeloBuild", context: "Requested frame brand", finding: "No relevant results." },
  { name: "8LIEN", context: "Requested wheel brand", finding: "Forum mentions only (Weight Weenies), possibly a Chinese supplier; no official source." },
  { name: "Serenade", context: "Requested wheel brand", finding: "Single forum post describing a WhatsApp-ordered wheelset; no official source." },
  { name: "Wheelsfar", context: "Requested wheel brand", finding: "Forum comparisons with Farsports only; no official source." },
  { name: "BTLOS", context: "Requested wheel brand", finding: "Single passing mention (BTLOS RG36) in a Velofanatics article." },
  { name: "Nextie", context: "Requested rim brand", finding: "Only a 2015 build report mentioning Nextie hookless rims." },
];

export interface OfficialSource {
  brand: string;
  url: string;
  type: SourceType;
  covers: string;
  status: "awaiting-integration" | "blocked-by-network" | "needs-permission";
}

/**
 * Official sources the ingestion adapters should read. In this build the server cannot reach
 * manufacturer sites (environment network policy), so every entry is awaiting integration —
 * no product data has been imported from them.
 */
export const OFFICIAL_SOURCES: OfficialSource[] = [
  { brand: "Polygon", url: "https://www.polygonbikes.com", type: "official-website", covers: "Model pages, specs, geometry, MSRP by region", status: "blocked-by-network" },
  { brand: "Polygon", url: "https://www.rodalink.com/id/", type: "authorized-distributor", covers: "Indonesian retail pricing and availability (Polygon, Wimcycle and others)", status: "blocked-by-network" },
  { brand: "Pacific", url: "https://pacific-bike.com", type: "official-website", covers: "Model catalogue", status: "blocked-by-network" },
  { brand: "United Bike", url: "https://www.unitedbike.com", type: "official-website", covers: "Model catalogue (domain to be confirmed)", status: "blocked-by-network" },
  { brand: "Pardus", url: "https://www.pardusbicycle.com", type: "official-website", covers: "Road, track and TT models", status: "blocked-by-network" },
  { brand: "Tavelo", url: "https://tavelo.cc", type: "official-website", covers: "Arow / Arden / Grow / Wild", status: "blocked-by-network" },
  { brand: "Quick Pro", url: "https://www.quickprousa.com", type: "official-website", covers: "AR:ONE / ER:ONE / SR:ONE / TT:ONE", status: "blocked-by-network" },
  { brand: "Light Bicycle", url: "https://www.lightbicycle.com", type: "official-website", covers: "Rim and wheel specifications", status: "blocked-by-network" },
  { brand: "Magene / EXAR", url: "https://support.magene.com", type: "technical-manual", covers: "EXAR wheel specifications", status: "blocked-by-network" },
];
