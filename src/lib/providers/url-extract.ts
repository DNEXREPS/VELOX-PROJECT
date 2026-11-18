/**
 * Manual URL submission: identify a product from a URL using only permitted methods.
 *   - social networks and marketplaces whose terms prohibit automated retrieval → not fetched; the
 *     admin fills the manual research form instead
 *   - YouTube, TikTok and Vimeo → their official oEmbed endpoints (title, author, thumbnail reference)
 *   - other pages → polite fetch (robots.txt, 1 req/s per host), then the page's own structured data
 *     (schema.org Product JSON-LD, Open Graph). Nothing is guessed from images or free text beyond
 *     extracting stated specifications.
 * A blocked page (401/403, Cloudflare challenge) is reported as blocked — never retried another way.
 */
import { detectCategory } from "@/lib/parts/categories";
import { extractSpecs, stripHtml } from "@/lib/parts/extract";
import { num } from "./normalize";
import { ProviderError } from "./types";
import type { PoliteHttp } from "./http";
import type { Condition, PartSpecs } from "@/lib/parts/types";

export type SourceKindD = "official-manufacturer" | "authorized-distributor" | "retailer" | "marketplace" | "social" | "community" | "publication" | "web";

export interface DiscoveryDraft {
  sourceUrl: string;
  sourceKind: SourceKindD;
  platform: string | null;
  method: "manual-url";
  retrievalStatus: "extracted" | "partial" | "manual-required" | "not-permitted" | "blocked" | "failed";
  retrievalNote: string;
  title: string | null;
  brandText: string | null;
  mpn: string | null;
  gtin: string | null;
  price: number | null;
  currency: string | null;
  availability: "in-stock" | "out-of-stock" | "preorder" | "unknown";
  condition: Condition;
  imageRefs: string[];
  publisher: string | null;
  publishedAt: string | null;
  categoryHint: string | null;
  specs: PartSpecs;
  structuredData: "json-ld" | "open-graph" | "oembed" | "none";
  retrievedAt: string;
}

/** Platforms whose terms do not permit automated retrieval of listings/posts: manual research only. */
const MANUAL_ONLY: Array<[RegExp, string, SourceKindD]> = [
  [/(^|\.)instagram\.com$/, "Instagram", "social"], [/(^|\.)(facebook\.com|fb\.com|fb\.watch)$/, "Facebook", "social"], [/(^|\.)threads\.net$/, "Threads", "social"],
  [/(^|\.)(x\.com|twitter\.com)$/, "X", "social"], [/(^|\.)pinterest\.[a-z.]+$/, "Pinterest", "social"], [/(^|\.)reddit\.com$/, "Reddit", "community"],
  [/(^|\.)shopee\.[a-z.]+$/, "Shopee", "marketplace"], [/(^|\.)tokopedia\.com$/, "Tokopedia", "marketplace"], [/(^|\.)shop\.tiktok\.com$/, "TikTok Shop", "marketplace"],
  [/(^|\.)lazada\.[a-z.]+$/, "Lazada", "marketplace"], [/(^|\.)blibli\.com$/, "Blibli", "marketplace"], [/(^|\.)bukalapak\.com$/, "Bukalapak", "marketplace"],
  [/(^|\.)aliexpress\.[a-z.]+$/, "AliExpress", "marketplace"], [/(^|\.)alibaba\.com$/, "Alibaba", "marketplace"], [/(^|\.)ebay\.[a-z.]+$/, "eBay", "marketplace"],
  [/(^|\.)amazon\.[a-z.]+$/, "Amazon", "marketplace"],
];
const OEMBED: Array<[RegExp, string, (u: string) => string]> = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube", (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`],
  [/(^|\.)tiktok\.com$/, "TikTok", (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`],
  [/(^|\.)vimeo\.com$/, "Vimeo", (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`],
];

const empty = (url: string, now: string): DiscoveryDraft => ({
  sourceUrl: url, sourceKind: "web", platform: null, method: "manual-url", retrievalStatus: "failed", retrievalNote: "", title: null, brandText: null, mpn: null, gtin: null,
  price: null, currency: null, availability: "unknown", condition: "unknown", imageRefs: [], publisher: null, publishedAt: null, categoryHint: null, specs: {}, structuredData: "none", retrievedAt: now,
});

type Json = Record<string, unknown>;
const asArr = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

