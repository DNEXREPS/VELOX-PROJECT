/**
 * Product feeds: CSV, JSON or XML (RSS / Atom / Google Merchant-style). For distributor, retailer and
 * affiliate feeds that a partner has authorised VELOX to use. Feed URLs often contain access tokens,
 * so the URL is read from a server environment variable named in the config — never stored in the database.
 * Field names default to the Google Merchant feed specification and can be remapped per feed.
 */
import { parseCsv } from "@/lib/csv";
import { num, toOffer } from "../normalize";
import type { ProviderAdapter, ProviderMeta, SyncResult } from "../types";
import type { Condition, Offer, SourceKind } from "@/lib/parts/types";

export interface FeedConfig {
  id: string;
  name: string;
  format: "csv" | "json" | "xml";
  urlEnv: string;                 // NAME of the server env var holding the feed URL
  seller: string;
  sellerKind: Extract<SourceKind, "official-manufacturer" | "authorized-distributor" | "retailer">;
  country?: string | null;
  currency?: string | null;       // when prices carry no currency
  affiliate?: boolean;            // links are affiliate links: always disclosed in the UI
  mapping?: Partial<Record<FeedField, string>>;
}
export type FeedField = "id" | "title" | "link" | "price" | "sale_price" | "brand" | "gtin" | "mpn" | "image_link" | "availability" | "condition" | "product_type" | "description";
const DEFAULT_MAP: Record<FeedField, string> = { id: "id", title: "title", link: "link", price: "price", sale_price: "sale_price", brand: "brand", gtin: "gtin", mpn: "mpn", image_link: "image_link", availability: "availability", condition: "condition", product_type: "product_type", description: "description" };

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").trim();

/** Minimal parser for flat item feeds (<item>/<entry> with simple children, optional "g:" prefix). */
export function parseXmlItems(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  for (const m of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const rec: Record<string, string> = {};
    for (const c of m[2].matchAll(/<([a-zA-Z_][\w.-]*:)?([a-zA-Z_][\w.-]*)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1?\2>)/g)) {
      const key = c[2], attrs = c[3] ?? "";
      const val = c[4] != null ? decode(c[4]) : (attrs.match(/href="([^"]*)"/)?.[1] ?? "");
      if (!(key in rec) && val) rec[key] = val;
    }
    items.push(rec);
  }
  return items;
}

export function parseFeed(body: string, format: FeedConfig["format"]): Array<Record<string, unknown>> {
  if (format === "csv") return parseCsv(body);
  if (format === "json") { const d = JSON.parse(body); return Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.products) ? d.products : []; }
  return parseXmlItems(body);
}

const AVAIL: Record<string, boolean | null> = { "in stock": true, in_stock: true, instock: true, "out of stock": false, out_of_stock: false, outofstock: false, preorder: null, backorder: null };
const COND: Record<string, Condition> = { new: "new", used: "used", refurbished: "refurbished" };

/** Map feed rows to offers. Rows without a title or a product link are skipped (counted, not invented). */
export function feedRowsToOffers(rows: Array<Record<string, unknown>>, cfg: FeedConfig, checkedAt: string): { offers: Offer[]; skipped: number } {
  const map = { ...DEFAULT_MAP, ...cfg.mapping };
  const get = (r: Record<string, unknown>, f: FeedField) => { const v = r[map[f]]; return v == null ? "" : String(v).trim(); };
  const offers: Offer[] = []; let skipped = 0;
  for (const r of rows) {
    const title = get(r, "title"), link = get(r, "link");
    if (!title || !/^https?:\/\//.test(link)) { skipped++; continue; }
    const priceRaw = get(r, "sale_price") || get(r, "price");
    const currency = priceRaw.match(/\b([A-Z]{3})\b/)?.[1] ?? cfg.currency ?? null;
    offers.push(toOffer({
      providerId: cfg.id, key: get(r, "id") || link, url: link, title, vendor: get(r, "brand") || null, sourceKind: cfg.sellerKind, seller: cfg.seller, sellerCountry: cfg.country,
      price: num(priceRaw), currency, listPrice: get(r, "sale_price") ? num(get(r, "price")) : null, available: AVAIL[get(r, "availability").toLowerCase()] ?? null,
      condition: COND[get(r, "condition").toLowerCase()] ?? "unknown", imageUrl: get(r, "image_link") || null, text: get(r, "description"),
      extraForCategory: get(r, "product_type"), gtin: get(r, "gtin") || null, mpn: get(r, "mpn") || null, affiliate: cfg.affiliate,
      identification: get(r, "gtin") || get(r, "mpn") ? "exact" : "probable", checkedAt,
    }));
    const o = offers[offers.length - 1];
    if (!o.brand && get(r, "brand")) o.brand = get(r, "brand");
  }
  return { offers, skipped };
}

export function feedAdapter(cfg: FeedConfig, env: Record<string, string | undefined> = process.env): ProviderAdapter {
  const meta: ProviderMeta = {
    id: `feed:${cfg.id}`, name: cfg.name, type: cfg.sellerKind === "retailer" ? "retailer-feed" : "distributor-feed",
    accessMethod: `${cfg.format.toUpperCase()} product feed supplied by the partner`, permission: "permitted", capabilities: ["sync"],
    categories: [], manufacturers: [], countries: cfg.country ? [cfg.country] : [], dataFormat: cfg.format.toUpperCase(), auth: `feed URL in ${cfg.urlEnv}`,
    credentialsEnv: [cfg.urlEnv], cost: "per partner agreement", displayPermission: "As agreed with the partner", imagePermission: "As agreed with the partner",
    rateLimit: "one download per sync", updateFrequency: "daily", notes: cfg.affiliate ? "Affiliate links — disclosed to users." : null, defaultEnabled: true,
  };
  return {
    meta,
    configured: () => (env[cfg.urlEnv] ? { ok: true } : { ok: false, missing: [cfg.urlEnv], reason: "Feed URL not configured" }),
    async sync(ctx): Promise<SyncResult> {
      const url = env[cfg.urlEnv]!;
      const { text } = await ctx.http.text(url, { signal: ctx.signal, robots: false }); // an authorised feed, not a crawl
      const { offers, skipped } = feedRowsToOffers(parseFeed(text, cfg.format), cfg, ctx.now().toISOString());
      return { offers, seen: offers.length + skipped, notes: skipped ? [`${skipped} rows skipped (no title or product link)`] : [] };
    },
  };
}
