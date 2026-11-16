# VELOX — Ride Smarter.

A cycling intelligence platform: discover bicycles from Indonesia and around the world, explore brands, wheel makers and components, configure custom builds with a real compatibility engine, get goal-driven upgrade advice, diagnose problems with **AI Mechanic**, preview upgrades with the **AI Bike Visualizer**, calculate weight and cost changes with the **Upgrade Simulator**, compare anything side by side, and manage a personal garage.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide · Geist · Anthropic SDK · Zod**. Runs fully without credentials; AI features say clearly when no provider is connected.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | TypeScript strict type-check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser end-to-end test of every primary flow — start the app, then `BASE_URL=http://localhost:3000 npm run test:e2e` |

### Environment variables (all optional, server-side only)

| Variable | Enables |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI Mechanic language + photo analysis (structured output, server-side refusal fallback). Without it, the rule-based engine runs alone and the UI says so. |
| `VELOX_AI_MODEL` | Model override (default `claude-opus-5-5`) |
| `VELOX_IMAGE_API_URL`, `VELOX_IMAGE_API_KEY` | Image generation for the Visualizer via any provider behind a small gateway (contract in `src/lib/ai/registry.ts`). Without it, no image is generated and no illustration is substituted. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reserved for the Supabase backend (schema included, adapter not yet wired) |

Keys are read only in server code (`src/lib/ai/*`, `src/app/api/*`, guarded by `server-only`) and never reach the browser.

---

## What changed in this release

### Visual redesign
- **Cinematic full-bleed hero** with licensed photography, oversized editorial type, glass stat strip computed from the database.
- **Photographic category mosaic** (Road, Mountain, Gravel, Electric, Urban, Hybrid, Folding, BMX, Touring, Track & Fixed) — distinct imagery per category, never one photo reused across unrelated categories.
- Varied editorial compositions: split image/panel layouts, full-width photo bands (AI Mechanic, closing "Ride Smarter"), a brand marquee, numbered editorial lists.
- **All wireframe bicycle illustrations removed.** Bike tiles, bike pages, garage, compare and builder now use photography; where a photo stands in for a specific product it carries a "Representative image" label and a link to the official product page when known.
- Navigation: fixed translucent header (transparent over the hero), refined spacing and animated active underline, and a **Tools ▾ menu** for AI Mechanic, AI Bike Visualizer and Upgrade Simulator. Responsive mobile menu includes the tools.

### Imagery & licensing
- 20 photographs from **Pexels** (free commercial use, modification allowed), downloaded and **visually checked** before use, served locally as WebP via `next/image`.
- Central **image registry** (`src/data/media.ts`) records source URL, photographer (where stated), licence, quality, verification date and the `representative` flag. Public listing at `/sources`.
- No manufacturer product photography is bundled: licensing could not be confirmed. Admin image upload exists for licensed assets.

### Global database expansion
- **199 manufacturers** (14 Indonesian, 55 China & Taiwan, 63 Europe, 54 North America, 9 Japan & Korea), each labelled by what it actually does: complete bicycles, framesets, wheels, components, e-bikes, OEM manufacturing, private-label/open-mould, distribution.
- **41 wheel makers**, **47 wheelsets** with an extended spec model (rim material/depth, internal/external width, hub, spokes, bearings, max system weight, warranty), **11 hubs**, **25 reference bearings**.
- **94 bike models / model years**, now covering TT, triathlon, track, fat bike, downhill, dirt jump, e-road, e-gravel, e-folding, e-cargo, cargo, tandem, recumbent, kids, balance and adaptive bikes, plus researched Chinese models (Pardus, Tavelo, Quick Pro, Elves, Winspace, SEKA).

### Real-world research (16 Nov 2026)
- Web research on 32 brand records (plus Indonesian company checks). Facts are recorded **only where a source stated them**, with the source URL, type and retrieval date; conflicts are left empty and explained in reviewer notes. Examples of corrections: United Bike → PT Terang Dunia Internusa Tbk (founded 1988, Tangerang Selatan; earlier seed domain removed as unconfirmed); Wimcycle and Thrill → Gresik; Pacific → PT Roda Pacific Mandiri (since 1995); Element → Kendal (since 2008).
- 13 requested names could not be substantiated (e.g. Hygge, OG-EVKIN, ONIRII, BXT, Carbonal, CSC, Tideace, VeloBuild) and are **kept out of the catalogue** in a research queue (`src/data/research.ts`, shown on `/sources`).
- Official manufacturer sites could not be fetched from the build environment, so **no product specifications were imported from official sites yet**; they are listed as sources awaiting integration.

