# Phase 2 — infrastructure audit & exact architecture

Decisions from the owner (17 Nov 2026): no hosted Supabase yet → build and test against the **local stack only**; **zero paid APIs or storage**; storage behind an abstraction; synthetic data only for performance tests, never mixed with the real catalogue.

## Infrastructure audit (completed)

| Item | Finding |
| --- | --- |
| Hosting | No deployment config in the repo (no `vercel.json`, Dockerfile or CI). The app is a standard `next build && next start` Node server. **Unknown production host** — this matters for storage (below) and for self-hosted search (Phase 3). |
| Database (dev) | `scripts/local-supabase/start.sh`: PostgreSQL 16 (throwaway cluster, port 54322) + GoTrue + PostgREST (Docker) behind a gateway on `:54321` that mimics a Supabase project. `supabase/schema.sql` is applied once. |
| Database (prod) | None. No production database exists, so nothing can be overwritten. |
| Existing catalogue tables | `brands`, `bike_models`, `components`, `component_manufacturers`, `prices`, `product_images`, `data_sources`, `wheelset_specs`, `bearings`, `groupset_parts`… exist in `schema.sql` but are **empty and unused**; the app reads `src/data/*.ts`. |
| Runtime catalogue | 706 bikes, 627 components, 201 brands, 716 image records bundled into client JavaScript (largest chunk 2.2 MB). |
| User data | `profiles`, `user_collections` (owner-only RLS) — in use, untouched by this phase. |
| Images | 42 MB in `public/media/products` (in git), sha256-checksummed, served by Next with the image optimizer. |
| New dependencies needed | None. Loading uses `psql`; the app talks to PostgREST over `fetch`. |

## Database architecture (PostgreSQL ≥ 15, Supabase-compatible)

**Migrations.** `supabase/schema.sql` stays the baseline. New changes are ordered files in `supabase/migrations/` (Supabase CLI naming). The local stack applies them once each and records them in `velox_migrations`. On a future hosted project: run `schema.sql`, then the migrations in order (or move both into `supabase db push`). Migrations only **add**; they never drop or rewrite existing tables. The old empty `bike_models` / `components` tables are left in place and marked deprecated in a comment.

**Product ≠ offer.**

```
brands (manufacturers; existing table, extended)
  └── products ──────────── product_variants (size / colour / MPN / GTIN)
        │  identity, category, specs, compat, official URL, verification,
        │  per-dimension confidence, msrp, search vector
        ├── product_sources (evidence: claim → URL, kind, retrieved_at)
        └── offers ─── sellers          (a seller's listing: price, currency, condition,
              │         providers        availability, shipping as stated, observed_at)
              └── price_observations    (price history; never shown as "live")
product_categories (hierarchical taxonomy: bikes, frames & suspension, drivetrain,
                    wheel systems, braking, cockpit, other — EN + ID names)
fx_rates (currency → IDR with source + date; conversions only from a cited row)
providers (registry: type, access method, status, permissions, rate limit, health)
```

- `products.id` keeps today's ids (`bike model id` / `component id`), so existing garage, builds, favourites and URLs keep working.
- Offers may exist **without** a product (`product_id null`): an external discovery not yet matched or promoted. Promotion links it; nothing is auto-promoted.
- Deduplication: unique identity index on `(brand_id, kind, lower(name), coalesce(model_year,0))`; unique `gtin`; unique `(brand_id, lower(mpn))` per variant. Variants are separate rows, so different sizes/colours never merge.
- Confidence is stored per dimension (`identity`, `specs`, `manufacturer` on products; `price`, `availability` on offers; `image` on images) — no combined score.
- **Search.** `products.search_vector` (generated `tsvector`, `simple` config so Indonesian and English both work), `pg_trgm` GIN on name for typo tolerance, btree on `(kind, category_id)`, `brand_id`, `price_idr`, `model_year`; GIN on `specs`/`compat`. One SQL function `search_products(...)` does filtering, ranking and paging (`limit/offset` + total) and is exposed through PostgREST as an RPC.
- **Security.** RLS on every new table: public read for catalogue/offers/providers (no secrets stored in tables), writes only for admins (`is_admin()` now; Phase 8 adds finer roles). Provider credentials live only in server environment variables.
- **Synthetic performance data** lives in a **separate database** (`velox_perf_synthetic`) built from the same migrations; every row is named `SYNTHETIC TEST …` and has `data_origin = 'synthetic-test'`. The main database rejects that origin with a check constraint.

**App access.** A server-only `CatalogRepository` with two implementations:
- `static` (default): today's bundled data, so nothing changes until a database is configured.
- `database`: PostgREST via `fetch` using the public anon key and RLS.

`VELOX_CATALOG_SOURCE=database` switches over. API: `GET /api/catalog/products` (validated, rate-limited, paginated). Pages move to the API incrementally, starting with the component explorer. That is where the catalogue will grow into tens of thousands of products.

## Storage architecture (zero cost, switchable)

`StorageDriver` interface (`put`, `get`, `head`, `delete`, `publicUrl`), content-addressed keys (`products/<sha256>.<ext>`), and metadata kept in Postgres (Phase 6 tables). Drivers:

