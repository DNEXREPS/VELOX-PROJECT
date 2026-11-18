/**
 * Provider adapter contract. Every external source (manufacturer store, product feed, search API,
 * marketplace API, self-hosted metasearch, manual research) implements this interface, so adding a
 * source never changes the search engine, the sync job or the UI.
 *
 * Adapters must:
 *  - only use permitted access (official APIs, public endpoints allowed by robots.txt, licensed feeds)
 *  - never bypass CAPTCHA, Cloudflare, logins or rate limits
 *  - return facts and links, not copied descriptions or rehosted images
 *  - report "not-configured" instead of pretending to work without credentials
 */
import type { Offer, PartCategory } from "@/lib/parts/types";

export type ProviderType = "internal-catalog" | "manufacturer-store" | "distributor-feed" | "retailer-feed" | "marketplace-api" | "web-search" | "social-api" | "industry-data" | "compatibility-api" | "manual";

export type PermissionStatus = "permitted" | "public-endpoint" | "requires-credentials" | "requires-agreement" | "manual-only" | "not-permitted" | "unknown";

/** Non-secret metadata, mirrored to the `providers` table and shown in Admin. */
export interface ProviderMeta {
  id: string;
  name: string;
  type: ProviderType;
  accessMethod: string;
  permission: PermissionStatus;
  /** what the integration can do once enabled */
  capabilities: Array<"search" | "sync" | "research" | "url-extract">;
  categories: string[];
  manufacturers: string[];
  countries: string[];
  dataFormat: string;
  auth: string; // description only
  credentialsEnv: string[]; // NAMES of server env vars
  cost: string;
  displayPermission: string;
  imagePermission: string;
  rateLimit: string;
  updateFrequency: string;
  docsUrl?: string | null;
  termsUrl?: string | null;
  notes?: string | null;
  /** enabled when VELOX starts with no admin override */
  defaultEnabled: boolean;
}

export interface ProviderQuery {
  q: string;
  category?: PartCategory | null;
  includeUsed?: boolean;
  limit: number;
}

export interface ProviderContext {
  signal: AbortSignal;
  http: import("./http").PoliteHttp;
  now: () => Date;
}

export type Configured = { ok: true } | { ok: false; missing: string[]; reason: string };

export interface SyncResult { offers: Offer[]; seen: number; notes: string[] }

/** A mention of a product in a post, video or discussion (research input — not an offer, not a fact). */
export interface Mention {
  providerId: string;
  platform: string;
  url: string;
  title: string;
  publisher: string | null;
  publishedAt: string | null;
  snippet: string | null;
  thumbnailUrl: string | null; // reference only
  retrievedAt: string;
}

export interface ProviderAdapter {
  meta: ProviderMeta;
  configured(): Configured;
  search?(query: ProviderQuery, ctx: ProviderContext): Promise<Offer[]>;
  /** background catalogue synchronisation (manufacturer stores, feeds) */
  sync?(ctx: ProviderContext): Promise<SyncResult>;
  /** admin research: find public mentions (videos, posts, discussions) of a product */
  research?(q: string, ctx: ProviderContext): Promise<Mention[]>;
  /** cheap connectivity check for Admin → Data sources */
  test?(ctx: ProviderContext): Promise<{ ok: boolean; detail: string }>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly kind: "http" | "robots" | "not-configured" | "parse" | "timeout" | "network", readonly status?: number) { super(message); }
}
