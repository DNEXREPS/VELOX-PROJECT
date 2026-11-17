# VELOX Global Cycling Ecosystem — Phase 1 audit & implementation plan

Status: **proposal, awaiting approval** (17 Nov 2026). Nothing in Phases 2–10 has been built yet.

## 1. Audit — what exists today

| Area | Current state | Consequence for the new goals |
| --- | --- | --- |
| Stack | Next.js 16 App Router, React 19, TS strict, Tailwind 4; Supabase Auth (`@supabase/ssr`) | Keep. |
| **Catalogue storage** | TypeScript files in `src/data/` (706 bikes, 627 components, 201 brands, 716 image records ≈ 4.3 MB) compiled **into the browser bundle** (largest JS chunk 2.2 MB). 24 files import the full catalogue. | Cannot reach 50k–100k products. The catalogue must move to Postgres with server-side search and paginated APIs. **This is the single most important change.** |
| Database | `supabase/schema.sql` defines 21 tables (brands, bike_models, components, wheelset_specs, bearings, compatibility_rules, prices, media_assets, product_images, data_sources, ingest_staging, submissions, profiles, user_collections…). Only **profiles** and **user_collections** are used at runtime. | Catalogue tables exist but are unused and lack offers/variants/providers/audit tables. Extend, don't duplicate. |
| Admin writes | `catalogWrite` saves edits to a **browser localStorage overlay**. The “admin” role in demo mode is a UI switch. | Admin changes are not shared or durable. Needs server-side writes with RLS and role checks. |
| Roles | `user_role` enum: `user`, `admin`. `is_admin()` used in RLS. Users cannot change their own role (tested). | Extend to super_admin, catalog_admin, image_admin, source_admin, reviewer. |
| Images | Self-hosted under `public/media/products` (42 MB, checksummed, health checker, admin Images tab with review). 529/706 bikes have a verified photo. | Good foundation; files are in git and changes need a deploy. Admin uploads need object storage. |
| Ingestion | `src/lib/ingest.ts`: CSV/JSON adapters → normalise → duplicate detection → staging queue (client-side). | Reuse the adapter/staging design server-side. |
| Compatibility | `src/lib/compat.ts`: per-slot rules with 4 states (compatible / potential / incompatible / insufficient), BB/spindle matrix, axle, freehub, brakes, wheel size, clearance. Used by Build a Bike and Upgrade Advisor. | Keep as the single engine; add category rules for external listings and map states to the requested labels. |
| Search | Client-side fuzzy search over the bundled catalogue (`src/lib/search.ts`, `finder.ts`). | Replace with Postgres full-text + trigram search behind an API. |
| User data | Garage, builds, favourites, compare, plans, history: localStorage + sync to `user_collections` (owner-only RLS). | Keep; extend payloads to reference products/offers by id. |
| Parts Discovery groundwork | `src/lib/parts/{types,categories,extract,money}.ts` (uncommitted until this commit, not yet wired): offer/product types, EN/ID category vocabulary, spec extraction from listing text, cited-rate currency + price tiers. | Folded into Phases 2–4. |

Pacific Bike: the official site (`pacific-bike.com`) answers automated requests with a Cloudflare 403. 56 Pacific/Exotic/SYTE models already exist from search-indexed official pages (unverified, no photos). The block will not be circumvented; options are an official export from Pacific, admin-entered data from the URLs listed in the brief, or manual research forms.

## 2. Data sources — investigated status

Legend: **Ready** = adapter can be built and tested here · **Credentials** = adapter can be built, cannot be tested until keys are provided · **Agreement** = needs a commercial/partner agreement first · **Manual** = no permitted automated method; admin workflow only.

