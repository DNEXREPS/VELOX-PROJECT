# VELOX — Ride Smarter.

A cycling intelligence platform: discover bicycles, explore Indonesian and international brands, browse components, configure custom builds with a real compatibility engine, get goal-driven upgrade advice, compare anything side by side, and manage a personal garage.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide · Geist**. Runs fully in **local demonstration mode** with no credentials; a complete Supabase/PostgreSQL schema is included for the persistent backend.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build (485 pages statically prerendered) / serve it |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm test` | Unit tests (Vitest) — compatibility engine, finder, advisor, search, import |
| `npm run test:e2e` | End-to-end browser test of every primary flow. Start the app first, then `BASE_URL=http://localhost:3000 npm run test:e2e` (needs Playwright + Chromium) |

### Environment variables

None are required. See `.env.example`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Reserved for the Supabase backend (not yet wired — see *Next steps*) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | As above |

---

## Implemented features

| Area | Route | What works |
| --- | --- | --- |
| **Home** | `/` | Cinematic hero, 8 category entry points, live example build (real compatibility output), real Upgrade Advisor output, brands (Indonesian and international side-by-side), component spotlight, comparison table, “Why VELOX” |
| **Bike Finder** | `/bikes` | Budget in IDR (presets + custom), experience, riding usage, category → subcategory, local/international, brand, country, frame material, groupset brand, brake type, wheel size, suspension, discontinued toggle. Ranked by suitability + drivetrain *value* (never by price alone) with per-bike reasons and cautions. URL-shareable filters, sort options, mobile filter drawer |
| **Bike profiles** | `/bikes/[slug]` | Full spec sheet with “Not Available” markers and missing-field count, price with price-type label and history, provenance (status, source, updated date), other model years/generations, similar bikes, add to garage / compare / wishlist, upgrade ideas |
| **Build a Bike** | `/build` | 17 component slots + accessories, discipline filter, picker with search/sort and live per-candidate compatibility, groupset “kit” install, running price and weight totals (with counts of parts lacking data), compatibility report, save / duplicate / new, multiple saved builds, export `.txt` / `.json`, print, compare builds, add to garage. Draft auto-persists |
| **Compatibility engine** | `src/lib/compat.ts` | 22 rules: headset/steerer, frame–fork wheel size and brake interface, bottom bracket × spindle matrix, brake mounts (flat/post/rim/V), lever ↔ caliper actuation, rotor mount (Center Lock / 6-bolt), rotor size, wheel size, axle standards (QR, thru-axle, Boost, BMX), freehub bodies (HG/MicroSpline/XD/XDR/Campagnolo/BMX driver), drivetrain speeds, pull-ratio/electronic protocol, derailleur capacity, chainrings vs front derailleur, FD mount, Di2 routing vs wireless AXS, UDH for SRAM Transmission, tyre ↔ rim (ISO diameters), tubeless, rim width ratio, tyre clearance, seatpost diameter / shims / proprietary posts, stem ↔ steerer, bar clamp, pedal thread. Results: *Compatible · Potentially Compatible · Incompatible · Insufficient Information* — never assumes compatibility when data is missing |
| **Upgrade Advisor** | `/upgrade` | Register a bike from the catalogue, from My Garage (incl. custom builds) or manually. Budget + goals (speed, climbing, comfort, reliability, control, versatility) + optional area limits. Candidates are checked against a virtual model of the bike using the same engine, tier-gated (no sideways/downward moves), and packed into **Budget / Balanced / Performance** plans with current part, replacement, price, benefits, weight delta (when known), implications, compatibility notes and priority. Areas with nothing worthwhile are listed with a reason |
| **Brand Explorer** | `/brands`, `/brands/[slug]` | 82 brands (14 Indonesian). Search (typo-tolerant), region, country, category, sort, grid/list. Profiles with origin, founding year, website, categories, current and historical models, components, and cross-region alternatives |
| **Component Explorer** | `/components`, `/components/[id]` | 321 components. Type tabs, search, manufacturer, discipline, tier, sort. Detail pages with specs, compatibility attributes, kit contents, “part of” groupsets, automatic checks against counterpart parts, “Use in a build” |
| **Compare** | `/compare` | Bikes, brands, components (incl. groupsets/wheels/tyres) and custom builds, up to 4 each. Grouped technical table, differences emphasised, “Best” markers for price/weight/clearance, “only differences” toggle, shareable `?kind=bike&ids=…` URLs |
| **My Garage** | `/garage`, `/garage/[id]` | Add catalogue, unlisted (manual) or custom-build bikes; per-bike profile with editable details, estimated value (clearly labelled), modifications / component-change / maintenance / note log with costs, links to Upgrade Advisor and builder; saved builds; wishlist |
| **Search** | ⌘K / `/` anywhere, `/search` | Global command palette and results page across brands, bikes, components and categories with typo tolerance (bounded Levenshtein), kind and brand filters, suggestions and empty states |
| **Admin Panel** | `/admin` | Role-gated. Overview and data-quality counts; CRUD for brands / bike models / components (incl. compatibility JSON, specs, prices with price type + source, image upload); verification status workflow (source required to verify); archive/restore; add subcategories; review community submissions (approve → published as *Community Submitted*); CSV/JSON import with validation preview; JSON/CSV export; reset overlay |
| **Community submissions** | `/submit` | Brand / bike / component / correction submissions with source and notes, routed to admin review |
| **Account** | `/account` | Demo sign-in with Rider or Administrator role; local data management |

