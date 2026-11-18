# Phase 3 — external data provider architecture (18 Nov 2026)

Zero-cost baseline: nothing paid was activated; every credential-gated source reports "not configured" instead of pretending to work.

## Architecture

```
src/lib/providers/
  types.ts        adapter contract: search · sync · research · test · configured()
  http.ts         the only network path: honest user agent, robots.txt per path, ≤1 req/s per host,
                  timeouts, retries (429/5xx, Retry-After), never retries 401/403, manual redirects for vetting
  robots.ts       RFC 9309 matching (identical to scripts/lib/robots.mjs — enforced by a test)
  cache.ts        TTL + LRU (per server instance)
  aggregator.ts   parallel queries, per-provider timeout, partial results, exact-duplicate removal, health
  normalize.ts    listing facts → Offer (specs extracted; descriptions not stored; images referenced, not copied)
  url-extract.ts  manual URL submission (oEmbed / schema.org JSON-LD / Open Graph; marketplaces & social: manual form)
  registry.ts     every known source: adapters + registry-only entries with the reason
  runtime.ts      shared runtime for API routes; admin enable/disable read from the providers table
  adapters/       shopify (manufacturer stores) · feed (CSV/JSON/XML) · searxng · catalog · gated (eBay, Brave, YouTube)
scripts/providers/sync.mjs   scheduled job: register providers, sync stores/feeds → sellers/offers/price history/run log
src/app/api/providers                  public transparency list (no secrets)
src/app/api/admin/providers            admin: test connectivity, enable/disable
src/app/api/admin/discovery            admin: submit URL, manual research form, notes, review state, queue
src/app/api/admin/research             admin: public mentions from research sources
Admin → Data sources                   UI for all of the above
```

Adding a source = one registry entry (and an adapter if a permitted automated method exists). Nothing else changes.

Database (migrations `000600`, `000700`): provider permissions/schedule/credential env names, `provider_runs` (health and error log),
`discovery_records` (research queue with separate identity/specs/price/availability/image/manufacturer confidences and the
verification ladder officially-verified → … → suspected-misrepresentation), `discovery_notes`. All admin-only via RLS.

## Sources and status

| Source | Method | Status here |
| --- | --- | --- |
| ICAN, Winspace (+ Lún), Hunt US, Yoeleo official stores | public Shopify storefront JSON, robots.txt checked per path (Yoeleo disallows `/search` → catalogue only) | **Working.** Synced 3,478 offers (Hunt 3,107 incl. spokes, freehubs, bearings and resold Shimano/Schwalbe/Maxxis parts labelled as retailer listings), 225 linked to catalogue products on hard evidence |
| Elitewheels, Farsports, Superteam, Light Bicycle, Novatec, Bitex, Powerway, LTWOO, Sensah, MicroSHIFT, Wheeltop, Lún site | candidate stores | Disabled: unreachable from this network, so platform, currency and robots.txt are unverified |
| Authorised feeds (distributors, retailers, affiliate programmes) | CSV / JSON / XML, Google Merchant field names | Adapter ready and unit-tested; needs a partner feed (`VELOX_FEEDS`) |
| SearXNG (self-hosted) | instance JSON API | **Working locally** (Docker). Shipped config enables only API-based engines (Wikipedia, Wikidata). Those hosts are blocked in this sandbox, so the local test adds ICAN's permitted storefront search as an upstream |
| Manual URL submission | oEmbed (YouTube, TikTok, Vimeo), schema.org Product / Open Graph for other pages | **Working.** Marketplaces and social networks that forbid automated access are not fetched (manual form); private addresses refused at every redirect hop; blocked sites reported |
| eBay Browse API | OAuth client credentials | Built to the documented API; **not functional / not tested** (no keys) |
| Brave Search API | API key | Built; **not enabled** (paid with monthly credit; zero budget) |
| YouTube Data API | API key (free quota) | Built for admin research; needs a free key |
| Shopee, AliExpress, Lazada, Blibli, Tokopedia/TikTok Shop, Platform DST, BIDEX, Bike Matrix, Instagram, Facebook, Rodalink, Pacific Bike | — | Registry-only with the reason (agreement / manual research / access refused). Google Custom Search: closed to new customers |

## Running it

```bash
scripts/local-supabase/start.sh
set -a; . scripts/local-supabase/.env.jobs-local; set +a           # job-only privileged key (local)
node scripts/providers/sync.mjs                                     # register + sync (daily in production: cron / CI)
# SearXNG (self-hosted, free): docker run … -v scripts/searxng/settings.yml:/etc/searxng/settings.yml searxng/searxng
VELOX_SEARXNG_URL=http://127.0.0.1:8888 npm start
BASE_URL=http://localhost:3100 node scripts/providers-e2e.mjs       # 13 API-level checks
```

Production: the sync job runs where its secret (`VELOX_JOB_DB_KEY`) lives — a scheduler/CI secret, never the web app.
SearXNG and the sync job need a long-running host or scheduler; a serverless-only deployment cannot host SearXNG.

## Found and fixed
- **`is_admin()` recursion (baseline schema bug):** the function read `profiles` with the caller's rights while the
  `profiles` policy calls `is_admin()` → "stack depth limit exceeded" on every RLS-protected admin write. Now
  `SECURITY DEFINER` with a fixed `search_path` (baseline + migration `000700`).
- Shopify pages can hold fewer than 250 products; only an empty page ends a catalogue (Hunt: 244 → 3,107 products).
- Gift cards / fees are not products; listings that disappear are marked inactive, never deleted.

## Tests
- Unit: 109/109 (21 new provider tests: robots parity, rate limiting, retry/403 policy, honest UA, normalisation and resale labelling,
  feeds CSV/XML, JSON-LD/OG extraction, manual-only platforms, SSRF incl. redirects, private-address detection,
  aggregator partial failure/timeout/not-configured/cache, registry honesty).
- Providers API e2e 13/13 · accounts e2e 20/20 · browser e2e 56/56 static and 56/56 database mode (fresh servers).

## Not done (later phases)
Parts Finder UI and public external search API (Phase 4) · compatibility statuses for external offers (Phase 5) ·
promotion of approved discovery records into the master catalogue (Phase 8) · AI-assisted extraction (Phase 9).