| Source | Type | Access | Cost / terms (to confirm with provider) | Status |
| --- | --- | --- | --- | --- |
| VELOX catalogue | internal | Postgres | — | Ready |
| Manufacturer Shopify storefronts (ICAN, Winspace, Hunt US, Yoeleo verified reachable; Elitewheels, Farsports, Superteam, Light Bicycle, Novatec, Bitex, Powerway, LTWOO, Sensah, MicroSHIFT, Wheeltop blocked by **this** sandbox’s network, not by the sites) | official store | public storefront JSON (`/products.json`, `/search/suggest.json`); robots.txt checked per store (Yoeleo disallows `/search` → catalogue endpoint only) | robots.txt ≠ reuse licence: store **links + facts + prices with attribution**; do not rehost descriptions/images without permission; admin approves each store | Ready (per-store approval) |
| Brave Search API | web search | API key | ~$5 / 1,000 requests with a monthly credit (changed 2026) | Credentials |
| Google Custom Search JSON API | web search | key + engine id | **Closed to new customers; ends 1 Jan 2027.** Successor (Vertex AI / Agent Search) searches only your own sites | Do not build (existing-customer adapter only if you already have access) |
| Google Merchant API | own product data | — | Manages a merchant’s own products; **not** a public shopping search | Not applicable |
| eBay Browse API | marketplace | OAuth client credentials | Free developer programme; production keys need approval | Credentials — built but marked non-functional until keys are tested |
| AliExpress Affiliate API | marketplace | app key + secret, signed requests | affiliate approval | Agreement |
| Shopee Affiliate Open API (ID) | marketplace | app id + secret after affiliate approval | approval | Agreement — not functional until approved |
| Tokopedia / TikTok Shop | marketplace | Partner Center; seller-scoped APIs | no public product search | Manual |
| Lazada, Blibli | marketplace | affiliate/seller programmes | to confirm | Agreement / Manual |
| Bike24, Bike-Discount, bike-components, Jenson USA, Competitive Cyclist | retailer | affiliate product feeds (CSV/XML) via networks such as AWIN / AvantLink — **to confirm per retailer** | affiliate approval; disclosure required | Agreement → generic feed adapter |
| Platform DST (Stichting DST) | industry data | DST API (JSON 3.0) | stated free for **retailers**; VELOX is not a retailer — eligibility to confirm | Agreement |
| BIDEX (HARTJE et al.) | industry data standard | XML 1.7 via APIs | partnership; now extending to parts with Bike Matrix | Agreement |
| Masterlinq | retailer tool (Shopify/Lightspeed) | connects brand/distributor feeds | for retailers’ own stores; not a public data source | Not applicable |
| Bike Matrix | compatibility API | licence, staging → production key | paid, usage-tiered (Shopify app from ~$129/mo); licence requires their indicators + “Powered by Bike Matrix” | Agreement — optional provider behind VELOX’s own engine |
| YouTube Data API v3 | social | API key | free quota (search costs 100 units of 10,000/day) | Credentials |
| Instagram Graph API | social | business account; hashtag search limited | Meta app review | Agreement |
| Facebook Groups / Marketplace | social | Groups API deprecated; no Marketplace API | — | Manual (URL submission) |
| TikTok (Research API) / Pinterest / Reddit | social | academic-only / own content / paid commercial | — | Manual |
| Admin & user-submitted URLs | any | fetch only where robots + terms permit, else manual form | — | Ready |

## 3. Target architecture

```
           ┌──────────── Next.js (UI) ────────────┐
           │ pages fetch paginated APIs only;      │
           │ no catalogue in the browser bundle    │
           └───────────────┬──────────────────────┘
                           │ /api/catalog/*  /api/parts/search  /api/admin/*
           ┌───────────────▼──────────────────────┐
           │ Server layer (route handlers)         │
           │  • role check (JWT → profiles.role)   │
           │  • provider registry + adapters       │
           │  • aggregator: parallel, timeout,     │
           │    retry, cache, partial results      │
           │  • compatibility engine (shared)      │
           └──────┬──────────────┬────────────────┘
                  │              │
     Postgres (Supabase)    Supabase Storage (images)
     catalogue · offers ·   originals + generated sizes
     providers · queue ·    (Next image optimizer / CDN)
     audit log · search idx
                  ▲
     background jobs (scheduled route / Supabase cron):
     feed sync, price refresh, image validation
```