Cross-cutting: IDR default with a labelled demo USD toggle; verification badges; “Estimated” price labels everywhere; toasts; skeletons; empty/error/404 states; keyboard navigation and focus styles; skip link; reduced-motion support; responsive from 390 px to wide desktop.

---

## Project structure

```
src/
  app/                    # routes (App Router). Each feature: page.tsx (server, metadata) + client component
    page.tsx              # Home
    bikes/ build/ upgrade/ brands/ components/ compare/ garage/ search/ admin/ submit/ account/
  components/
    ui/                   # design-system primitives (Button, badges, Price, fields, SpecRows, toast…)
    layout/               # Header (nav, ⌘K search), CommandSearch, Footer
    BikeGraphic.tsx       # procedural technical bicycle illustrations per category
    Glyphs.tsx            # component glyphs, brand monograms, VELOX logo
    catalog.tsx           # BikeTile, ComponentRow, Compare/Wishlist buttons
  data/                   # seed catalogue (NOT hard-coded in components)
    brands.ts categories.ts bikes.ts components.ts provenance.ts
  lib/
    types.ts              # domain model (mirrors the SQL schema)
    compat.ts             # compatibility engine
    finder.ts             # Bike Finder filtering + scoring
    upgrade.ts profiles.ts# Upgrade Advisor
    builds.ts             # build totals, kits, export
    search.ts             # index + typo-tolerant search
    state.ts store.ts     # catalogue overlay + user data stores (localStorage), admin write guard
    importers.ts csv.ts   # CSV/JSON import normalisers
    format.ts garage.ts
supabase/schema.sql       # relational schema + RLS (validated on PostgreSQL 16)
tests/                    # Vitest unit tests
scripts/smoke.mjs         # Playwright end-to-end test
```

## Database architecture

`supabase/schema.sql` — 20 tables, 37 row-level-security policies:

- **Reference:** `countries` (brand origin, region), `categories` → `subcategories` (expandable hierarchy)
- **Brands:** `brands`, `brand_categories`
- **Bicycles:** `bike_families` (e.g. *Strattos*) → `bike_models` (one row per model-year/trim, e.g. *Strattos S4 2024*; generation, specs, `compat` JSONB for the engine)
- **Components:** `component_manufacturers` → `components` (type, tier, specs JSONB, compat JSONB), `groupset_parts` (kits), `compatibility_rules`
- **Polymorphic facts:** `prices` (amount in IDR, `price_type` = msrp · distributor · retailer · estimated · historical, source, date, current flag), `images`, `data_sources`
- **Provenance on every catalogue row:** `status` (verified · community · unverified · discontinued · archived), `is_demo`, `updated_at`
- **Users:** `profiles` (role: user/admin), `builds`, `garage_bikes`, `garage_log`, `wishlist`, `submissions`
- **RLS:** catalogue is public-read and admin-only write (`is_admin()`), so regular users can never modify manufacturer data; personal tables are owner-only; submissions are insert-own / admin-review

