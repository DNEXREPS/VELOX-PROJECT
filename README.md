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
| `npm run audit` | Catalogue quality audit computed from the live data → `docs/catalog-audit.md` |
| `npm run validate:images` | Product-image checks: files, format, dimensions, checksums, duplicate files/URLs, duplicate assignments (`-- --remote` also checks source URLs over HTTP) |

### Environment variables (all optional, server-side only)

| Variable | Enables |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI Mechanic language + photo analysis (structured output, server-side refusal fallback). Without it, the rule-based engine runs alone and the UI says so. |
| `VELOX_AI_MODEL` | Model override (default `claude-opus-5-5`) |
| `VELOX_IMAGE_API_URL`, `VELOX_IMAGE_API_KEY` | Image generation for the Visualizer via any provider behind a small gateway (contract in `src/lib/ai/registry.ts`). Without it, no image is generated and no illustration is substituted. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reserved for the Supabase backend (schema included, adapter not yet wired) |

Keys are read only in server code (`src/lib/ai/*`, `src/app/api/*`, guarded by `server-only`) and never reach the browser.

---

## This release — official manufacturer data & Pacific integration (16 Nov 2026, part 2)

UI unchanged. Full figures: [`docs/catalog-audit.md`](docs/catalog-audit.md) (`npm run audit`).

### Product image pipeline (fixed at the source)
- **Manufacturer adapters** read the image each manufacturer declares for that exact product on its own page — schema.org `Product.image`, Open Graph `og:image`, or the store’s product feed — then download, validate (HTTP 200, `image/*`, decodes, ≥ 300 px), de-duplicate by SHA-256 and store a local WebP (`scripts/research/official_images.py`, `united.py`, `wheel_images.py`). Every downloaded set was reviewed on contact sheets.
- Registry status `manufacturer-product-image`: shown unaltered with “Official photo · © Brand” and a link to the source page. No separate licence is on file — see *Known limitations*.
- **Coverage classes** (`imageCoverage()`): Verified official image · Verified authorised-distributor image · Licensed product image · Unverified image · Missing image — reported per brand in the audit and on `/sources`.
- The checksum guard also exposed duplicate *records*: Canyon outlet listings under abbreviated names that are the same bike (same official photo) as an existing record; these were merged.

### Pacific Bike (priority)
- `src/data/pacific.ts`: **Primum 3.3, 3.5, 5.3, 5.5, 9.0, Pro, Pro SE; Magnus 5.0**; Whizz, Whizz 7.0, Spectre 3.0–6.0, Varilux 5.0, Magenta, Rochester Pro; Stinger 7.0/8.0/9.0, Skeleton 3.0, Invert family, Avenger E600/E700; Noris folding family, Veloce 6.0; DAHON SYTE Brooklyn/Houston/Vito; Ravella, X-Cross, Ventura XM, BMX (X-Men, Zeckrom, Avorio, Hotshot); Exotic kids and electric models.
- Each record carries the official URL, the **full component list as published** (frame, fork, shifters, derailleurs, brakes, crankset, cassette, hubs, rims, tyres, stem, handlebar, seatpost), sizes, colours and the official listed IDR price (Java) where shown. Variants keep their own specs (e.g. Primum 3.5 hydraulic disc vs 9.0 rim caliper).
- **SYTE** is a separate brand: rims (Chronos, carbon 50 mm, Celestial), Chronos hubs, stems, handlebars, air fork, seatpost, mechanical disc brake, plus SYTE helmets, lights, bags and pumps. Pacific-branded bottle cages, saddles and pumps, Exotic parts, and Prowheel/CST parts specified on Pacific bikes are separate records.
- Bike → component navigation: spec rows link to component records (e.g. **Magnus 5.0 → SYTE Chronos hubs → replacement bearings**). Pacific does not publish the hub bearing designation, so the hub page says so and links the Bearing ID tool instead of guessing.
- **Access limitation:** pacific-bike.com returns a Cloudflare block (HTTP 403) to every automated request — pages, robots.txt, sitemaps and the WooCommerce Store API. VELOX does not circumvent it. Product text was read from the search index of the exact official URLs, so Pacific records are “unverified” and show the missing-image state with a link to the official page.

### United Bike (official site)
- unitedbike.com allows crawling (`Allow: /`, Google sitemap). Imported every bicycle product page: official IDR price, category, description, geometry and the official product image.

## This release — product database & image quality overhaul (16 Nov 2026)

The UI, design system and features are unchanged; this release fixes product imagery and data quality. Full numbers: [`docs/catalog-audit.md`](docs/catalog-audit.md) (`npm run audit`).

