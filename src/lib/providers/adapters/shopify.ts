/**
 * Manufacturer storefronts on Shopify (public storefront JSON).
 *  - search: /search/suggest.json when the store's robots.txt allows it, else the cached catalogue
 *  - sync:   /products.json paged (robots-checked), at most one request per second per store
 * Only facts and links are kept: prices, availability, titles, extracted specifications, the product
 * URL and an image URL reference. Descriptions are not stored and images are not copied.
 * The store currency is fixed per store (confirmed from the store's own /meta.json).
 */
import { TtlCache } from "../cache";
import { num, toOffer } from "../normalize";
import type { ProviderAdapter, ProviderContext, ProviderMeta, SyncResult } from "../types";
import type { Offer } from "@/lib/parts/types";

export interface ShopifyStore {
  host: string;              // e.g. "icancycling.com"
  brand: string;             // the manufacturer that owns the store
  ownBrands?: string[];      // other brands the same company owns (e.g. Winspace → Lún): not "resold"
  seller: string;
  currency: string;          // ISO 4217, from the store's /meta.json
  country?: string | null;   // store's country per /meta.json
  maxPages?: number;         // catalogue sync bound (250 products per page)
  verified: string | null;   // date the store, currency and robots were checked; null = candidate, not verified
}

interface SuggestProduct { title: string; handle: string; url: string; price: string; compare_at_price_max?: string; available: boolean; vendor?: string; type?: string; tags?: string[]; image?: string | null; body?: string }
interface CatalogProduct { title: string; handle: string; vendor?: string; product_type?: string; tags?: string[] | string; body_html?: string; variants: Array<{ title: string; price: string; compare_at_price?: string | null; available?: boolean; sku?: string | null }>; images?: Array<{ src: string }> }

const catalogCache = new TtlCache<CatalogProduct[]>(50);
/** store items that are not products (gift cards, fees, shipping protection) are never offers */
export const NOT_A_PRODUCT = /\b(e-?gift|gift ?card|gift voucher|extra fee|additional fee|shipping (fee|protection|insurance)|route (package|protection)|deposit|donation|test product)\b/i;
const CATALOG_TTL = 12 * 3600 * 1000;

