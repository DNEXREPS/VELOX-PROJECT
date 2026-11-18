/**
 * Provider registry: every source VELOX knows about, with an adapter when a permitted automated method
 * exists, or as a registry-only entry (agreement needed / manual research only). Adding a source means
 * adding an entry here — the aggregator, sync job and Admin view pick it up unchanged.
 */
import { shopifyStore, type ShopifyStore } from "./adapters/shopify";
import { feedAdapter, type FeedConfig } from "./adapters/feed";
import { searxngAdapter } from "./adapters/searxng";
import { braveAdapter, ebayAdapter, youtubeAdapter } from "./adapters/gated";
import type { ProviderAdapter, ProviderMeta } from "./types";

/** Verified 17 Nov 2026 from this project: storefront JSON reachable, currency from the store's /meta.json, robots.txt checked per path. */
export const VERIFIED_STORES: ShopifyStore[] = [
  { host: "icancycling.com", brand: "ICAN", seller: "ICAN Cycling (official store)", currency: "USD", country: "US", verified: "2026-11-17" },
  { host: "www.winspace.cc", brand: "Winspace", ownBrands: ["Lún"], seller: "Winspace (official store)", currency: "USD", country: "HK", verified: "2026-11-17" },
  { host: "us.huntbikewheels.com", brand: "Hunt", seller: "Hunt Bike Wheels US (official store)", currency: "USD", country: "US", maxPages: 15, verified: "2026-11-17" },
  { host: "www.yoeleo.com", brand: "Yoeleo", seller: "YOELEO (official store)", currency: "USD", country: "HK", verified: "2026-11-17" }, // robots.txt disallows /search → catalogue only
];

/** Candidates named in the brief. Not verified (unreachable from the development network); disabled until checked. */
export const CANDIDATE_STORES: Array<Pick<ShopifyStore, "host" | "brand">> = [
  { host: "elitewheels.cc", brand: "Elitewheels" }, { host: "www.farsports.com", brand: "Farsports" }, { host: "superteamwheels.com", brand: "Superteam" },
  { host: "www.lightbicycle.com", brand: "Light Bicycle" }, { host: "www.novatecwheels.com", brand: "Novatec" }, { host: "bitexbike.com", brand: "Bitex" },
  { host: "www.powerwaybike.com", brand: "Powerway" }, { host: "www.ltwoo.com", brand: "LTWOO" }, { host: "sensah.com", brand: "Sensah" },
  { host: "www.microshift.com", brand: "MicroSHIFT" }, { host: "wheeltop.com", brand: "Wheeltop" }, { host: "lunwheels.com", brand: "Lún" },
];

const regOnly = (m: Omit<ProviderMeta, "capabilities" | "categories" | "manufacturers" | "defaultEnabled" | "credentialsEnv"> & Partial<ProviderMeta>): ProviderMeta =>
  ({ capabilities: [], categories: [], manufacturers: [], credentialsEnv: [], defaultEnabled: false, ...m });