In demo mode the same model lives in `src/lib/state.ts`: seed data + an admin **overlay** (edits, imports, archives, approved submissions) merged at read time, plus per-user stores in `localStorage` (`velox:v1:*`).

---

## Testing results

All run in this environment on the final code:

| Check | Result |
| --- | --- |
| `npm run lint` (TypeScript strict) | ✅ no errors |
| `npm test` (Vitest) | ✅ 18 / 18 — catalogue integrity, engine rules (valid race build, electronic-only frame, axle/freehub mismatch, insufficient data, UDH, clearance/shims, pull ratio, 1x+FD, full BMX build), finder budget/region/value ranking, advisor tiers respect caps and rim-brake constraints, typo search, CSV round-trip |
| `npm run build` | ✅ 485 static pages |
| `npm run test:e2e` against dev **and** production builds | ✅ 27 / 27, zero console/runtime errors — finder filtering + URL sync, local-only filter, ⌘K typo search, builder (frame, fork, groupset kit, wheels, totals, checks, save, reload persistence, incompatibility detection), advisor (catalogue + manual), compare (shared URL, “Best”, diff toggle, builds), garage (add, profile, log, link to advisor), admin gate, submission → approval → published, CSV import, archive hides from finder, component search → detail → use in build, Indonesian brand filter, no horizontal overflow at 390 px on 9 routes, mobile menu |
| `supabase/schema.sql` | ✅ applied cleanly to PostgreSQL 16 (with a stub `auth` schema) |

## Known limitations

- **Catalogue data is unverified demo seed.** Brands, models and components are real products, but specifications are editorial seed data that has *not* been checked against manufacturer sources (every record is labelled *Unverified · Demo*), and **every price is a VELOX estimate in IDR** — never presented as MSRP or distributor pricing. Where values were uncertain they are left empty (“Not Available”), including most bike weights and several Indonesian models, which surfaces as *Insufficient Information* in the engine.
- **No photography.** No manufacturer images are bundled; bikes use procedurally drawn technical illustrations and components use glyphs. Admin image upload works (stored as data URLs, ≤ 400 KB, demo only).
- **Persistence is per-browser.** Accounts, roles, garage, builds and admin edits live in `localStorage`; the demo “Administrator” role is self-selected and is **not** security — real enforcement is the RLS in the SQL schema once Supabase is wired.
- **Supabase is not yet connected in code.** The schema is complete and validated, but there is no data adapter yet; env vars are reserved.
- The whole seed catalogue ships to the client (simple and fast at this size, ~70 bikes / 321 components; move to server queries as it grows).
- The compatibility engine covers the common standards listed above; it does not yet model chainline, BB shell width per crank, brake hose/cable routing, rotor-adapter sizes per mount, or rim-tyre pressure limits.
- USD display uses a fixed demo rate (labelled). UI is English; Bahasa Indonesia is not yet provided.

## Recommended next steps

1. **Verify and expand the catalogue:** source official specs/prices per model year (start with Polygon, United, Element, Pacific, Thrill, Wimcycle), attach `data_sources`, flip records to *Verified*; add frame geometry tables.
2. **Wire Supabase:** a `CatalogRepository` / `UserRepository` implementing the same API as `state.ts` (read catalogue server-side, Supabase Auth for sessions/roles, Storage for images), then seed from `/admin` JSON export.
3. **Real product imagery** via Storage with responsive `next/image`.
4. **Price tracking:** distributor/retailer feeds into `prices` with history charts; local availability by city.
5. **Engine depth:** chainline, BB shell width, cable/hose routing, rotor adapters; fit/geometry-based size recommendation in the Finder.
6. **Bahasa Indonesia** localisation and IDR-first copy.
7. Add CI (lint, unit, e2e against `next start`) and server-side search for large catalogues.
