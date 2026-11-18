/**
 * Adapters that need credentials. They are complete implementations of the documented APIs but report
 * "not configured" until their keys are set, and have NOT been tested against the live services
 * (no credentials were available when they were written). Keys are server-only environment variables.
 */
import { TtlCache } from "../cache";
import { toOffer } from "../normalize";
import type { ProviderAdapter } from "../types";
import type { Condition } from "@/lib/parts/types";

type Env = Record<string, string | undefined>;
const missing = (env: Env, keys: string[]) => keys.filter((k) => !env[k]);

/* ----------------------------------- eBay ----------------------------------- */
const ebayTokens = new TtlCache<string>(4);
const EBAY_COND: Record<string, Condition> = { NEW: "new", USED: "used", CERTIFIED_REFURBISHED: "refurbished", SELLER_REFURBISHED: "refurbished", NEW_OTHER: "open-box" };

export function ebayAdapter(env: Env = process.env): ProviderAdapter {
  const keys = ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"];
  const marketplace = env.EBAY_MARKETPLACE_ID ?? "EBAY_US";
  return {
    meta: {
      id: "ebay-browse", name: "eBay Browse API", type: "marketplace-api", accessMethod: "OAuth client-credentials application token; Buy → Browse item_summary/search",
      permission: "requires-credentials", capabilities: ["search"], categories: ["all"], manufacturers: [], countries: ["global"], dataFormat: "JSON",
      auth: "application token from EBAY_CLIENT_ID / EBAY_CLIENT_SECRET", credentialsEnv: [...keys, "EBAY_MARKETPLACE_ID"], cost: "free developer programme; production access needs eBay approval",
      displayPermission: "per eBay API licence agreement", imagePermission: "eBay-hosted image URLs per API terms", rateLimit: "per eBay application limits (default 5,000 calls/day)",
      updateFrequency: "live, cached 15 min", docsUrl: "https://developer.ebay.com/api-docs/buy/browse/overview.html", termsUrl: "https://developer.ebay.com/join/api-license-agreement",
      notes: "Built to the documented API; NOT functional or tested until production keys are approved. Includes used listings only when the user asks.", defaultEnabled: false,
    },
    configured: () => (missing(env, keys).length ? { ok: false, missing: missing(env, keys), reason: "eBay application keys not configured" } : { ok: true }),
    async search(query, ctx) {
      let token = ebayTokens.get(marketplace, 100 * 60 * 1000)?.value;
      if (!token) {
        const basic = Buffer.from(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`).toString("base64");
        const res = await ctx.http.request("https://api.ebay.com/identity/v1/oauth2/token", { method: "POST", robots: false, signal: ctx.signal,
          headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope" });
        token = ((await res.json()) as { access_token: string }).access_token;
        ebayTokens.set(marketplace, token);
      }
      const filter = query.includeUsed ? "" : "&filter=conditions:%7BNEW%7D";
      const r = await ctx.http.json<{ itemSummaries?: Array<{ itemId: string; title: string; itemWebUrl: string; price?: { value: string; currency: string }; condition?: string; conditionId?: string; image?: { imageUrl: string }; seller?: { username: string }; itemLocation?: { country?: string } }> }>(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query.q)}&limit=${Math.min(query.limit, 50)}${filter}`,
        { robots: false, signal: ctx.signal, headers: { authorization: `Bearer ${token}`, "x-ebay-c-marketplace-id": marketplace } });
      const checkedAt = ctx.now().toISOString();
      return (r.itemSummaries ?? []).map((i) => toOffer({ providerId: "ebay-browse", key: i.itemId, url: i.itemWebUrl, title: i.title, sourceKind: "marketplace",
        seller: i.seller?.username ? `${i.seller.username} (eBay)` : "eBay seller", sellerCountry: i.itemLocation?.country ?? null, price: i.price ? Number(i.price.value) : null,
        currency: i.price?.currency ?? null, condition: EBAY_COND[(i.condition ?? "").toUpperCase().replace(/\s+/g, "_")] ?? "unknown", imageUrl: i.image?.imageUrl ?? null,
        identification: "uncertain", checkedAt }));
    },
  };
}

/* ----------------------------------- Brave ---------------------------------- */
export function braveAdapter(env: Env = process.env): ProviderAdapter {
  return {
    meta: {
      id: "brave-search", name: "Brave Search API", type: "web-search", accessMethod: "REST web search API (X-Subscription-Token)", permission: "requires-credentials",
      capabilities: ["search", "research"], categories: [], manufacturers: [], countries: ["global"], dataFormat: "JSON", auth: "API key in BRAVE_SEARCH_API_KEY",
      credentialsEnv: ["BRAVE_SEARCH_API_KEY"], cost: "paid per request with a monthly credit (2026); needs a payment method — not enabled (zero budget)",
      displayPermission: "per Brave Search API terms", imagePermission: "none", rateLimit: "per plan", updateFrequency: "live, cached 1 h",
      docsUrl: "https://api-dashboard.search.brave.com/app/documentation", notes: "Optional; activate only if a budget is approved.", defaultEnabled: false,
    },
    configured: () => (env.BRAVE_SEARCH_API_KEY ? { ok: true } : { ok: false, missing: ["BRAVE_SEARCH_API_KEY"], reason: "No Brave Search API key" }),
    async search(query, ctx) {
      const r = await ctx.http.json<{ web?: { results: Array<{ url: string; title: string; description?: string }> } }>(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query.q)}&count=${Math.min(query.limit, 20)}`,
        { robots: false, signal: ctx.signal, headers: { "x-subscription-token": env.BRAVE_SEARCH_API_KEY! } });
      const checkedAt = ctx.now().toISOString();
      return (r.web?.results ?? []).map((x) => toOffer({ providerId: "brave-search", key: x.url, url: x.url, title: x.title, sourceKind: "web", seller: new URL(x.url).host.replace(/^www\./, ""), text: x.description ?? "", identification: "uncertain", checkedAt }));
    },
  };
}

/* ---------------------------------- YouTube --------------------------------- */
export function youtubeAdapter(env: Env = process.env): ProviderAdapter {
  return {
    meta: {
      id: "youtube-data", name: "YouTube Data API v3", type: "social-api", accessMethod: "search.list (videos) with an API key", permission: "requires-credentials",
      capabilities: ["research"], categories: [], manufacturers: [], countries: ["global"], dataFormat: "JSON", auth: "API key in YOUTUBE_API_KEY", credentialsEnv: ["YOUTUBE_API_KEY"],
      cost: "free quota (10,000 units/day; one search = 100 units) — a Google Cloud project and key are needed, no payment",
      displayPermission: "titles, channel names, links and thumbnails per YouTube API Services terms", imagePermission: "thumbnail URLs only, not copied",
      rateLimit: "quota-based", updateFrequency: "on demand (admin research)", docsUrl: "https://developers.google.com/youtube/v3/docs/search/list",
      termsUrl: "https://developers.google.com/youtube/terms/api-services-terms-of-service", notes: "Research mentions only — a video is never treated as proof of a specification.", defaultEnabled: false,
    },
    configured: () => (env.YOUTUBE_API_KEY ? { ok: true } : { ok: false, missing: ["YOUTUBE_API_KEY"], reason: "No YouTube API key" }),
    async research(q, ctx) {
      const r = await ctx.http.json<{ items: Array<{ id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string; description: string; thumbnails?: { medium?: { url: string } } } }> }>(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(q)}&key=${env.YOUTUBE_API_KEY}`, { robots: false, signal: ctx.signal });
      const now = ctx.now().toISOString();
      return r.items.map((i) => ({ providerId: "youtube-data", platform: "YouTube", url: `https://www.youtube.com/watch?v=${i.id.videoId}`, title: i.snippet.title, publisher: i.snippet.channelTitle,
        publishedAt: i.snippet.publishedAt, snippet: i.snippet.description, thumbnailUrl: i.snippet.thumbnails?.medium?.url ?? null, retrievedAt: now }));
    },
  };
}
