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
| `npm run images:health` | Image Health Checker → `src/data/image-health.json` (feeds Admin → Images). Local checks always; polite remote checks of source pages (1 req/s per host, robots.txt respected, 7-day cache, `--force` to refresh, `--local` to skip) |
| `node scripts/auth-e2e.mjs` | Account journey against the local Supabase-compatible stack (see *Accounts* below) |

### Environment variables (all optional — see `.env.example`)

| Variable | Where | Enables |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser (public by design) | Accounts: email + Google sign-in, sync of garage, builds, favourites, comparisons, upgrade plans, AI Mechanic history and settings. Data is protected by row-level security, not by hiding the key. Without them the site works fully for guests and data stays on the device. |
| `NEXT_PUBLIC_SITE_URL` | browser | Base URL for email links and OAuth redirects (e.g. `https://velox.example`) |
| `NEXT_PUBLIC_AUTH_GOOGLE` | browser | `false` hides the Google button until the provider is enabled in Supabase |
| `NEXT_PUBLIC_IMAGE_BASE` | browser | Optional CDN / Supabase Storage bucket mirroring `public/media/products` |
| `ANTHROPIC_API_KEY`, `VELOX_AI_MODEL` | server only | AI Mechanic language + photo analysis |
| `VELOX_IMAGE_API_URL`, `VELOX_IMAGE_API_KEY` | server only | Visualizer image generation (contract in `src/lib/ai/registry.ts`) |

Never set the Supabase **service-role** key or the Google **client secret** in this app: the secret lives only in the Supabase dashboard, and a unit test fails if either appears in `src/`. Server keys are read only in `server-only` modules.

---

## This release — image reliability, accounts & usability (17 Nov 2026)

