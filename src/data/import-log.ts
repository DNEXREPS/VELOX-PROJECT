/**
 * Record of the 2026-11-16 official-data import and image overhaul, used by the catalogue audit.
 * Counts are produced by the import scripts, not estimated.
 */
export const IMPORT_LOG = {
  date: "2026-11-16",
  bikes: [
    { source: "Canyon — official US product pages (schema.org)", url: "https://www.canyon.com/en-us/", listingsRead: 163, duplicateListingsDropped: 59 },
    { source: "Cervélo — official US product pages (schema.org)", url: "https://www.cervelo.com/", listingsRead: 56, duplicateListingsDropped: 0 },
    { source: "Santa Cruz — official product pages and store feed", url: "https://www.santacruzbicycles.com/", listingsRead: 85, duplicateListingsDropped: 3 },
    { source: "Specialized — official US product pages", url: "https://www.specialized.com/us/en", listingsRead: 127, duplicateListingsDropped: 3 },
    { source: "Tern — official product pages", url: "https://www.ternbicycles.com/en/bikes", listingsRead: 55, duplicateListingsDropped: 0 },
  ],
  wheels: { source: "Hunt, ICAN, Winspace/Lún — official store product feeds", listingsRead: 254, rejected: 50, rejectedReason: "regional duplicates, pre-orders, bundles, outlet one-offs and non-wheelset listings" },
  blocked: [
    "polygonbikes.com, rodalink.com, pacific-bike.com, scott-sports.com, orbea.com — refuse automated access (HTTP 403); researched via search-indexed official pages instead",
    "trekbikes.com, giant-bicycles.com, cannondale.com — product sitemaps hosted on hosts outside the allowed network",
    "enve.com, reservewheels.com, farsports.com, superteamwheels.com, zipp.com — redirect to hosts outside the allowed network",
  ],
  /** measured on the previous release (commit 63dd2f2) */
  imageBaseline: { bikes: 94, distinctPhotos: 15, recordsOnSharedPhotos: 91, maxModelsPerPhoto: 16, withProductPhoto: 0 },
  usdIdrRate: { rate: 18148, source: "Bank Indonesia JISDOR (4 Nov 2026)", url: "https://www.bi.go.id/en/publikasi/lelang/non-operasi-moneter/Pages/Swap-Hedging-of-External-Funding,-November-4th-2026.aspx" },
} as const;