/** Find schema.org Product objects in JSON-LD blocks (including @graph and nested arrays). */
export function findJsonLdProducts(html: string): Json[] {
  const out: Json[] = [];
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    const o = n as Json;
    const t = asArr(o["@type"] as string | string[]).map((x) => String(x).toLowerCase());
    if (t.includes("product") || t.includes("productgroup")) out.push(o);
    if (o["@graph"]) visit(o["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(m[1].trim())); } catch { /* malformed block: ignored */ }
  }
  return out;
}

const meta = (html: string, prop: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop.replace(/[:.]/g, "\\$&")}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1]
  ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop.replace(/[:.]/g, "\\$&")}["']`, "i"))?.[1] ?? null;

const AVAIL = (v: string | null): DiscoveryDraft["availability"] => (!v ? "unknown" : /instock|in_stock|in stock/i.test(v) ? "in-stock" : /outofstock|out_of_stock|soldout/i.test(v) ? "out-of-stock" : /preorder|backorder/i.test(v) ? "preorder" : "unknown");
const COND = (v: string | null): Condition => (!v ? "unknown" : /used/i.test(v) ? "used" : /refurb/i.test(v) ? "refurbished" : /new/i.test(v) ? "new" : "unknown");

export function draftFromHtml(url: string, html: string, now: string, knownManufacturerHosts: string[] = []): DiscoveryDraft {
  const d = empty(url, now);
  const host = new URL(url).host.replace(/^www\./, "");
  d.sourceKind = knownManufacturerHosts.some((h) => host === h.replace(/^www\./, "")) ? "official-manufacturer" : "web";
  const products = findJsonLdProducts(html);
  if (products.length) {
    const p = products[0];
    const offer = asArr(p.offers as Json | Json[])[0] as Json | undefined;
    const inner = offer && asArr(offer.offers as Json | Json[])[0] as Json | undefined; // AggregateOffer
    const o = inner ?? offer;
    d.structuredData = "json-ld";
    d.title = str(p.name);
    d.brandText = str((p.brand as Json | undefined)?.name ?? p.brand);
    d.mpn = str(p.mpn ?? p.sku);
    d.gtin = str(p.gtin13 ?? p.gtin ?? p.gtin14 ?? p.gtin12 ?? p.gtin8);
    d.price = num(o?.price ?? o?.lowPrice ?? offer?.lowPrice);
    d.currency = str(o?.priceCurrency ?? offer?.priceCurrency)?.toUpperCase() ?? null;
    d.availability = AVAIL(str(o?.availability));
    d.condition = COND(str(o?.itemCondition));
    d.publisher = str((o?.seller as Json | undefined)?.name);
    d.imageRefs = asArr(p.image as string | string[] | Json).map((i) => (typeof i === "string" ? i : str((i as Json).url))).filter((x): x is string => !!x).slice(0, 6);
    const desc = str(p.description) ?? "";
    d.specs = extractSpecs(`${d.title ?? ""}\n${stripHtml(desc)}`);
  } else {
    const ogTitle = meta(html, "og:title") ?? html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
    if (ogTitle) {
      d.structuredData = meta(html, "og:title") ? "open-graph" : "none";
      d.title = ogTitle;
      d.price = num(meta(html, "product:price:amount") ?? meta(html, "og:price:amount"));
      d.currency = (meta(html, "product:price:currency") ?? meta(html, "og:price:currency"))?.toUpperCase() ?? null;
      d.availability = AVAIL(meta(html, "product:availability") ?? meta(html, "og:availability"));
      d.brandText = meta(html, "product:brand");
      const img = meta(html, "og:image"); if (img) d.imageRefs = [img];
      d.specs = extractSpecs(`${ogTitle}\n${meta(html, "og:description") ?? ""}`);
    }
  }
  if (d.price == null || !d.currency) { d.price = null; d.currency = null; }
  d.categoryHint = d.title ? detectCategory(d.title) : null;
  d.retrievalStatus = d.title && (d.structuredData === "json-ld" ? true : d.brandText || d.price != null) ? "extracted" : d.title ? "partial" : "manual-required";
  d.retrievalNote = d.structuredData === "json-ld" ? "Read from the page's schema.org Product data." : d.structuredData === "open-graph" ? "Read from the page's Open Graph tags only — verify details manually." : "No structured product data on the page — complete the manual research form.";
  return d;
}

/** Fetch HTML following at most 3 redirects, vetting every hop with `guard` (SSRF protection). */
async function fetchVetted(start: string, http: PoliteHttp, guard: (u: URL) => Promise<boolean>, signal?: AbortSignal) {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    if (!(await guard(url))) throw new ProviderError(`${url.host} resolves to a private or local address`, "network");
    const res = await http.request(url.toString(), { signal, redirect: "manual", headers: { accept: "text/html,application/xhtml+xml" } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new ProviderError("redirect without a location", "http", res.status);
      url = new URL(loc, url);
      continue;
    }
    return { text: await res.text(), finalUrl: url.toString() };
  }
  throw new ProviderError("too many redirects", "http");
}

export async function extractFromUrl(raw: string, http: PoliteHttp, opts: { now?: Date; signal?: AbortSignal; knownManufacturerHosts?: string[]; guard?: (u: URL) => Promise<boolean> } = {}): Promise<DiscoveryDraft> {
  const now = (opts.now ?? new Date()).toISOString();
  let url: URL;
  try { url = new URL(raw); } catch { return { ...empty(raw, now), retrievalNote: "Not a valid URL." }; }
  if (!/^https?:$/.test(url.protocol)) return { ...empty(raw, now), retrievalNote: "Only http(s) URLs can be submitted." };
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/.test(url.hostname) || !url.hostname.includes(".")) return { ...empty(raw, now), retrievalNote: "Private or local addresses are not fetched." };
  const host = url.hostname.replace(/^www\./, "");
  const d = empty(url.toString(), now);

  const manual = MANUAL_ONLY.find(([re]) => re.test(host));
  if (manual) return { ...d, platform: manual[1], sourceKind: manual[2], retrievalStatus: "manual-required",
    retrievalNote: `${manual[1]} does not permit automated retrieval of its pages by third parties; VELOX does not fetch it. Record the details with the manual research form and keep this URL as the source.` };

  const oe = OEMBED.find(([re]) => re.test(host));
  if (oe) {
    try {
      const r = await http.json<{ title?: string; author_name?: string; thumbnail_url?: string; upload_date?: string }>(oe[2](url.toString()), { robots: false, signal: opts.signal });
      return { ...d, platform: oe[1], sourceKind: "social", structuredData: "oembed", retrievalStatus: "partial", title: r.title ?? null, publisher: r.author_name ?? null,
        publishedAt: r.upload_date ?? null, imageRefs: r.thumbnail_url ? [r.thumbnail_url] : [], categoryHint: r.title ? detectCategory(r.title) : null,
        retrievalNote: `Title and author from ${oe[1]}'s official oEmbed endpoint. A post or video is a mention, not proof of specifications — identify the product from official sources.` };
    } catch (e) { return { ...d, platform: oe[1], sourceKind: "social", retrievalStatus: "failed", retrievalNote: `${oe[1]} oEmbed did not answer (${(e as Error).message}).` }; }
  }

  try {
    const page = await fetchVetted(url.toString(), http, opts.guard ?? (async () => true), opts.signal);
    if (/cf-chl|challenge-platform|captcha/i.test(page.text.slice(0, 5000)) && !findJsonLdProducts(page.text).length) {
      return { ...d, retrievalStatus: "blocked", retrievalNote: "The site answered with a bot challenge. VELOX does not bypass challenges — use the manual research form." };
    }
    return draftFromHtml(page.finalUrl, page.text, now, opts.knownManufacturerHosts);
  } catch (e) {
    if (e instanceof ProviderError && e.kind === "robots") return { ...d, retrievalStatus: "not-permitted", retrievalNote: `${e.message}. VELOX respects it — use the manual research form.` };
    if (e instanceof ProviderError && /private or local address/.test(e.message)) return { ...d, retrievalStatus: "not-permitted", retrievalNote: "The address resolves to a private or local network and is not fetched." };
    if (e instanceof ProviderError && e.kind === "http" && (e.status === 401 || e.status === 403)) return { ...d, retrievalStatus: "blocked", retrievalNote: `The site refused automated access (HTTP ${e.status}). Not circumvented — use the manual research form.` };
    return { ...d, retrievalStatus: "failed", retrievalNote: `Could not retrieve the page: ${(e as Error).message}` };
  }
}
