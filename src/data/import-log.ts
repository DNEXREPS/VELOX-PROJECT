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
  /** records removed because the manufacturer's own photo showed they were the same product as another record */
  mergedDuplicates: [
    { removed: "canyon-grl-cf-slx-7-di-27-s-bk-wh-2027", keptAs: "canyon-grail-cf-slx-7-di2-2027", evidence: "identical official product image (outlet listing of the same bike)" },
    { removed: "canyon-aro-cf-slx-7-axs-27-s-wh-2027", keptAs: "canyon-aeroad-cf-slx-7-axs-2027", evidence: "identical official product image (outlet listing of the same bike)" },
  ],
  images: {
    method: "Image declared for the exact product on the manufacturer's own page (schema.org Product.image / og:image / store feed); downloaded, validated (HTTP 200, image/*, decodes, ≥300 px), de-duplicated by SHA-256, stored as local WebP, reviewed on contact sheets.",
    adapters: ["scripts/research/official_images.py (Canyon, Cervélo, Santa Cruz, Specialized, Tern)", "scripts/research/united.py (United Bike)", "scripts/research/wheel_images.py (Hunt, ICAN, Winspace/Lún)"],
  },
  pacific: { site: "https://pacific-bike.com/", access: "Cloudflare block (HTTP 403) on every path for automated clients, incl. robots.txt, sitemaps and /wp-json — not circumvented", method: "Official product URLs and their text read from the search index; records kept unverified" },
  blocked: [
    "polygonbikes.com, rodalink.com, pacific-bike.com, scott-sports.com, orbea.com — refuse automated access (HTTP 403); researched via search-indexed official pages instead",
    "merida-bikes.com — readable, but product specs load separately and images sit on merida-cdn.m-c-g.net (outside the allowed network); adapter not yet built",
    "web.archive.org — refused by the environment's network policy, so archived copies of blocked official pages could not be used",
    "trekbikes.com, giant-bicycles.com, cannondale.com — product sitemaps hosted on hosts outside the allowed network",
    "enve.com, reservewheels.com, farsports.com, superteamwheels.com, zipp.com — redirect to hosts outside the allowed network",
  ],
  /** measured on the previous release (commit 63dd2f2) */
  imageBaseline: { bikes: 94, distinctPhotos: 15, recordsOnSharedPhotos: 91, maxModelsPerPhoto: 16, withProductPhoto: 0 },
  usdIdrRate: { rate: 18148, source: "Bank Indonesia JISDOR (4 Nov 2026)", url: "https://www.bi.go.id/en/publikasi/lelang/non-operasi-moneter/Pages/Swap-Hedging-of-External-Funding,-November-4th-2026.aspx" },
} as const;
