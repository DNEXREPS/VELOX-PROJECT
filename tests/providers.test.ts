import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));
const { parseRobots, robotsAllows } = await import("@/lib/providers/robots");
// @ts-expect-error plain ESM helper without types
const legacy = await import("../scripts/lib/robots.mjs");
const { PoliteHttp } = await import("@/lib/providers/http");
const { Aggregator } = await import("@/lib/providers/aggregator");
const { toOffer, cleanUrl, brandFromTitle } = await import("@/lib/providers/normalize");
const { feedRowsToOffers, parseFeed, parseXmlItems } = await import("@/lib/providers/adapters/feed");
const { draftFromHtml, extractFromUrl, findJsonLdProducts } = await import("@/lib/providers/url-extract");
const { NOT_A_PRODUCT, shopifyStore } = await import("@/lib/providers/adapters/shopify");
const { buildAdapters, REGISTRY_ONLY, VERIFIED_STORES } = await import("@/lib/providers/registry");
const { ebayAdapter, youtubeAdapter, braveAdapter } = await import("@/lib/providers/adapters/gated");
const { isPrivateAddress } = await import("@/lib/net/public-host");
const { ProviderError } = await import("@/lib/providers/types");

const noSleep = async () => {};
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

describe("robots.txt", () => {
  it("the app and the scripts apply identical rules", () => {
    const txt = "User-agent: *\nDisallow: /search\nDisallow: /*?sort=\nAllow: /search/ok$\n\nUser-agent: velox-catalog-bot\nDisallow: /private\n";
    for (const ua of ["VELOX-catalog-bot/1.0", "other/1"]) for (const p of ["/search", "/search/ok", "/x?sort=1", "/private/a", "/products.json"])
      expect(robotsAllows(parseRobots(txt, ua), p), `${ua} ${p}`).toBe(legacy.robotsAllows(legacy.parseRobots(txt, ua), p));
  });
});