/** Sources investigated with no permitted automated method available today (see docs/ecosystem-plan.md §2). */
export const REGISTRY_ONLY: ProviderMeta[] = [
  regOnly({ id: "shopee-affiliate", name: "Shopee Affiliate Open API (ID)", type: "marketplace-api", accessMethod: "GraphQL Open API after affiliate approval", permission: "requires-agreement", countries: ["ID"], dataFormat: "JSON", auth: "app id + secret (after approval)", cost: "free; affiliate approval required", displayPermission: "per affiliate terms (links must be disclosed)", imagePermission: "per affiliate terms", rateLimit: "per programme", updateFrequency: "—", docsUrl: "https://affiliate.shopee.co.id", notes: "Not implemented as functional until approved credentials exist. Use manual URL submission meanwhile." }),
  regOnly({ id: "aliexpress-affiliate", name: "AliExpress Affiliate API", type: "marketplace-api", accessMethod: "signed Open Platform requests", permission: "requires-agreement", countries: ["global"], dataFormat: "JSON", auth: "app key + secret + tracking id", cost: "free; affiliate approval required", displayPermission: "per affiliate terms", imagePermission: "per affiliate terms", rateLimit: "per programme", updateFrequency: "—", notes: "Signing details to be confirmed against official docs once approved." }),
  regOnly({ id: "tokopedia", name: "Tokopedia / TikTok Shop", type: "marketplace-api", accessMethod: "Partner Center APIs (seller-scoped)", permission: "manual-only", countries: ["ID"], dataFormat: "—", auth: "partner approval; scoped to own/authorised shops", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "No public product search API. Manual URL submission + research form only." }),
  regOnly({ id: "lazada", name: "Lazada", type: "marketplace-api", accessMethod: "affiliate / seller programmes", permission: "manual-only", countries: ["ID"], dataFormat: "—", auth: "—", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "Manual research only until an affiliate agreement exists." }),
  regOnly({ id: "blibli", name: "Blibli", type: "marketplace-api", accessMethod: "seller programme", permission: "manual-only", countries: ["ID"], dataFormat: "—", auth: "—", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "Manual research only." }),
  regOnly({ id: "platform-dst", name: "Platform DST", type: "industry-data", accessMethod: "DST API (JSON 3.0)", permission: "requires-agreement", countries: ["NL", "BE", "DE"], dataFormat: "JSON", auth: "DST account", cost: "free for bicycle retailers; VELOX eligibility to confirm", displayPermission: "per DST terms", imagePermission: "per DST terms", rateLimit: "—", updateFrequency: "daily", docsUrl: "https://hartje.de/en/services/dst-platform/" }),
  regOnly({ id: "bidex", name: "BIDEX", type: "industry-data", accessMethod: "BIDEX XML 1.7 via partner APIs", permission: "requires-agreement", countries: ["DE", "EU"], dataFormat: "XML", auth: "partner agreement", cost: "to confirm", displayPermission: "per agreement", imagePermission: "per agreement", rateLimit: "—", updateFrequency: "—", docsUrl: "https://hartje.de/en/services/bidex/" }),
  regOnly({ id: "bike-matrix", name: "Bike Matrix", type: "compatibility-api", accessMethod: "licensed compatibility API", permission: "requires-agreement", countries: ["global"], dataFormat: "JSON", auth: "API key after licence", cost: "paid, usage-tiered — not enabled (zero budget)", displayPermission: "licence requires their indicators + attribution", imagePermission: "—", rateLimit: "per licence", updateFrequency: "—", docsUrl: "https://docs.bikematrix.io/docs/intro", notes: "Optional; VELOX's own compatibility engine stays independent." }),
  regOnly({ id: "google-cse", name: "Google Custom Search JSON API", type: "web-search", accessMethod: "—", permission: "not-permitted", countries: [], dataFormat: "JSON", auth: "—", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "Closed to new customers; discontinued 1 Jan 2027. Not used." }),
  regOnly({ id: "instagram", name: "Instagram", type: "social-api", accessMethod: "Graph API (business accounts, Meta app review)", permission: "manual-only", countries: ["global"], dataFormat: "—", auth: "Meta app review", cost: "free; review required", displayPermission: "—", imagePermission: "embedding only", rateLimit: "—", updateFrequency: "—", notes: "Manual URL submission + research form. No automated retrieval." }),
  regOnly({ id: "facebook", name: "Facebook (pages, groups, Marketplace)", type: "social-api", accessMethod: "no public API for groups/Marketplace", permission: "manual-only", countries: ["global"], dataFormat: "—", auth: "—", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "Private groups are never accessed. Manual research only." }),
  regOnly({ id: "tiktok", name: "TikTok", type: "social-api", accessMethod: "official oEmbed for a submitted URL", permission: "public-endpoint", countries: ["global"], dataFormat: "JSON", auth: "none", cost: "free", displayPermission: "title, author, link", imagePermission: "thumbnail reference only", rateLimit: "1 req/s", updateFrequency: "on submission", capabilities: ["url-extract"], notes: "Research API is academic-only; VELOX reads single submitted URLs via oEmbed." }),
  regOnly({ id: "rodalink", name: "Rodalink (Polygon retail)", type: "retailer-feed", accessMethod: "—", permission: "manual-only", countries: ["ID"], dataFormat: "—", auth: "—", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "Site refuses automated access; request an official feed." }),
  regOnly({ id: "pacific-bike", name: "Pacific Bike (official site)", type: "manufacturer-store", accessMethod: "—", permission: "manual-only", countries: ["ID"], manufacturers: ["Pacific", "Exotic", "SYTE"], dataFormat: "—", auth: "—", cost: "—", displayPermission: "—", imagePermission: "—", rateLimit: "—", updateFrequency: "—", notes: "Cloudflare challenge to automated clients (not bypassed). Request an official export; meanwhile admins enter data from the official pages." }),
];

/** Authorised feeds are declared in the server env (VELOX_FEEDS = JSON array of FeedConfig); URLs live in their own env vars. */
export function configuredFeeds(env: Record<string, string | undefined> = process.env): FeedConfig[] {
  try { const v = JSON.parse(env.VELOX_FEEDS ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function buildAdapters(env: Record<string, string | undefined> = process.env): ProviderAdapter[] {
  return [
    ...VERIFIED_STORES.map((s) => shopifyStore(s)),
    ...CANDIDATE_STORES.map((c) => shopifyStore({ host: c.host, brand: c.brand, seller: `${c.brand} (official store)`, currency: "", verified: null })), // currency unknown until verified
    ...configuredFeeds(env).map((f) => feedAdapter(f, env)),
    searxngAdapter(env), ebayAdapter(env), braveAdapter(env), youtubeAdapter(env),
  ];
}