| Driver | Cost | When | Notes |
| --- | --- | --- | --- |
| `repo` (existing `public/media`) | free | current verified images | Read-only at runtime; changes need a deploy. Fine for the curated set, not for 50k products (git size). |
| `local` (filesystem, `VELOX_STORAGE_DIR`) | free | development and **self-hosted** production (VPS/Docker) | Served by `/api/media/...` with immutable caching. Does **not** persist on serverless hosts (e.g. Vercel's filesystem is ephemeral). |
| `supabase` (Storage REST) | free tier ≈ 1 GB, 50 MB/file (to confirm on supabase.com/pricing) | when a hosted project exists | Same project as auth; enough for roughly 5–10k optimised product images. |
| `s3` (S3-compatible: Cloudflare R2, Backblaze B2, MinIO self-hosted) | R2 ≈ 10 GB free but billing activation reportedly required; MinIO free self-hosted | later scale | One driver covers all S3-compatible services. |

Development uses `local`. The Product Image Manager (Phases 6–7) talks only to the interface. Thumbnails and AVIF/WebP come from the existing Next image optimizer plus `sharp` (already installed) at upload time.

## Self-hosted search note (for Phase 3)
SearXNG needs a long-running container (not serverless). It is a metasearch engine: it fetches results from upstream search engines, and some of those engines' terms prohibit automated querying. In Phase 3 it will be configured only with engines whose terms permit it. It is wired as an optional provider so it works wherever the owner can host it, and it is tested locally if the image can be pulled.

## Phase 2 results (18 Nov 2026)

**Built** (local stack only; no production database exists or was touched):
- Migrations `20261118000100`–`000500`: products / variants / sources / providers / sellers / offers / price history / cited FX rates, a 75-node EN/ID taxonomy, RLS (public read, admin write), and search functions (full-text first, typo-tolerant fallback, paging with totals, facets).
- `scripts/local-supabase/migrate.sh` (ordered, once each, recorded in `velox_migrations`), wired into `start.sh`.
- `scripts/catalog/export-seed.mjs` + `load-seed.sh`: the real catalogue → Postgres, idempotent, never deletes, never overwrites admin-edited rows (`seed_locked`). Loaded: 203 brands, 1,333 products (706 bikes, 627 parts), 715 image pointers, 1,124 sourced prices, 1,923 evidence rows, 229 variants, 1 offer.
- Retailer prices are stored as **offers**, not as the product's MSRP. A data error found while doing this: a Hunt listing of a Shimano RT-MT900 rotor pair had been imported as a Hunt wheelset. The record is corrected, its retailer photo rejected and the importer now excludes non-wheel products.
- `src/lib/catalog/repo.ts` (static | database), `/api/catalog/components`, `/api/search`; the component explorer and global search now page through the API. Catalogue construction moved out of `state.ts` so the shared layout no longer bundles the catalogue.

**Measured JS loaded by the `load` event** (same method, production builds): home 2.9 → 1.9 MB, glossary 4.1 → 2.0 MB, components 4.1 → 2.0 MB. Bike Finder, Builder, Garage, Compare and Upgrade still compute over the full catalogue in the browser (next phases).

**Search performance — synthetic data only** (`scripts/catalog/perf-synthetic.sh`, separate database `velox_perf_synthetic`, every row named “SYNTHETIC TEST …”, `data_origin = 'synthetic-test'`, rejected by a constraint in the real database). Median of 7 runs, local PostgreSQL 16:

| Query | 50k rows | 100k rows |
| --- | ---: | ---: |
| text “carbon aero” | 8.7 ms | 16.8 ms |
| prefix “endur” | 22.5 ms | 43.0 ms |
| category tree “wheels” | 18.3 ms | 36.2 ms |
| budget + price sort | 4.3 ms | 13.5 ms |
| text + category + budget | 4.6 ms | 11.3 ms |
| deep page (offset 2,400) | 80.9 ms | 149.7 ms |
| components: type + tier | 4.6 ms | 11.4 ms |
| components: text + weight sort | 4.8 ms | 7.6 ms |
| typo, no match “carbn gravle” | 32.1 ms | 61.0 ms |
| typo “synthetik” (matches every row) | 51.3 ms | 88.2 ms |
| components typo “endurnce” | 84.5 ms | 149.1 ms |
| facets | 3.1 ms | 5.6 ms |

The first version scanned every row (1.1–1.7 s at 50k): optional filters written as `(param is null or …)` cannot use indexes. Fixed by building only the needed conditions, two-pass search (indexed full-text, then a GiST nearest-neighbour typo pass bounded to the 500 closest names), and ranking ids before fetching wide columns. Synthetic vocabulary is deliberately small, so match counts are pessimistic.

**Tests:** 88/88 unit (12 new: repository paging/filters/sort/shape, database adapter mapping and failure, migrations additive + RLS + product≠offer + no secrets + synthetic guard + bound parameters), e2e 56/56 in static mode **and** 56/56 with the server in database mode, account e2e 20/20.

**Not done in Phase 2 (planned):** Bike Finder, Builder, Garage, Compare, Upgrade and product pages still read the bundled catalogue; admin writes still go to the browser overlay (Phase 8); image tables/storage (Phase 6); providers/offers ingestion (Phase 3).