describe("polite HTTP client", () => {
  it("refuses paths disallowed by robots.txt without requesting them", async () => {
    const calls: string[] = [];
    const http = new PoliteHttp({ minIntervalMs: 0, sleep: noSleep, fetchImpl: (async (u: string) => { calls.push(u); return u.endsWith("/robots.txt") ? new Response("User-agent: *\nDisallow: /search") : json({}); }) as unknown as typeof fetch });
    await expect(http.json("https://shop.example/search/suggest.json?q=x")).rejects.toMatchObject({ kind: "robots" });
    expect(calls).toEqual(["https://shop.example/robots.txt"]);
  });
  it("retries 429 / 5xx with Retry-After, but never retries 403", async () => {
    let n = 0; const waits: number[] = [];
    const http = new PoliteHttp({ minIntervalMs: 0, sleep: async (ms) => { waits.push(ms); }, fetchImpl: (async () => (++n < 3 ? json({}, 429, { "retry-after": "2" }) : json({ ok: true }))) as unknown as typeof fetch });
    expect(await http.json("https://api.example/x", { robots: false })).toEqual({ ok: true });
    expect(waits).toEqual([2000, 2000]);
    let m = 0;
    const h2 = new PoliteHttp({ minIntervalMs: 0, sleep: noSleep, fetchImpl: (async () => { m++; return json({}, 403); }) as unknown as typeof fetch });
    await expect(h2.json("https://api.example/x", { robots: false })).rejects.toMatchObject({ kind: "http", status: 403 });
    expect(m).toBe(1);
  });
  it("spaces requests to the same host", async () => {
    const at: number[] = [];
    const http = new PoliteHttp({ minIntervalMs: 120, fetchImpl: (async () => { at.push(Date.now()); return json({}); }) as unknown as typeof fetch });
    await Promise.all([1, 2, 3].map(() => http.json("https://a.example/x", { robots: false })));
    expect(at[1] - at[0]).toBeGreaterThanOrEqual(100);
    expect(at[2] - at[1]).toBeGreaterThanOrEqual(100);
  });
  it("identifies itself honestly (no browser impersonation)", () => {
    expect(new PoliteHttp().userAgent).toMatch(/^VELOX-catalog-bot\//);
  });
});

describe("listing normalisation", () => {
  const base = { providerId: "p", key: "k", sourceKind: "official-manufacturer" as const, seller: "S", checkedAt: "2026-11-18T00:00:00Z" };
  it("labels another brand resold by a manufacturer store as a retailer listing", () => {
    const own = toOffer({ ...base, url: "https://hunt.example/products/a", title: "Hunt 50 Carbon Wheelset", storeBrand: "Hunt" });
    const resold = toOffer({ ...base, url: "https://hunt.example/products/b", title: "Shimano RT-MT900 Center Lock rotors", storeBrand: "Hunt" });
    const sub = toOffer({ ...base, url: "https://winspace.example/products/c", title: "Lún HYPER D45 Disc Wheelset", storeBrand: "Winspace", ownBrands: ["Lún"] });
    expect([own.sourceKind, own.brand]).toEqual(["official-manufacturer", "Hunt"]);
    expect([resold.sourceKind, resold.brand, resold.identification]).toEqual(["retailer", "Shimano", "probable"]);
    expect([sub.sourceKind, sub.brand]).toEqual(["official-manufacturer", "Lún"]);
  });
  it("keeps facts, not descriptions; price is an advertised price with a timestamp", () => {
    const o = toOffer({ ...base, url: "https://s.example/p?utm_source=x&_pos=2&variant=7", title: "Gravel wheelset 700c", price: 599, currency: "usd", text: "<p>Long marketing copy. 12x142 thru axle, XDR and HG freehub, 25mm internal width</p>" });
    expect(o.description).toBeNull();
    expect(o.price).toEqual({ amount: 599, currency: "USD", kind: "advertised", checkedAt: "2026-11-18T00:00:00Z" });
    expect(o.url).toBe("https://s.example/p?variant=7");
    expect(o.specs).toMatchObject({ rearAxle: "12x142", internalRimMm: 25 });
    expect(o.specs.freehubs).toEqual(expect.arrayContaining(["XDR", "HG"]));
  });
  it("never invents a price without a currency", () => {
    expect(toOffer({ ...base, url: "https://s.example/p", title: "Hub", price: 10, currency: null }).price).toBeNull();
  });
  it("cleans tracking parameters and recognises brands", () => {
    expect(cleanUrl("https://x.example/a?_psq=aero&_psid=1&gclid=2#top")).toBe("https://x.example/a");
    expect(brandFromTitle("DT Swiss 350 hub")).toBe("DT Swiss");
    expect(NOT_A_PRODUCT.test("Hunt E-Gift Card")).toBe(true);
    expect(NOT_A_PRODUCT.test("Extra Fee")).toBe(true);
    expect(NOT_A_PRODUCT.test("Gift box bottle cage")).toBe(false);
  });
});

describe("product feeds", () => {
  const cfg = { id: "test", name: "Test distributor", format: "csv" as const, urlEnv: "X", seller: "Distributor", sellerKind: "authorized-distributor" as const, currency: "IDR", affiliate: true };
  it("maps Google Merchant-style CSV rows, skipping rows without a title or link", () => {
    const rows = parseFeed("id,title,link,price,brand,gtin,availability,condition\n1,ICAN AERO 40 Disc wheelset,https://d.example/1,9500000 IDR,ICAN,1234567890123,in stock,new\n2,,https://d.example/2,1 IDR,X,,in stock,new\n3,No link,,1 IDR,X,,in stock,new\n", "csv");
    const { offers, skipped } = feedRowsToOffers(rows, cfg, "2026-11-18T00:00:00Z");
    expect(skipped).toBe(2);
    expect(offers[0]).toMatchObject({ title: "ICAN AERO 40 Disc wheelset", brand: "ICAN", sourceKind: "authorized-distributor", affiliate: true, availability: "in-stock", condition: "new", identification: "exact" });
    expect(offers[0].price).toMatchObject({ amount: 9500000, currency: "IDR" });
    expect(offers[0].specs.gtin).toBe("1234567890123");
  });
  it("parses RSS / Google Merchant XML items with g: prefixes and CDATA", () => {
    const xml = `<rss><channel><item><g:id>A1</g:id><title><![CDATA[Novatec D411SB rear hub 12x142]]></title><link>https://d.example/a1</link><g:price>45.00 USD</g:price><g:brand>Novatec</g:brand><g:mpn>D411SB</g:mpn></item></channel></rss>`;
    const items = parseXmlItems(xml);
    expect(items[0]).toMatchObject({ id: "A1", title: "Novatec D411SB rear hub 12x142", price: "45.00 USD", brand: "Novatec", mpn: "D411SB" });
    const { offers } = feedRowsToOffers(items, { ...cfg, format: "xml" }, "2026-11-18T00:00:00Z");
    expect(offers[0]).toMatchObject({ brand: "Novatec", category: "hub" });
    expect(offers[0].specs).toMatchObject({ rearAxle: "12x142", partNumber: "D411SB" });
  });
});

describe("manual URL submission", () => {
  it("reads schema.org Product JSON-LD (including @graph and AggregateOffer)", () => {
    const html = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"Product","name":"SYTE Chronos Hub Rear 142x12","brand":{"@type":"Brand","name":"SYTE"},"sku":"CH-R142","gtin13":"8991234567890","image":["https://s.example/1.jpg"],"description":"Rear hub, 12x142 thru axle, HG freehub, 6-bolt","offers":{"@type":"AggregateOffer","lowPrice":"1250000","priceCurrency":"IDR","offers":[{"@type":"Offer","price":"1250000","priceCurrency":"IDR","availability":"https://schema.org/InStock","itemCondition":"https://schema.org/NewCondition"}]}}]}</script></head></html>`;
    expect(findJsonLdProducts(html)).toHaveLength(1);
    const d = draftFromHtml("https://syte.example/p", html, "2026-11-18T00:00:00Z");
    expect(d).toMatchObject({ retrievalStatus: "extracted", structuredData: "json-ld", title: "SYTE Chronos Hub Rear 142x12", brandText: "SYTE", mpn: "CH-R142", gtin: "8991234567890", price: 1250000, currency: "IDR", availability: "in-stock", condition: "new", categoryHint: "hub" });
    expect(d.specs).toMatchObject({ rearAxle: "12x142", rotorMount: "6-bolt" });
    expect(d.imageRefs).toEqual(["https://s.example/1.jpg"]); // a reference, not a copy
  });
  it("falls back to Open Graph and marks it partial without a brand or price", () => {
    const d = draftFromHtml("https://blog.example/post", `<meta property="og:title" content="My budget gravel build">`, "2026-11-18T00:00:00Z");
    expect(d).toMatchObject({ structuredData: "open-graph", retrievalStatus: "partial", price: null });
  });
  it("does not fetch marketplaces / social networks, and refuses local addresses", async () => {
    const fetchImpl = vi.fn();
    const http = new PoliteHttp({ fetchImpl: fetchImpl as unknown as typeof fetch, sleep: noSleep });
    for (const u of ["https://shopee.co.id/x", "https://www.tokopedia.com/a/b", "https://www.facebook.com/groups/1", "https://www.instagram.com/p/1"])
      expect((await extractFromUrl(u, http)).retrievalStatus).toBe("manual-required");
    for (const u of ["http://localhost:3000/", "http://127.0.0.1/", "http://10.1.2.3/", "file:///etc/passwd"])
      expect((await extractFromUrl(u, http)).title).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("vets every redirect hop (SSRF) and reports blocked sites instead of retrying", async () => {
    const http = new PoliteHttp({ minIntervalMs: 0, sleep: noSleep, fetchImpl: (async (u: string) => u.endsWith("robots.txt") ? new Response("") : new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } })) as unknown as typeof fetch });
    const guard = async (u: URL) => !isPrivateAddress(u.hostname);
    const d = await extractFromUrl("https://public.example/x", http, { guard });
    expect(d.retrievalStatus).toBe("not-permitted");
    const blocked = new PoliteHttp({ minIntervalMs: 0, sleep: noSleep, fetchImpl: (async (u: string) => u.endsWith("robots.txt") ? new Response("") : new Response("cf", { status: 403 })) as unknown as typeof fetch });
    expect((await extractFromUrl("https://pacific.example/product", blocked)).retrievalStatus).toBe("blocked");
  });
  it("recognises private and local addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "104.18.2.3", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe("aggregator", () => {
  const meta = (id: string, extra = {}) => ({ id, name: id, type: "web-search" as const, accessMethod: "", permission: "permitted" as const, capabilities: ["search" as const], categories: [], manufacturers: [], countries: [], dataFormat: "", auth: "", credentialsEnv: [], cost: "", displayPermission: "", imagePermission: "", rateLimit: "", updateFrequency: "", defaultEnabled: true, ...extra });
  const offer = (pid: string, url: string) => toOffer({ providerId: pid, key: url, url, title: "Carbon wheelset", sourceKind: "web", seller: "s", checkedAt: new Date().toISOString() });
  it("returns partial results when one provider fails, times out or lacks credentials — and invents nothing", async () => {
    let calls = 0;
    const agg = new Aggregator([
      { meta: meta("good"), configured: () => ({ ok: true }), search: async () => { calls++; return [offer("good", "https://a.example/1"), offer("good", "https://a.example/1")]; } },
      { meta: meta("broken"), configured: () => ({ ok: true }), search: async () => { throw new ProviderError("x answered HTTP 500", "http", 500); } },
      { meta: meta("slow"), configured: () => ({ ok: true }), search: () => new Promise(() => {}) },
      { meta: meta("keyless"), configured: () => ({ ok: false, missing: ["KEY"], reason: "no key" }), search: async () => [offer("keyless", "https://b.example")] },
      { meta: meta("off", { defaultEnabled: false }), configured: () => ({ ok: true }), search: async () => [offer("off", "https://c.example")] },
    ], new PoliteHttp(), { timeoutMs: 50 });
    const r = await agg.search({ q: "carbon", limit: 5 });
    expect(r.offers.map((o) => o.providerId)).toEqual(["good"]); // exact duplicate removed, nothing from failed sources
    const by = Object.fromEntries(r.sources.map((s) => [s.providerId, s.status]));
    expect(by).toEqual({ good: "ok", broken: "error", slow: "timeout", keyless: "not-configured", off: "skipped" });
    expect(agg.health.get("broken")?.lastError).toMatch(/HTTP 500/);
    const again = await agg.search({ q: "carbon", limit: 5 });
    expect(calls).toBe(1); // cached
    expect(again.sources.find((s) => s.providerId === "good")).toMatchObject({ cached: true });
  });
});

describe("registry", () => {
  it("credential-gated adapters report not-configured instead of pretending to work", () => {
    for (const a of [ebayAdapter({}), braveAdapter({}), youtubeAdapter({})]) {
      const c = a.configured();
      expect(c.ok, a.meta.id).toBe(false);
      expect(a.meta.defaultEnabled, a.meta.id).toBe(false);
    }
    expect(ebayAdapter({ EBAY_CLIENT_ID: "x", EBAY_CLIENT_SECRET: "y" }).configured().ok).toBe(true);
  });
  it("only verified stores are enabled; candidates carry no guessed currency", () => {
    const stores = buildAdapters({}).filter((a) => a.meta.type === "manufacturer-store");
    const enabled = stores.filter((a) => a.meta.defaultEnabled).map((a) => a.meta.id);
    expect(enabled.sort()).toEqual(VERIFIED_STORES.map((s) => `shopify:${s.host}`).sort());
    expect(shopifyStore({ host: "c.example", brand: "C", seller: "C", currency: "", verified: null }).configured().ok).toBe(false);
  });
  it("lists the investigated sources that need agreements or manual research, with ids unique", () => {
    const ids = [...buildAdapters({}).map((a) => a.meta.id), ...REGISTRY_ONLY.map((m) => m.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["shopee-affiliate", "aliexpress-affiliate", "tokopedia", "platform-dst", "bidex", "bike-matrix", "google-cse", "facebook", "instagram", "pacific-bike"]) expect(ids, id).toContain(id);
    expect(REGISTRY_ONLY.every((m) => m.capabilities.length === 0 || m.permission === "public-endpoint")).toBe(true);
  });
  it("provider metadata and adapters never embed credential values", () => {
    const src = ["src/lib/providers/registry.ts", "src/lib/providers/adapters/gated.ts", "src/lib/providers/adapters/searxng.ts"].map((f) => fs.readFileSync(path.join(process.cwd(), f), "utf8")).join("\n");
    expect(src).not.toMatch(/(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i);
  });
});
