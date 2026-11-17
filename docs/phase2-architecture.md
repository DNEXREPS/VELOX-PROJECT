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
