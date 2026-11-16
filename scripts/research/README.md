# Research & import scripts (2026-11-16)

Python 3 scripts used to build `src/data/bikes.official.ts`, `src/data/wheels.official.ts` and the
product-image registry. They read only public pages, check `robots.txt` before every fetch, identify
themselves as `VELOX-catalog-research/1.0`, wait at least 1.2 s between requests, and never work around
an access refusal (sites that answer 403 are skipped and listed in `src/data/import-log.ts`).

Run them from a scratch directory (they write JSON next to themselves):

| Step | Script | Output |
| --- | --- | --- |
| Sitemaps → product URLs | `sitemap.py` (helper), inline selection | `canyon_bikes_urls.json`, `cervelo_urls.json` |
| Canyon / Cervélo product pages (schema.org) | `harvest.py <urls.json> <out.json>` | `canyon.json`, `cervelo.json` |
| Santa Cruz store feed + embedded specs | `shopify.py https://www.santacruzbicycles.com santacruz_all.json`, `sc_harvest.py` | `santacruz.json` |
| Specialized / Tern spec tables | `harvest2.py specialized` · `harvest2.py tern` | `specialized.json`, `tern.json` |
| Wheelset store feeds (Hunt, ICAN, Winspace) | `wheels.py` | `wheels.json` |
| Normalise → VELOX records | `convert.py`, `convert_wheels.py` | `official.json`, `wheels_official.json` |
| Wikimedia Commons candidates + contact sheet | `commons.py`, `sheet.py`, `thumburl.py` | review sheet; photos are attached only after a person checks them |

Rules applied in the converters: fill a field only when the manufacturer publishes it; never infer
wheel size, frame material or model year; record the official URL and retrieval date on every record;
keep USD prices as published and convert to IDR at the cited Bank Indonesia JISDOR rate.
Generated TypeScript files should be regenerated, not hand-edited.