### New / changed tables (Phase 2)
- `manufacturers` (rename/extend `brands`: country, kinds, official_url, aliases)
- `products` (identity: manufacturer, name, model, model_year, category, subcategory, description, official_url, verification, last_verified) — bikes and components in one table with typed `specs jsonb` + generated columns for compat attributes; existing `bike_models`/`components` migrated into it
- `product_variants` (size, colour, mpn, gtin, weight, variant specs)
- `offers` (product/variant id nullable for unmatched discovery records, provider, seller, url, price, currency, condition, availability, shipping, observed_at, affiliate, sponsored)
- `discovery_records` (raw external/social finds: source url, publisher, published_at, extracted fields, language) + `evidence` (claim → source url, kind, retrieved_at)
- Separate confidence columns: identity, specs, price, availability, image, manufacturer (no combined score)
- `providers`, `provider_runs` (health, last success/error, counts), `provider_secrets` stays in server env / Supabase Vault — never in a table readable by clients
- `images` (library) + `product_images` (assignment, role primary/secondary/gallery, position, status VERIFIED/UNVERIFIED/REJECTED/BROKEN/NEEDS_REVIEW, notes, licence ref, uploaded_by, size, dimensions, sha256, perceptual hash)
- `review_queue` (entity, proposed change, state approve/reject/needs-correction, reviewer)
- `audit_log` (actor, action, entity, before, after, at) — written by triggers so it cannot be skipped
- `community_reports` (labelled, never merged into specs)
- `fx_rates` (currency, rate, source, date) — conversions only with a cited row
- Indexes: `pg_trgm` + `tsvector` on name/manufacturer/model/mpn; btree on category, price, manufacturer; GIN on specs

### Roles (RLS + server checks)
`super_admin`, `catalog_admin`, `image_admin`, `source_admin`, `reviewer`, `user`. A `has_role(text)` SQL function used in every policy; API routes verify the Supabase JWT server-side before admin actions. Uploads validated server-side (type by magic bytes, size limit, dimensions).

## 4. Phases (each ends with tests + a report)

| # | Phase | Main deliverables | Needs from you |
| --- | --- | --- | --- |
| 2 | Master catalogue infrastructure | Migrations for the tables above; migration script from `src/data/*` into Postgres (no data loss; ids preserved); `/api/catalog` search + pagination; switch Bike Finder / Components / Brands / product pages to the API (UI unchanged); keep the TS files as seed until verified | A hosted Supabase project (or approval to keep developing against the local stack) |
| 3 | Provider architecture | Registry, adapter interface, aggregator (parallel, timeouts, retry with backoff, per-host rate limits, cache, partial results), health records; adapters: VELOX catalogue, manufacturer Shopify stores, generic CSV/JSON/XML feed, Brave, eBay, YouTube; others registered as “requires agreement” | API keys you choose to obtain (Brave, eBay, YouTube) |
| 4 | Global Parts Finder | `/parts` page: NL search (EN/ID, symptom → part suggestions), filters, sort, budget tiers by actual price, offer grouping without merging variants, seller comparison, source/verification labels, pagination | — |
| 5 | Compatibility engine | Category rules (wheelset, drivetrain, BB, cockpit, tyres, hubs/bearings) on top of `compat.ts`; statuses VERIFIED / LIKELY / REQUIRES VERIFICATION / NOT COMPATIBLE with reasons | — |
| 6 | Image infrastructure | Supabase Storage bucket, upload API, thumbnails/variants (sharp), perceptual-hash duplicates, validation jobs, cache invalidation | Storage plan decision (free tier vs paid) |
| 7 | Admin Image Manager | Overview, search/filters, per-product manager (upload/replace/reorder/primary/verify/notes), bulk upload (multi-file, drag-drop, ZIP, CSV/JSON mapping with preview & conflicts), image library | — |
| 8 | Complete admin | Catalogue CRUD, variants, categories, manufacturers, import centre (CSV/JSON/XML, preview, validation, recovery), provider management (enable/disable/test/schedule), verification queue, audit log, roles | — |
| 9 | Social & Marketplace Intelligence + feature integration | Discovery pipeline (discover → identify → cross-reference → verify → propose), source registry, research queue, manual URL submission, research notes, AI-assisted extraction (suggestions only, with source refs); Garage/Advisor/Builder/Compare/Explorers use the shared catalogue + discovery | Anthropic key if AI assistance should be live |
| 10 | Testing & optimisation | Unit, API, RLS/permission, provider-failure, upload, e2e, responsive, load test of search on 50k synthetic **test-only** rows (never shipped) | — |

## 5. Rules carried through every phase
No fabricated products, prices, specs, images, ratings or compatibility; unknown ≠ compatible; marketplace/social finds are discovery records, never auto-verified; prices are “observed at <time>”, never live unless just checked; affiliate/sponsored disclosed; no CAPTCHA/Cloudflare/login bypass; robots.txt respected but not treated as a reuse licence; images not rehosted without permission; no merge to `main` without approval.