### Provenance model
Statuses: **Verified Official · Verified Distributor · Cross-Verified · Community Submitted · Unverified · Historical · Discontinued · Archived**. Every record supports source URL + source type + retrieval date, confidence (high/medium/low), original manufacturer and reviewer notes. A record cannot be approved as verified without a source.

### Data ingestion
`src/lib/ingest.ts` — reusable adapters (**CSV**, **JSON**, **official product page via schema.org JSON-LD**, **manual entry**) → normalisation → **duplicate detection** (record id, product ID/SKU/GTIN, brand + model + year + variant, near-identical names) → **staging queue** → admin **Review queue** (approve as new, update existing, reject, set status, reviewer notes). Nothing reaches the catalogue without review. The SQL schema enforces the identity rule with a unique index.

### VELOX AI Mechanic (`/mechanic`)
- Text, dictation (Web Speech API where supported), bike from My Garage or catalogue, system selection, up to 6 photos.
- **Rule-based diagnostic engine** (19 systems, 28 causes, 15 targeted follow-up questions, English + common Indonesian terms) ranks **likely** vs **possible** causes, lists **confirmed** facts (your answers, catalogue data) and **unknowns**, gives ordered inspection steps and repair complexity, and suggests catalogue parts with a compatibility check against your bike.
- **Safety**: anything affecting braking, steering, fork or frame triggers a "stop riding until inspected" warning.
- **Bearing identification**: match by seal marking (2RS/LLB suffixes, ISO 618xx naming handled) or measured ID × OD × width; SHIS headset code decoder; bottom-bracket standards reference (BSA, ITA, T47, BB86, BB92, PF30, BB30, BB386EVO, BBright). Never identifies a bearing from a photo.
- With `ANTHROPIC_API_KEY`, the server adds a Claude analysis (structured output via Zod, photos as vision input, grounded in the engine's result and catalogue data); without it, the page states that only the local engine ran.

### VELOX AI Bike Visualizer (`/visualizer`)
Choose a garage/catalogue bike, upload a side-on photo, pick concept (Original / Budget / Balanced / Performance — loaded from Upgrade Advisor plans — or Custom), parts from the catalogue, frame-colour concept and scene. VELOX builds a **geometry-preserving brief** (keep silhouette, wheelbase, fork, proportions; no brand logos or names) and sends it to the configured image provider. Results are labelled **AI concept visualisation**. Without a provider: no image, no substitute illustration — the exact brief is shown.

### Performance Upgrade Simulator (`/simulator`)
Per-part weight Δ only when both weights are catalogued; bike total only when the bike weight and every Δ are known; cost totals with estimate labelling; practical effects described qualitatively. **No speed/watt gains are invented.** The calculation method is shown on the page. Embedded in the Visualizer and linked from Upgrade Advisor plans and garage bikes.

---

## Project structure

```
src/
  app/
    page.tsx                      Home (editorial redesign)
    bikes/ build/ upgrade/ brands/ components/ compare/ garage/ search/ admin/ submit/ account/
    mechanic/   visualizer/   simulator/   sources/        ← new
    api/ai/status  api/mechanic  api/visualizer             ← server routes (AI providers)
  components/
    Photo.tsx                     registry-backed next/image with licence/representative labels
    upgrade-config.tsx            shared bike/part pickers + SimulatorPanel
    AIStatusBadge.tsx             honest provider status
    layout/ (Header with Tools menu, CommandSearch, Footer), ui/, catalog.tsx, Glyphs.tsx
  data/
    brands.ts (researched + seed)  bikes.ts  components.ts  wheels.ts (wheelsets, hubs, bearings)
    media.ts (image registry)      research.ts (pending names, official sources)  categories.ts
  lib/
    compat.ts finder.ts upgrade.ts builds.ts search.ts           (existing engines, unchanged APIs)
    ingest.ts                      adapters, dedupe, staging
    mechanic/ knowledge.ts engine.ts standards.ts
    simulator.ts  visualizer.ts
    ai/ types.ts anthropic.ts registry.ts                        (server-only)
supabase/schema.sql                23 tables, 42 RLS policies (validated on PostgreSQL 16)
tests/                             Vitest (43 tests)
scripts/smoke.mjs                  Playwright end-to-end (39 flows)
public/media/                      licensed photography (WebP)
```

## Database architecture

Additions to the relational schema: `source_type`, `confidence_level`, `brand_kind`, `license_status` enums; provenance columns (`confidence`, `original_manufacturer`, `reviewer_notes`) on brands, bike models and components; `brands.kinds/parent_company/headquarters`; `bike_models.variant` with a **unique identity index** (brand + lower(name) + year + variant); `components.product_id/model_year` with a unique product-ID index; `wheelset_specs`; `bearings` (indexed by dimensions); `media_assets` (licence + attribution + representative flag); `data_sources.type`; `ingest_staging` (admin-only RLS). Catalogue tables remain public-read / admin-write.

## Testing results (final code)

| Check | Result |
| --- | --- |
| `npm run lint` (TypeScript strict) | ✅ |
| `npm test` | ✅ 43 / 43 — previous engine tests plus database integrity (unique ids, valid subcategories, kinds on every brand, no verified record without a source, researched records cite https sources with dates, pending names excluded, all requested subcategories covered), media registry (files exist, licence data, distinct category imagery), AI Mechanic engine (routing, re-ranking, safety stop, Indonesian terms, no photo-only identification), bearing matcher (markings, ISO naming, measurements, SHIS), simulator (no total when weights unknown, no performance claims), ingestion (staging, duplicate certainty, product-ID dedupe, schema.org extraction), visualizer brief (geometry kept, no brand names) |
| `npm run build` | ✅ |
| `npm run test:e2e` (dev and production) | ✅ 39 / 39, no console/runtime errors — all previous flows plus Tools menu, AI status honesty, AI Mechanic diagnose + follow-up re-ranking + brake safety stop, bearing ID by marking and measurement, simulator plan loading, visualizer brief + refusal to fake an image, sources page, staged CSV ingest that is invisible until approved, and no horizontal overflow at 390 px on 13 routes |
| `supabase/schema.sql` | ✅ applied to PostgreSQL 16; identity index rejects a case-variant duplicate |

## Known limitations

- **Most specifications are still unverified seed data**, and every bike/component price is a VELOX estimate. Brand-level research is real and sourced; product-level data from official manufacturer sites has **not** been imported (the build environment could not reach those sites). `/sources` shows exact counts by status.
- **No live AI in this build**: no `ANTHROPIC_API_KEY` or image provider was available, so AI Mechanic ran on its rule-based engine and the Visualizer could not generate images. The Anthropic provider code type-checks against the installed SDK but has **not been exercised against the live API**.
- **Hero image**: no free-licensed dark studio carbon product shot was available; the hero is an editorial road photo with a cinematic grade. Swapping in commissioned or licensed studio photography is a one-line change in `src/data/media.ts`.
- Category photos are representative and repeat within a category; model-specific photography needs licensed manufacturer imagery.
- Persistence is still per-browser (localStorage); Supabase schema is ready but not wired. The demo admin role is not security.
- Audio: dictation uses the browser's speech recognition where available; audio files are not uploaded or transcribed server-side.

## Recommended next steps

1. Allow the official manufacturer hosts listed on `/sources` (or provide licensed feeds) and run the schema.org adapter to import model-year specs and images into the review queue — start with Polygon, United, Pacific, Element, Wimcycle.
2. Set `ANTHROPIC_API_KEY` and run an evaluation set of real symptom descriptions against AI Mechanic before exposing it widely.
3. Connect an image provider via `VELOX_IMAGE_API_URL` and tune the brief with real user photos.
4. Commission or license a dark-studio hero and per-model product photography.
5. Wire Supabase (auth, catalogue reads, staging, media storage) using the included schema.
6. Bahasa Indonesia localisation.