### Product images
- **Fixed the shared-photo problem.** The previous release pictured all 94 models with 15 category photos (91 models shared a photo; one photo stood in for 16 models; none showed the actual product). Bike cards, bike pages, compare, garage and the visualizer now use a single component, `components/BikeImage.tsx`, which shows either a **verified photo of that model** or a deliberately designed **VELOX placeholder** ("Verified product photo not available") with a link to the manufacturer’s own photos. It cannot fall back to category photography or another model’s image; `mediaForBike` was deleted.
- **Centralised product-image registry** (`src/data/product-images*.ts`): `primary_image_url`, `gallery_images`, `image_source_url`, `image_source_type`, `image_license_status`, `image_verification_status`, `image_model_match` (exact / model / generation / family), `last_image_verified_at`, author, licence and SHA-256. Only licensed + verified + same-model-or-generation images are displayed; one file can belong to one model only.
- **2 verified product photos so far** (Polygon Strattos S3, Polygon Xquarone EX9), from Wikimedia Commons under CC BY-SA 2.0, checked by eye, stored locally as WebP and credited on the page. Manufacturer photography was **not** used: usage rights could not be confirmed, so those models show the placeholder plus the official link.
- `npm run validate:images` + unit and browser tests enforce: no duplicate files/URLs, no cross-model assignment, no category photo on a product card, checksums unchanged.

### Catalogue expansion from official sources
- **520 bicycle models** (was 94). **407 imported from official manufacturer product pages**: Canyon 102, Specialized 124, Santa Cruz 82, Cervélo 56, Tern 43. Read with robots.txt respected and ≥1.2 s between requests; fields are filled only when the manufacturer publishes them. 65 duplicate colour/size listings were collapsed.
- Specialized and Tern publish no model year; those records say **“Listed 2026 · model year not published”** (`yearBasis: "listed-in-range"`) instead of inventing one.
- **Prices:** official US MSRP is stored as published (`price.original`, e.g. US$3,199) and converted to IDR at Bank Indonesia’s JISDOR rate (Rp 18,148/USD, 4 Nov 2026). The UI labels it “converted, not an Indonesian price”. Seed prices remain labelled “Estimated”; nothing new was estimated.
- **Indonesian research:** 19 new records (Polygon Strattos S3/S5 Disc/F2, Helios A8, Collosus TE0/TE8/TLE/DH, Cascade, Tambora AE, Xquarone EX9; Pacific Noris 2.3 / Aviator; United Dresden V1/V2) citing official Polygon Indonesia pages as indexed by search, Rodalink and reputable listings. They stay “unverified” because polygonbikes.com, rodalink.com and pacific-bike.com refuse automated readers, and VELOX does not work around that.
- **Wheelsets: 251** (was 47) — **204 from manufacturers’ own stores** (Hunt, ICAN, Winspace/Lún) with official USD prices; depth/width/weight only where stated explicitly.
- Bike Finder (same UI): brand list shows model counts; new “Official manufacturer data only” and “With verified product photo only” filters.

## Previous release — visual redesign & intelligence expansion

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
- (Superseded: official product data is now imported — see the current release above.)

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
    BikeImage.tsx                 the only way a specific bike is pictured: verified photo or placeholder
    Photo.tsx                     registry-backed next/image for category photography
    upgrade-config.tsx            shared bike/part pickers + SimulatorPanel
    AIStatusBadge.tsx             honest provider status
    layout/ (Header with Tools menu, CommandSearch, Footer), ui/, catalog.tsx, Glyphs.tsx
  data/
    brands.ts (researched + seed)  bikes.ts  components.ts  wheels.ts (wheelsets, hubs, bearings)
    bikes.official.ts  wheels.official.ts   GENERATED from official manufacturer data
    product-images.ts  product-images.records.ts   model-specific photo registry
    import-log.ts                  what was imported, duplicates removed, what was blocked
    media.ts (category photography) research.ts (pending names, official sources)  categories.ts
  lib/
    compat.ts finder.ts upgrade.ts builds.ts search.ts           (existing engines, unchanged APIs)
    ingest.ts                      adapters, dedupe, staging
    mechanic/ knowledge.ts engine.ts standards.ts
    simulator.ts  visualizer.ts
    ai/ types.ts anthropic.ts registry.ts                        (server-only)