export function shopifyStore(store: ShopifyStore, overrides: Partial<ProviderMeta> = {}): ProviderAdapter {
  const id = `shopify:${store.host}`;
  const meta: ProviderMeta = {
    id, name: `${store.brand} official store`, type: "manufacturer-store",
    accessMethod: "Public Shopify storefront JSON (/search/suggest.json, /products.json), robots.txt checked per path",
    permission: store.verified ? "public-endpoint" : "unknown", capabilities: ["search", "sync"],
    categories: ["wheelsets", "rims", "hubs", "components"], manufacturers: [store.brand], countries: store.country ? [store.country] : [],
    dataFormat: "JSON", auth: "none", credentialsEnv: [], cost: "free",
    displayPermission: "Facts and links with attribution; descriptions are not reproduced. robots.txt permits crawling, which is not a content licence.",
    imagePermission: "Image URLs are referenced, not copied. Copying into VELOX storage needs permission (Image Manager).",
    rateLimit: "1 request/second per store", updateFrequency: "catalogue sync daily; live search cached 6 h",
    docsUrl: "https://shopify.dev/docs/api/ajax", termsUrl: `https://${store.host}/policies/terms-of-service`,
    notes: store.verified ? `Store, currency (${store.currency}) and robots.txt checked ${store.verified}.` : "Candidate store — not verified (structure, currency and robots.txt unchecked). Verify before enabling.",
    defaultEnabled: !!store.verified, ...overrides,
  };
  const base = `https://${store.host}`;
  const facts = (p: { title: string; handle: string; vendor?: string; price: number | null; listPrice: number | null; available: boolean | null; image: string | null; text: string; extra: string; sku?: string | null }, checkedAt: string): Offer =>
    toOffer({ providerId: id, key: p.handle, url: `${base}/products/${p.handle}`, title: p.title, storeBrand: store.brand, ownBrands: store.ownBrands, vendor: p.vendor, sourceKind: "official-manufacturer",
      seller: store.seller, sellerCountry: store.country, price: p.price, currency: store.currency, listPrice: p.listPrice, available: p.available, condition: "new",
      imageUrl: p.image, text: p.text, extraForCategory: p.extra, mpn: p.sku ?? null, checkedAt });

  async function catalogue(ctx: ProviderContext): Promise<CatalogProduct[]> {
    const hit = catalogCache.get(store.host, CATALOG_TTL);
    if (hit) return hit.value;
    const all: CatalogProduct[] = [];
    for (let page = 1; page <= (store.maxPages ?? 20); page++) {
      const r = await ctx.http.json<{ products: CatalogProduct[] }>(`${base}/products.json?limit=250&page=${page}`, { signal: ctx.signal });
      if (!r.products.length) break; // pages can hold fewer than 250 (hidden products): only an empty page ends the catalogue
      all.push(...r.products.filter((p) => !NOT_A_PRODUCT.test(p.title) && !/gift card/i.test(p.product_type ?? "")));
    }
    catalogCache.set(store.host, all);
    return all;
  }
  const fromCatalog = (p: CatalogProduct, checkedAt: string): Offer => {
    const prices = p.variants.map((v) => num(v.price)).filter((x): x is number => x != null && x > 0);
    const lists = p.variants.map((v) => num(v.compare_at_price)).filter((x): x is number => x != null && x > 0);
    const offer = facts({ title: p.title, handle: p.handle, vendor: p.vendor, price: prices.length ? Math.min(...prices) : null, listPrice: lists.length ? Math.max(...lists) : null,
      available: p.variants.some((v) => v.available === true) ? true : p.variants.every((v) => v.available === false) ? false : null,
      image: p.images?.[0]?.src ?? null, text: p.body_html ?? "", extra: `${p.product_type ?? ""} ${Array.isArray(p.tags) ? p.tags.join(" ") : p.tags ?? ""}`,
      sku: p.variants.length === 1 ? p.variants[0].sku : null }, checkedAt);
    // variants stay separate facts on the offer — never merged into another product
    offer.variants = p.variants.map((v) => ({ title: v.title, price: num(v.price), available: v.available ?? null, sku: v.sku ?? null }));
    return offer;
  };

  return {
    meta,
    configured: () => (store.verified ? { ok: true } : { ok: false, missing: [], reason: "Candidate store not verified yet" }),
    async search(query, ctx) {
      const checkedAt = ctx.now().toISOString();
      const suggest = `${base}/search/suggest.json?q=${encodeURIComponent(query.q)}&resources%5Btype%5D=product&resources%5Blimit%5D=10`;
      if (await ctx.http.allowedByRobots(suggest)) {
        const r = await ctx.http.json<{ resources: { results: { products?: SuggestProduct[] } } }>(suggest, { signal: ctx.signal });
        return (r.resources.results.products ?? []).filter((p) => !NOT_A_PRODUCT.test(p.title)).slice(0, query.limit).map((p) => facts({ title: p.title, handle: p.handle, vendor: p.vendor, price: num(p.price),
          listPrice: num(p.compare_at_price_max), available: p.available, image: p.image ?? null, text: p.body ?? "", extra: `${p.type ?? ""} ${(p.tags ?? []).join(" ")}` }, checkedAt));
      }
      // search endpoint disallowed for crawlers: filter the (cached, robots-permitted) catalogue instead
      const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);
      return (await catalogue(ctx)).filter((p) => { const t = `${p.title} ${p.product_type ?? ""} ${p.vendor ?? ""}`.toLowerCase(); return words.every((w) => t.includes(w)); })
        .slice(0, query.limit).map((p) => fromCatalog(p, checkedAt));
    },
    async sync(ctx): Promise<SyncResult> {
      const checkedAt = ctx.now().toISOString();
      const products = await catalogue(ctx);
      return { offers: products.map((p) => fromCatalog(p, checkedAt)), seen: products.length, notes: [`${products.length} products from ${store.host}`] };
    },
    async test(ctx) {
      const m = await ctx.http.json<{ currency?: string; published_products_count?: number }>(`${base}/meta.json`, { signal: ctx.signal });
      const ok = m.currency === store.currency;
      return { ok, detail: ok ? `Reachable; currency ${m.currency}; ${m.published_products_count ?? "?"} published products` : `Currency changed: store reports ${m.currency}, configured ${store.currency}` };
    },
  };
}
