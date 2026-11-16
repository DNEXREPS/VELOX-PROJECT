# VELOX catalogue audit

Generated 2026-11-16 by `npm run audit` from the live data files. Every figure below is a count of actual records.

## Totals
| Measure | Count |
|---|---|
| Brands | 199 |
| Brands with at least one bicycle model | 44 |
| Bicycle models (model × year × variant records) | 520 |
| — imported from official manufacturer pages | 407 |
| — researched from cited sources (unverified until reviewed) | 26 |
| — earlier editorial seed records (unverified) | 87 |
| Verified model records (Verified Official / Distributor / Cross-Verified) | 407 |
| Models with a verified, licensed product photo | 2 |
| Models without a verified photo (designed placeholder + official link) | 518 |
| Models with unverified specifications | 113 |
| Component products (all types) | 588 |
| Wheelset products | 251 |
| — wheelsets imported from official manufacturer stores | 204 |

## Bicycle models by category
| Category | Models | Official imports | Verified photos |
|---|---|---|---|
| Road | 157 | 122 | 1 |
| MTB | 126 | 97 | 1 |
| Gravel | 72 | 65 | 0 |
| Urban & Hybrid | 5 | 0 | 0 |
| Electric | 114 | 97 | 0 |
| Folding | 27 | 19 | 0 |
| BMX | 3 | 0 | 0 |
| Specialty | 16 | 7 | 0 |

## Image audit
| Check | Previous release (63dd2f2) | Now |
|---|---|---|
| Bike records pictured | 94 | 520 |
| Records shown with a photo shared by other models | 91 | 0 |
| Most models sharing one photo | 16 | 1 |
| Records shown with category / cyclist photography instead of the product | 94 | 0 |
| Records with a verified photo of the actual model | 0 | 2 |
| Same image file assigned to different models | — | 0 |

Broken or wrong image references fixed: **94** records that showed category photography now show either their own verified photo or the VELOX placeholder. No product image URL is hot-linked; `npm run validate:images` checks files, formats, dimensions, checksums and duplicate assignments.

## Duplicates
| Check | Found |
|---|---|
| Duplicate listings removed during official import (colour / size pages of the same model-year) | 65 |
| Wheelset listings rejected during import (regional duplicates, pre-orders, bundles, outlet one-offs and non-wheelset listings) | 50 |
| Bike records sharing brand + model + year + variant | 0 |
| Bike records sharing the same official product URL | 0 |
| Component records sharing manufacturer + name + model year | 0 |

## Prices
| Price basis | Bikes | Components |
|---|---|---|
| Published manufacturer price (MSRP) | 362 | 204 |
| — of which published in USD and converted to IDR (labelled) | 362 | 204 |
| Retailer / distributor price | 0 | 0 |
| VELOX estimate (seed data, labelled “Estimated”) | 67 | 321 |
| No price (shown as Not Available) | 91 | 63 |

USD prices are converted at Bank Indonesia JISDOR (4 Nov 2026): Rp 18,148 per USD ([source](https://www.bi.go.id/en/publikasi/lelang/non-operasi-moneter/Pages/Swap-Hedging-of-External-Funding,-November-4th-2026.aspx)). Converted figures are never presented as Indonesian prices.

## Model years
| Basis | Records |
|---|---|
| Manufacturer model year (official data) | 240 |
| Listed in the official 2026 range — manufacturer publishes no model year (Specialized, Tern) | 167 |
| Researched records (year from the cited source) | 26 |
| Seed records whose model year has not been checked | 87 |

## Specification completeness — official imports
| Field | Filled | Not Available |
|---|---|---|
| frameMaterial | 297 | 110 |
| groupset | 339 | 68 |
| drivetrain | 174 | 233 |
| brakes | 362 | 45 |
| wheelset | 353 | 54 |
| tires | 324 | 83 |
| wheelSize | 179 | 228 |
| weightKg | 397 | 10 |

Fields are filled only when the manufacturer publishes them; nothing is inferred.

## Coverage by brand (bicycle models)
| Brand | Models |
|---|---|
| Specialized | 134 |
| Canyon | 106 |
| Santa Cruz | 83 |
| Cervélo | 57 |
| Tern | 45 |
| Polygon | 28 |
| Trek | 6 |
| Giant | 6 |
| United Bike | 5 |
| Cannondale | 5 |
| Pacific | 3 |
| Surly | 3 |
| Merida | 2 |
| Scott | 2 |
| Kona | 2 |
| Commencal | 2 |
| Brompton | 2 |
| Quick Pro | 2 |
| Van Raam | 2 |
| Element | 1 |
| Thrill | 1 |
| Wimcycle | 1 |
| Java | 1 |
| Fnhon | 1 |
| Bianchi | 1 |
| Orbea | 1 |
| Pinarello | 1 |
| Salsa | 1 |
| Dahon | 1 |
| Haro | 1 |
| Riese & Müller | 1 |
| Cube | 1 |
| Bombtrack | 1 |
| Ridley | 1 |
| Pardus | 1 |
| Tavelo | 1 |
| Elves | 1 |
| Winspace | 1 |
| SEKA | 1 |
| Fuji | 1 |
| HP Velotechnik | 1 |
| Woom | 1 |
| Strider | 1 |
| Electra | 1 |

## Requested brands with thin coverage
Brands named in the brief that still have fewer than three model records — the next research targets:

- Scott: 2
- Merida: 2
- BMC: 0
- Pinarello: 1
- Colnago: 0
- Bianchi: 1
- Orbea: 1
- Cube: 1
- Fuji: 1
- Felt: 0
- Ridley: 1
- Wilier: 0
- Factor: 0
- Look: 0
- Time: 0
- Sunpeed: 0
- Java: 1
- SAVA: 0
- XDS: 0
- Pardus: 1
- Twitter: 0
- Winspace: 1
- SEKA: 1
- Elves: 1
- Tavelo: 1
- Yeti: 0
- Pivot: 0
- Thrill: 1
- Marin: 0
- Norco: 0
- Kona: 2
- Commencal: 2
- Transition: 0
- Rocky Mountain: 0
- GT: 0
- Trinx: 0
- Brompton: 2
- Dahon: 1
- Element: 1
- Fnhon: 1
- Crius: 0 (brand record missing)

## Sources that could not be read automatically
- polygonbikes.com, rodalink.com, pacific-bike.com, scott-sports.com, orbea.com — refuse automated access (HTTP 403); researched via search-indexed official pages instead
- trekbikes.com, giant-bicycles.com, cannondale.com — product sitemaps hosted on hosts outside the allowed network
- enve.com, reservewheels.com, farsports.com, superteamwheels.com, zipp.com — redirect to hosts outside the allowed network