supabase/schema.sql                23 tables, 42 RLS policies (validated on PostgreSQL 16)
tests/                             Vitest (54 tests)
scripts/smoke.mjs                  Playwright end-to-end (42 flows)
scripts/audit-catalog.mjs          catalogue audit → docs/catalog-audit.md
scripts/validate-images.mjs        product-image validation
public/media/                      category photography (WebP)
public/media/products/             verified, licensed product photos (WebP)
```

## Database architecture

Additions to the relational schema: `source_type`, `confidence_level`, `brand_kind`, `license_status` enums; provenance columns (`confidence`, `original_manufacturer`, `reviewer_notes`) on brands, bike models and components; `brands.kinds/parent_company/headquarters`; `bike_models.variant` with a **unique identity index** (brand + lower(name) + year + variant); `components.product_id/model_year` with a unique product-ID index; `wheelset_specs`; `bearings` (indexed by dimensions); `media_assets` (licence + attribution + representative flag); `data_sources.type`; `ingest_staging` (admin-only RLS). Catalogue tables remain public-read / admin-write.

## Testing results (final code)

| Check | Result |
| --- | --- |
| `npm run lint` (TypeScript strict) | ✅ |
| `npm test` | ✅ 54 / 54. The 43 earlier tests, plus: image registry (every image belongs to an existing model, local file with matching checksum and licence, never the same photo on two models, never category photography, only licensed and verified same-model photos shown, no fallback for models without a photo, BikeImage independent of category media); catalogue integrity (known brand, unique identity, every official import cites its official page and retrieval date, Specialized/Tern labelled “listed”, converted prices carry the original amount and rate); every non-estimate price cites a source URL and date |
| `npm run validate:images` | ✅ 2 images, no duplicate files, URLs or assignments, dimensions and checksums match |
| `npm run build` | ✅ (520 bike pages, 588 component pages prerendered) |
| `npm run test:e2e` (production) | ✅ 42 / 42, no console or runtime errors. The 39 earlier flows, plus: every Finder card shows a distinct verified photo or the placeholder and never category photography; the Strattos S3 shows its own photo; a Canyon page shows the placeholder with the official link and the labelled US$ to IDR conversion; the official-data filter and brand model counts work. No horizontal overflow at 390 px on 13 routes |
| `supabase/schema.sql` | ✅ applied to PostgreSQL 16 (24 tables, 44 RLS policies). `product_images` rejects the same file on a second record; `prices` rejects a non-estimate price without a source URL |

## Known limitations

- **Product photos:** only 2 of 520 models have a verified photo. Every other model shows the VELOX placeholder with a link to the manufacturer’s photos. Manufacturer images were not copied because their licences are unconfirmed, and Wikimedia Commons has very few photos of current models.
- **Official imports cover five brands** (Canyon, Cervélo, Santa Cruz, Specialized, Tern). Trek, Giant and Cannondale sitemaps sit on hosts outside the allowed network. Polygon, Rodalink, Pacific, Scott and Orbea refuse automated access. Their data comes from search-indexed official pages (unverified) or is still missing. `docs/catalog-audit.md` lists the requested brands that still have fewer than three models (including Scott, Merida, BMC, Colnago, Orbea, Trek and Giant).
- **Thin categories:** Urban & Hybrid (5), BMX (3) and Specialty (16) are thin because the imported brands focus on road, MTB, gravel and e-bikes.
- **Prices:** imported prices are US MSRPs converted to IDR (labelled). No official Indonesian MSRP was retrievable. 67 seed bikes still carry labelled VELOX estimates.
- **Model years:** 87 seed records have unchecked model years. Specialized and Tern are marked “Listed 2026” because neither publishes a model year.
- **No live AI in this build** (no `ANTHROPIC_API_KEY` or image provider), and the Anthropic provider code has not been exercised against the live API.
- Persistence is still per-browser (localStorage); Supabase schema is ready but not wired. The demo admin role is not security.

## Recommended next steps

1. **Product photography:** ask manufacturers and Indonesian distributors (Polygon / Rodalink, Pacific, United) for written permission or a press-image feed, then record each image with `image_license_status: "licensed"`. The registry, validation and UI are ready.
2. **Indonesian data:** obtain an official product export (CSV/JSON) from Polygon, Pacific and United and run it through the admin import → review queue, rather than scraping sites that refuse automated access.
3. **More official imports:** allow the sitemap hosts for Trek, Giant and Cannondale, and add Scott, Merida, Orbea, BMC and Cube when reachable. The harvesters follow the same pattern as the five done.
4. Review and promote the 26 researched records, and replace the 67 remaining seed price estimates with sourced prices or “Not Available”.
5. Set `ANTHROPIC_API_KEY` and an image provider, then evaluate AI Mechanic and the Visualizer on real inputs.
6. Wire Supabase and add Bahasa Indonesia localisation.