### Images
- **Investigation:** on a production build all 570 image requests on the main routes returned 200 and none were broken. Every product photo is self-hosted under `public/media/products` (downloaded once from the manufacturer's own product page, checksummed), so manufacturer hotlink protection, CORS and `next.config` `remotePatterns` cannot break them. No hotlink restriction was bypassed: sites that refuse automated access (Pacific/Exotic/SYTE behind Cloudflare, Polygon) were left alone and their models show the placeholder.
- **Registry** (`src/data/product-images.official.ts`, type `ProductImage`): id, subject, primary image, **gallery**, source page + site, original file URL, stored path, format, dimensions, sha256, attribution, licence status, verification status, last verified, updated.
- **Delivery:** `next/image` with AVIF/WebP, responsive `sizes`, lazy loading below the fold, 30-day optimizer cache. `NEXT_PUBLIC_IMAGE_BASE` moves the originals to a CDN without code changes.
- **Storage evaluation:** for this catalogue (≈1,000 files, ≈60 MB) the repository + Vercel/Next image optimizer is the simplest reliable option. **Supabase Storage** (public bucket, same project as auth) is recommended once admins upload images from the UI; Cloudinary/S3 add a vendor or IAM setup without a current need.
- **Fallback chain** (`BikeImage`): primary → gallery images of the same product → admin-supplied image → VELOX placeholder with “View photos on the official site”. Never a photo of another model. Rejected images (admin review) are skipped.
- **Galleries:** 317 extra official angles for 227 models (thumbnails on the product page). 111 candidate images were rejected because they showed related products (apparel, helmets, bottles) rather than the bike.
- **Image Health Checker** (`npm run images:health`): file present, real format by magic bytes, decodable, dimensions, low resolution, checksum, duplicates across products, gallery files, association to an existing record, and (rate-limited, robots.txt-aware, cached) whether the source page and original file still answer. Statuses: verified · pending verification · failed · unverified · licence restricted · missing (with reason).
- **Admin → Images:** coverage, reasons for missing photos, failed checks, set an image source for a missing model (validated, stored as *unverified* until reviewed), retry validation, confirm or reject an association, decision log.

### Accounts (Supabase Auth)
- Provider: **Supabase Auth** via `@supabase/ssr` + `@supabase/supabase-js` (the only new dependencies). Passwords, hashing, email verification and OAuth are handled by Supabase — no custom cryptography. PKCE flow; the code exchange happens server-side in `src/app/auth/callback/route.ts`, which only redirects to same-site paths.
- Pages: `/login`, `/signup` (full name, email, password + confirmation, terms), `/forgot-password`, `/reset-password`, `/account`, `/terms`, `/privacy`. Password reset and sign-in errors never reveal whether an address has an account.
- “Keep me signed in” (default on) keeps the session across tabs and restarts; off ends it with the browser session.
- **Guests** can use everything. Saving (garage, favourites, builds, upgrade plans) shows a short prompt: create an account, sign in, or save on this device only.
- **Sync** (`src/lib/sync.ts`): on sign-in, device data merges into the account (account wins on conflicts) and is kept in `user_collections` (one row per user per collection, owner-only RLS). Sign-out and account switches clear personal data from the device.
- **Account settings:** name, avatar, sign-in methods, password change, currency, units, language, notifications, sync status, sign out, and account deletion (type DELETE; removes the auth user and all rows via the `delete_my_account()` function).

#### Production setup
1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Supabase → Authentication → URL configuration: Site URL `https://<your-domain>`; Redirect URLs `https://<your-domain>/auth/callback` (add `http://localhost:3000/auth/callback` for development).
3. Configure SMTP (Authentication → Emails) — Supabase's built-in sender is rate-limited and meant for testing.
4. Google: in Google Cloud Console create an OAuth client (Web application). Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase → Authentication → Providers → Google and enable it.
5. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (and `NEXT_PUBLIC_AUTH_GOOGLE=false` until step 4 is done) in the hosting environment and redeploy.
6. Promote an admin with SQL: `update profiles set role = 'admin' where id = '<user id>';` (users cannot change their own role).

#### Local test stack
`scripts/local-supabase/start.sh` starts PostgreSQL 16, GoTrue and PostgREST (Docker) behind a small gateway on `:54321` with an SMTP sink, applies the schema and writes `scripts/local-supabase/.env.local-stack` (git-ignored, local-only secrets). Then:
```bash
set -a; . scripts/local-supabase/.env.local-stack; set +a
VELOX_DIST_DIR=.next-auth npm run build && VELOX_DIST_DIR=.next-auth PORT=3100 npm start &
node scripts/auth-e2e.mjs
```

### Usability
- **Bahasa Indonesia + English:** follows the saved preference, else the browser language (Indonesian browsers get Indonesian). Toggle in the header and in Account. Navigation, accounts, prompts, images, finder controls and the glossary are translated; long editorial text (hero copy, product descriptions, guides) is still English.
- **Beginner glossary** (`/glossary`, 16 terms): groupset, bottom bracket, headset, freehub, hub, thru-axle, rim depth, tyre clearance, carbon layup, mechanical vs hydraulic brakes and more, shown as dotted-underline tooltips on spec labels (hover, focus or tap).
- **Discovery:** search also matches wheelset, tyres, brakes, use and published component lists; “newest” sorts undated models last; filters combine (brand + category + budget + use + material + groupset…).
- **Currency:** IDR default. USD display uses the Bank Indonesia JISDOR rate (Rp 18.148, 4 Nov 2026), cited in the UI.
- **Security:** rate limits on `/api/mechanic` (20/min) and `/api/visualizer` (10/min), input validation with Zod, security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`).

## Previous release — official manufacturer data & Pacific integration (16 Nov 2026, part 2)

UI unchanged. Full figures: [`docs/catalog-audit.md`](docs/catalog-audit.md) (`npm run audit`).

| Measure (counted from the data) | Before | Now |
| --- | --- | --- |
| Bicycle models | 520 | 706 |
| Models with the manufacturer's own photo of that exact product | 0 | 527 (74.6%) |
| Models with a licensed (Wikimedia) photo | 2 | 2 |
| Models explicitly marked “missing image” (placeholder + official link) | 518 | 177 (all 56 Pacific-catalogue models among them) |
| Wheelsets with an official photo | 0 | 187 |
| Broken image references / same file on two records | — | 0 / 0 |

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
- unitedbike.com allows crawling (`Allow: /`, Google sitemap). 670 product URLs read; the sitemap lists each product about four times, giving **140 distinct bicycles** (MTB, kids, folding, city, BMX/dirt jump, road, E-Series e-bikes) with **official IDR prices**, category, description, geometry and **122 official product photos** (the rest reuse another model's file and are left missing rather than duplicated). 76 e-mopeds listed under “Sepeda” are excluded. United's official domain is now confirmed and recorded; earlier unverified United placeholders (Trifold, Detroit 1.0, Kyto 2.0) and the Dresden V1/V2 records — which United files as e-mopeds — were removed.

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
tests/                             Vitest (62 tests)
scripts/smoke.mjs                  Playwright end-to-end (44 flows)
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
| `npm test` | ✅ 76 / 76 — adds robots.txt matching for the health checker, open-redirect guard, callback guard, no secrets in `src/`, RLS SQL (owner-only, no self-promotion, account deletion), `.env.example` placeholders, Indonesian key coverage + language detection, JISDOR conversion, glossary terms in both languages, newest sort, part search, combined filters, galleries never shared across products |
| `npm run validate:images` | ✅ 716 registered images + 317 gallery files; formats, dimensions, checksums, no file assigned to two products |
| `npm run images:health` | ✅ 716 / 716 stored images verified (file, format, dimensions, checksum, association), 0 broken references, 0 low-resolution, 317 gallery files. Remote: 1,432 source/original URLs checked politely; 3 currently failing (2 × HTTP 429 rate-limit on polygonbikes.com, 1 × HTTP 404 on an ICAN wheel page) — the stored photos are unaffected |
| `npm run build` | ✅ |
| `npm run test:e2e` (production, guest build) | ✅ 55 / 55, no runtime errors — adds language switch, glossary tooltip, gallery switching, broken-image fallback (forced 404 → next image / placeholder), Admin → Images, saved upgrade plan + AI Mechanic history, no overflow at 390 px on 17 routes |
| `scripts/auth-e2e.mjs` (production build against the local Supabase stack) | ✅ 20 / 20 — guest browse → save prompt → sign-up validation → verification email → unconfirmed blocked → verify returns to the bike → save synced to the database → session persists → sign-out clears device → generic invalid-credential error → sign-in restores garage → password reset → neutral reset for unknown email → RLS isolation (incl. role self-promotion blocked) → second account on same device sees nothing → admin closed → Google hand-off (PKCE, callback) → account deletion → phone/tablet layout → no runtime errors |
| Google sign-in with a real Google account | ⚠️ **Not tested** — no Google OAuth credentials in this environment. Only the hand-off to the provider was verified. |

## Known limitations

- **Manufacturer photos are used without a separate licence.** They are the manufacturers' own product images, shown unaltered with credit and a link to the source page. Obtain written permission (or a press/retailer image agreement) before commercial launch; any image can be withdrawn by setting `image_license_status` to `rejected`.
- **Pacific**: the official site blocks automated access, so Pacific data comes from the search index of its official pages (unverified) and no Pacific photo could be downloaded or validated. 56 models, 27 with full component lists, 37 with official prices, 0 photos. An official CSV/JSON export from Pacific would fix both.
- Specialized, Tern, United and Pacific publish no model year on product pages: shown as “Listed 2026” or “Model year not published”.

- **Product photos:** 529 of 706 models have a verified photo; 177 show the placeholder (56 Pacific/Exotic/SYTE and 26 Polygon behind access blocks, 18 United with no usable product image, 76 editorial/researched records without an official product page, 1 not yet harvested). Admin → Images lists each with its reason.
- **Official imports cover five brands** (Canyon, Cervélo, Santa Cruz, Specialized, Tern). Trek, Giant and Cannondale sitemaps sit on hosts outside the allowed network. Polygon, Rodalink, Pacific, Scott and Orbea refuse automated access. Their data comes from search-indexed official pages (unverified) or is still missing. `docs/catalog-audit.md` lists the requested brands that still have fewer than three models (including Scott, Merida, BMC, Colnago, Orbea, Trek and Giant).
- **Thin categories:** Urban & Hybrid (5), BMX (3) and Specialty (16) are thin because the imported brands focus on road, MTB, gravel and e-bikes.
- **Prices:** imported prices are US MSRPs converted to IDR (labelled). No official Indonesian MSRP was retrievable. 67 seed bikes still carry labelled VELOX estimates.
- **Model years:** 87 seed records have unchecked model years. Specialized and Tern are marked “Listed 2026” because neither publishes a model year.
- **No live AI in this build** (no `ANTHROPIC_API_KEY` or image provider), and the Anthropic provider code has not been exercised against the live API.
- **Accounts** are implemented and tested against a local Supabase-compatible stack (GoTrue + PostgREST), not yet against a hosted Supabase project. **Google login has not been tested with real credentials.** Without Supabase variables the site runs in guest/device mode, and `/account` offers a labelled developer demo role switch (not security).
- Indonesian covers the interface, not long editorial text or product descriptions.
- Remote image-source checks may report hosts as unreachable from restricted networks; that does not affect the self-hosted files.

## Recommended next steps

1. **Product photography:** ask manufacturers and Indonesian distributors (Polygon / Rodalink, Pacific, United) for written permission or a press-image feed, then record each image with `image_license_status: "licensed"`. The registry, validation and UI are ready.
2. **Indonesian data:** obtain an official product export (CSV/JSON) from Polygon, Pacific and United and run it through the admin import → review queue, rather than scraping sites that refuse automated access.
3. **More official imports:** allow the sitemap hosts for Trek, Giant and Cannondale, and add Scott, Merida, Orbea, BMC and Cube when reachable. The harvesters follow the same pattern as the five done.
4. Review and promote the 26 researched records, and replace the 67 remaining seed price estimates with sourced prices or “Not Available”.
5. Set `ANTHROPIC_API_KEY` and an image provider, then evaluate AI Mechanic and the Visualizer on real inputs.
6. Connect a hosted Supabase project, configure SMTP and Google OAuth (see *Production setup*), then test Google sign-in with a real account.
7. Translate long-form editorial text into Bahasa Indonesia.
