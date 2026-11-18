/**
 * Self-hosted SearXNG (open-source metasearch). VELOX queries the operator's own instance through
 * its JSON API. Compliance depends on which upstream engines the operator enables: only engines whose
 * terms allow automated queries may be used (see scripts/searxng/settings.yml). Results are web pages —
 * identification is "uncertain" and no price is assumed.
 */
import { toOffer } from "../normalize";
import type { ProviderAdapter } from "../types";

interface SxResult { url: string; title: string; content?: string; engine?: string; engines?: string[]; img_src?: string; thumbnail?: string; publishedDate?: string | null }

export function searxngAdapter(env: Record<string, string | undefined> = process.env): ProviderAdapter {
  const base = env.VELOX_SEARXNG_URL?.replace(/\/$/, "");
  return {
    meta: {
      id: "searxng", name: "SearXNG (self-hosted metasearch)", type: "web-search", accessMethod: "JSON API of the operator's own SearXNG instance",
      permission: "permitted", capabilities: ["search", "research"], categories: [], manufacturers: [], countries: [], dataFormat: "JSON",
      auth: "none (instance URL in VELOX_SEARXNG_URL)", credentialsEnv: ["VELOX_SEARXNG_URL"], cost: "free (self-hosted; needs a long-running server)",
      displayPermission: "Titles, snippets and links of public pages", imagePermission: "None — links only", rateLimit: "set by the instance (VELOX: 1 req/s)",
      updateFrequency: "live, cached 1 h", docsUrl: "https://docs.searxng.org/dev/search_api.html",
      notes: "Enable only upstream engines whose terms permit automated queries. The shipped settings use API-based engines only.", defaultEnabled: true,
    },
    configured: () => (base ? { ok: true } : { ok: false, missing: ["VELOX_SEARXNG_URL"], reason: "No SearXNG instance configured" }),
    async search(query, ctx) {
      const r = await ctx.http.json<{ results: SxResult[] }>(`${base}/search?format=json&safesearch=1&q=${encodeURIComponent(query.q)}`, { signal: ctx.signal, robots: false });
      const checkedAt = ctx.now().toISOString();
      return r.results.filter((x) => /^https?:\/\//.test(x.url)).slice(0, query.limit).map((x) => toOffer({
        providerId: "searxng", key: x.url, url: x.url, title: x.title, sourceKind: "web", seller: new URL(x.url).host.replace(/^www\./, ""),
        text: x.content ?? "", imageUrl: null, identification: "uncertain", checkedAt,
      }));
    },
    async research(q, ctx) {
      const r = await ctx.http.json<{ results: SxResult[] }>(`${base}/search?format=json&safesearch=1&q=${encodeURIComponent(q)}`, { signal: ctx.signal, robots: false });
      const now = ctx.now().toISOString();
      return r.results.slice(0, 20).map((x) => ({ providerId: "searxng", platform: x.engines?.join(", ") ?? x.engine ?? "web", url: x.url, title: x.title, publisher: new URL(x.url).host,
        publishedAt: x.publishedDate ?? null, snippet: x.content ?? null, thumbnailUrl: x.thumbnail ?? x.img_src ?? null, retrievedAt: now }));
    },
    async test(ctx) {
      const r = await ctx.http.json<{ results: SxResult[] }>(`${base}/search?format=json&q=bicycle`, { signal: ctx.signal, robots: false });
      return { ok: true, detail: `Instance answered with ${r.results.length} results` };
    },
  };
}
