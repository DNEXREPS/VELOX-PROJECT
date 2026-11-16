import type { Brand, BrandKind, CategoryId, Confidence, Region, SourceRef, VerificationStatus } from "@/lib/types";
import { DEMO_PROVENANCE } from "./provenance";

/**
 * Brand directory.
 *
 * Two kinds of record live here:
 *  1. RESEARCHED — facts gathered in the 2026-11-16 web research pass. Every fact carries its
 *     sources. Status is "cross-verified" only where independent sources agree; single-source or
 *     retailer-sourced facts stay "unverified" with a confidence level and reviewer notes.
 *     Where sources conflicted, the field is left null and the conflict is recorded in notes.
 *  2. SEED — editorial seed records not yet researched (status unverified, demo).
 *
 * Nothing here claims a company manufactures what it only distributes or rebrands: see `kinds`.
 */

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const RESEARCHED_ON = "2026-11-16";

interface Def {
  name: string;
  country: string;
  founded?: number | null;
  website?: string | null;
  categories?: CategoryId[];
  kinds: BrandKind[];
  description: string;
  hq?: string | null;
  parent?: string | null;
  color?: string;
  /** researched records */
  sources?: Array<[label: string, url: string, type: SourceRef["type"]]>;
  status?: VerificationStatus;
  confidence?: Confidence;
  notes?: string;
}

const src = (sources: Def["sources"]): SourceRef[] => (sources ?? []).map(([label, url, type]) => ({ label, url, type, retrievedAt: RESEARCHED_ON }));

function toBrand(d: Def, region: Region): Brand {
  const slug = slugify(d.name);
  const researched = !!d.sources?.length;
  return {
    id: slug,
    slug,
    name: d.name,
    country: d.country,
    region,
    founded: d.founded ?? null,
    website: d.website ?? null,
    description: d.description,
    history: null,
    categories: d.categories ?? [],
    kinds: d.kinds,
    parentCompany: d.parent ?? null,
    headquarters: d.hq ?? null,
    mark: { color: d.color ?? "#C5F36A" },
    logoUrl: null,
    provenance: researched
      ? { status: d.status ?? "unverified", sources: src(d.sources), updatedAt: RESEARCHED_ON, confidence: d.confidence ?? "medium", reviewerNotes: d.notes ?? null, originalManufacturer: d.parent ?? null }
      : { ...DEMO_PROVENANCE, confidence: "low", reviewerNotes: d.notes ?? "Editorial seed — not yet researched against official sources." },
  };
}

/* =============================== INDONESIA =============================== */

const INDONESIA: Def[] = [
  {
    name: "Polygon", country: "Indonesia", founded: 1989, website: "https://www.polygonbikes.com", categories: ["road", "mtb", "gravel", "urban", "electric", "bmx", "other"], kinds: ["bicycles", "e-bikes", "oem-manufacturer"],
    hq: "Sidoarjo, East Java", parent: "PT Insera Sena", color: "#3B82F6", status: "cross-verified", confidence: "high",
    description: "Indonesia's best-known bicycle brand: the house brand of manufacturer PT Insera Sena in Sidoarjo, East Java. It started by producing export bicycles and in 1997 launched the Rodalink retail chain.",
    sources: [["Polygon — History (official)", "https://www.polygonbikes.com/history/", "official-website"], ["Wikipedia — Polygon Bikes", "https://en.wikipedia.org/wiki/Polygon_Bikes", "publication"], ["IDX Channel — owner profile", "https://www.idxchannel.com/inspirator/siapa-pemilik-polygon-brand-sepeda-produksi-anak-bangsa", "publication"]],
    notes: "1989 is the brand founding date; PT Insera Sena's incorporation date was not found.",
  },
  {
    name: "United Bike", country: "Indonesia", founded: 1988, website: null, categories: ["road", "mtb", "gravel", "urban", "folding", "electric", "bmx", "other"], kinds: ["bicycles", "e-bikes"],
    hq: "Tangerang Selatan, Banten", parent: "PT Terang Dunia Internusa Tbk (IDX: UNTD)", color: "#EF4444", status: "cross-verified", confidence: "medium",
    description: "Bicycle and electric-mobility brand of PT Terang Dunia Internusa, listed on the Indonesia Stock Exchange. The group also sells United E-Motor electric motorcycles.",
    sources: [["Medcom — United service network", "https://www.medcom.id/otomotif/motor/Wb7QqlPK-bengkel-united-terima-servis-sepeda-sampai-motor-listrik", "publication"], ["Kontan — PT Terang Dunia Internusa Tbk", "https://emiten.kontan.co.id/perusahaan/943/PT-Terang-Dunia-Internusa-Tbk", "publication"], ["StockAnalysis — UNTD company profile", "https://stockanalysis.com/quote/idx/UNTD/company/", "publication"]],
    notes: "Founding year 1988 refers to the company. Official domain unresolved: sources point to terangduniainternusa.com and unitedbike.com — left empty until confirmed.",
  },
  {
    name: "Pacific", country: "Indonesia", founded: 1995, website: "https://pacific-bike.com", categories: ["mtb", "road", "urban", "folding", "bmx", "electric", "other"], kinds: ["bicycles", "e-bikes"],
    parent: "PT Roda Pacific Mandiri", color: "#F59E0B", status: "unverified", confidence: "medium",
    description: "Indonesian brand produced by PT Roda Pacific Mandiri since 1995, focused on affordable mountain, road, city, folding and children's bicycles, and recently electric motorcycles.",
    sources: [["Fortune IDN — Pacific Bike enters e-motorcycles", "https://www.fortuneidn.com/business/ekarina/bidik-segmen-menengah-bawah-pacific-bike-pede-masuk-motor-listrik", "publication"], ["Kumparan — Pacific road bikes", "https://kumparan.com/info-produk/5-sepeda-roadbike-pacific-terbaik-2024-23S8tnzOZz6", "publication"]],
    notes: "Website pacific-bike.com cited by secondary sources only; not opened directly. Not to be confused with Taiwan's Pacific Cycles.",
  },
  {
    name: "Element", country: "Indonesia", founded: 2008, website: null, categories: ["folding", "urban", "mtb", "road", "electric", "other"], kinds: ["bicycles"],
    hq: "Kendal, Central Java", color: "#10B981", status: "unverified", confidence: "medium",
    description: "Bicycle manufacturer from Kendal, Central Java, operating since 2008 and best known for folding bikes such as the Ecosmo, plus urban, mountain and children's bikes.",
    sources: [["Bisnis.com — local folding bikes", "https://ekonomi.bisnis.com/read/20210606/98/1401850/juni-2021-sepeda-lipat-lokal-turun-harga-saatnya-beli", "publication"], ["Bike Insights — Element Bike", "https://bikeinsights.com/brands/6346bcd6d782b80023212874-element-bike", "publication"]],
    notes: "Domain conflict: elementbike.id vs elementmtb.com — left empty. Location/founding from a single article.",
  },
  {
    name: "Wimcycle", country: "Indonesia", founded: null, website: null, categories: ["mtb", "urban", "bmx", "folding", "other"], kinds: ["bicycles"],
    hq: "Driyorejo, Gresik, East Java", color: "#14B8A6", status: "unverified", confidence: "medium",
    description: "Long-established Indonesian bicycle maker based in Gresik, East Java, producing mountain, city, BMX and children's bikes, sold through dealers including Rodalink.",
    sources: [["Rodalink — Wimcycle product listing", "https://www.rodalink.com/id/wimcycle-sepeda-gunung-storm-aegyo-series-734525.html", "authorized-distributor"], ["detikOto — bicycle made in Gresik", "https://oto.detik.com/berita/d-5662751/sepeda-buatan-gresik-berlaga-di-olimpiade-tokyo-2020", "publication"]],
    notes: "Earlier seed placed it in Surabaya — research points to Gresik.",
  },
  {
    name: "Thrill", country: "Indonesia", founded: null, website: null, categories: ["mtb", "road", "gravel", "bmx"], kinds: ["bicycles"],
    hq: "Gresik, East Java", color: "#F97316", status: "unverified", confidence: "low",
    description: "Indonesian performance-oriented brand for mountain, road and BMX bikes.",
    sources: [["Suara — Thrill bikes", "https://www.suara.com/lifestyle/2026/08/06/095643/6-sepeda-thrill-paling-murah-terbaik-untuk-jalan-perkotaan-hingga-jalur-pegunungan?page=all", "publication"], ["detikOto — bicycle made in Gresik", "https://oto.detik.com/berita/d-5662751/sepeda-buatan-gresik-berlaga-di-olimpiade-tokyo-2020", "publication"]],
    notes: "Sources conflict on the producing company (PT Indonesia Bike Works vs. a Wimcycle-related brand). No official site found.",
  },
  { name: "Exotic", country: "Indonesia", categories: ["mtb", "urban", "folding", "electric", "other"], kinds: ["bicycles"], color: "#A855F7", description: "Indonesian value-focused brand offering mountain, city and children's bicycles.", notes: "2026-11-16 research found only marketplace listings — no official brand information." },
  { name: "Genio", country: "Indonesia", categories: ["urban", "folding", "mtb", "other"], kinds: ["bicycles"], color: "#06B6D4", description: "Indonesian brand producing city, folding and recreational bicycles." },
  { name: "Aviator", country: "Indonesia", categories: ["urban", "mtb", "other"], kinds: ["bicycles"], color: "#84CC16", description: "Indonesian bicycle brand with recreational, city and children's models." },
  { name: "London Taxi", country: "Indonesia", categories: ["folding", "urban", "other"], kinds: ["bicycles"], color: "#EAB308", description: "Indonesian brand known for compact folding bikes and classic-styled city bicycles." },
  { name: "Evergreen", country: "Indonesia", categories: ["urban", "mtb", "other"], kinds: ["bicycles"], color: "#22C55E", description: "Indonesian brand making affordable everyday, mountain and children's bicycles." },
  { name: "Atlantis", country: "Indonesia", categories: ["urban", "mtb", "bmx", "other"], kinds: ["bicycles"], color: "#0EA5E9", description: "Indonesian brand with entry-level mountain, city, BMX and kids' bicycles." },
  { name: "Avand", country: "Indonesia", categories: ["folding", "urban", "electric"], kinds: ["bicycles"], color: "#E879F9", description: "Indonesian brand focused on folding and compact urban bicycles." },
  { name: "Selis", country: "Indonesia", categories: ["electric"], kinds: ["e-bikes"], color: "#4ADE80", description: "Indonesian electric-mobility brand producing electric bicycles for urban use." },
];

/* ======================= CHINA · TAIWAN · ASIA (researched) ======================= */

const ASIA_RESEARCHED: Def[] = [
  {
    name: "Pardus", country: "China", website: "https://www.pardusbicycle.com", categories: ["road", "gravel", "other"], kinds: ["bicycles", "frames", "oem-manufacturer"], parent: "Taishan Sports Industry Group", status: "cross-verified", confidence: "high", color: "#DC2626",
    description: "Carbon road, track and triathlon bike brand of Chinese carbon manufacturer Taishan Sports, which also makes frames for other brands. Supplier to the Chinese national team since 2016 and announced as Team TotalEnergies' bike sponsor from 2027.",
    sources: [["BikeRadar — TotalEnergies switches to Pardus", "https://www.bikeradar.com/news/team-totalenergies-trades-cube-for-pardus-as-another-chinese-brand-joins-pro-cycling-peloton", "publication"], ["road.cc — Pardus European push", "https://road.cc/tech-news/chinas-pardus-makes-european-push-with-sub-4500-6-7kg-carbon-road-bike", "publication"], ["Pardus — About us (official)", "https://www.pardusbicycle.com/about-us", "official-website"]],
  },
  {
    name: "Tavelo", country: "China", founded: 2023, website: "https://tavelo.cc", categories: ["road", "gravel"], kinds: ["bicycles", "frames"], hq: "Xiamen, Fujian", status: "unverified", confidence: "medium", color: "#0EA5E9",
    description: "Chinese carbon road and gravel brand (Arow, Arden, Grow, Wild) that grew out of OEM manufacturing for other brands.",
    sources: [["Velo — Tavelo Grow launch", "https://velo.outsideonline.com/gravel/gravel-gear/tavelo-grow-launch/", "publication"], ["Tavelo — About us (official)", "https://tavelo.cc/pages/about-us", "official-website"], ["Bike Insights — 2024 Tavelo Arow", "https://bikeinsights.com/bikes/66832d20b59776001b1606ba-tavelo-arow", "publication"]],
    notes: "Founding year and Xiamen HQ come from a retailer listing — treat as medium confidence.",
  },
  {
    name: "Quick Pro", country: "China", website: "https://www.quickprousa.com", categories: ["road", "mtb", "other"], kinds: ["frames", "bicycles"], hq: "Huizhou, Guangdong", parent: "Quick (founded 2018)", status: "unverified", confidence: "medium", color: "#7C3AED",
    description: "Premium carbon line of Chinese company Quick: AR:ONE aero/all-round, ER:ONE aero, SR:ONE climbing and TT:ONE time-trial framesets, plus a Gravity downhill series.",
    sources: [["Quick Pro USA — AR:ONE", "https://www.quickprousa.com/products/ar-one-105-di2", "official-website"], ["Bike Insights — 2024 Quick Pro AR:ONE", "https://bikeinsights.com/bike-geometries/68f539f67d8930001b5bbfd9-2024-quick-pro-arone-base-m", "publication"]],
    notes: "Frame weights differ between listings (AR:ONE 690 g vs 799 g) — not recorded until confirmed on the official spec sheet.",
  },
  {
    name: "SEKA", country: "China", categories: ["road", "gravel"], kinds: ["frames", "bicycles"], status: "cross-verified", confidence: "medium", color: "#111827",
    description: "Higher-end Chinese carbon brand behind the Spear aero frame, the Exceed RDC and the ExAero / ExAero GR.",
    sources: [["Cyclingnews — SEKA Spear review", "https://www.cyclingnews.com/bikes/road/seka-spear-review/", "publication"], ["Cycling Weekly — SEKA ExAero GR review", "https://www.cyclingweekly.com/reviews/frames/seka-exaero-gr-review-can-this-highly-in-demand-chinese-gravel-frame-compete-with-the-established-favourites", "publication"]],
    notes: "No official website found in results; Cyclingnews wind-tunnel test found the Spear fast but flexible.",
  },
  {
    name: "Elves", country: "China", categories: ["road"], kinds: ["frames", "bicycles"], status: "cross-verified", confidence: "medium", color: "#16A34A",
    description: "Carbon road brand (Falath, Vanyar, Eglath) selling direct and through distributors; reviewers praise paint finish and value.",
    sources: [["BikeRadar — Elves Falath EXP", "https://www.bikeradar.com/news/elves-falath-exp", "publication"], ["Cycling Weekly — Falath EXP Sport review", "https://www.cyclingweekly.com/reviews/road-bikes/elves-falath-exp-sport-review-an-aero-bike-that-brings-performance-and-value-to-the-people", "publication"]],
    notes: "Sources conflict on origin (developed in Taiwan, made in China) and founding year — left empty.",
  },
  {
    name: "Sunpeed", country: "China", founded: 2012, categories: ["road"], kinds: ["bicycles"], hq: "Shenzhen, Guangdong", parent: "Shenzhen Subite Bicycle Industry Development Co., Ltd.", status: "unverified", confidence: "medium", color: "#F59E0B",
    description: "Shenzhen road-bike brand emphasising aerodynamics; the SUNPEED trademark is held by Shenzhen Subite Bicycle Industry Development.",
    sources: [["Made-in-China — Sunpeed company", "https://fr.made-in-china.com/co_sunpeed/", "publication"], ["Trademark record — SUNPEED", "https://markinton.com/trademark/sunpeed-90088128", "publication"]],
  },
  {
    name: "TRINX", country: "China", founded: 2006, categories: ["road", "mtb", "urban", "folding"], kinds: ["bicycles", "oem-manufacturer"], hq: "Guangzhou, Guangdong", parent: "Guangzhou Trinity Cycles Co., Ltd.", status: "cross-verified", confidence: "medium", color: "#EA580C",
    description: "Own brand of Guangzhou Trinity Cycles, an export-focused manufacturer that also builds bikes for other brands. Widely sold across Southeast Asia.",
    sources: [["Wikipedia — Trinx Bikes", "https://www.wikipedia.org/wiki/Trinx_Bikes", "publication"], ["Global Sources — Trinx company profile", "https://gdtrinx.manufacturer.globalsources.com/company-profile_6008823577740.htm", "publication"]],
    notes: "2006 = launch of the TRINX brand; the parent company's founding is given as 1990 or 1992 by different sources.",
  },
  {
    name: "XDS", country: "China", founded: 1995, categories: ["road", "mtb", "gravel", "urban", "electric"], kinds: ["bicycles", "oem-manufacturer"], hq: "Shenzhen, Guangdong", parent: "Shenzhen Xidesheng Bicycle Co., Ltd.", status: "cross-verified", confidence: "medium", color: "#2563EB",
    description: "Large vertically integrated Shenzhen manufacturer producing for many brands and under its own name, including the X-LAB performance range.",
    sources: [["Cycling Weekly — X-Lab and XDS", "https://www.cyclingweekly.com/news/x-lab-the-bike-brand-no-one-saw-coming-and-the-secret-manufacturing-powerhouse-behind-it", "publication"], ["Bikerumor — XDS X-LAB global range", "https://bikerumor.com/xds-launches-9-bike-x-lab-global-range-with-serious-prices/", "publication"], ["XDS Australia — heritage", "https://www.xdsbicycles.com.au/pages/heritage", "authorized-distributor"]],
    notes: "Production volume figures are company-stated and not recorded.",
  },
  {
    name: "Winspace", country: "China", categories: ["road", "gravel", "other"], kinds: ["frames", "bicycles", "wheels", "components"], status: "cross-verified", confidence: "medium", color: "#0891B2",
    description: "Chinese carbon frame and bike brand (M6, G5 aero gravel) with in-house wheel sub-brand Lún.",
    sources: [["BikeRadar — Winspace G5", "https://www.bikeradar.com/news/winspace-g5-aero-gravel-bike", "publication"], ["Rouleur — Winspace M6", "https://www.rouleur.cc/blogs/desire-journal/winspace", "publication"]],
    notes: "Founding year conflicts (2008 vs 2011) — left empty.",
  },
  {
    name: "Lún", country: "China", categories: ["road", "gravel"], kinds: ["wheels"], parent: "Winspace", status: "cross-verified", confidence: "medium", color: "#0891B2",
    description: "Winspace's in-house carbon wheel brand (HYPER series, Road Series); 'Lún' means 'wheel' in Chinese.",
    sources: [["Cyclists Hub — Lún Hyper Light", "https://www.cyclistshub.com/lun-hyper-light-wheels/", "publication"], ["Velofanatics — Winspace", "https://www.velofanatics.com/chinese-carbon-road-bike-brand-winspace/", "publication"]],
  },
  {
    name: "ICAN", country: "China", founded: 2009, categories: ["road", "gravel", "mtb"], kinds: ["frames", "wheels"], hq: "Shenzhen, Guangdong", status: "unverified", confidence: "medium", color: "#DB2777",
    description: "Early Chinese carbon wheel and frame brand from Shenzhen; also owns road-frame brand TRIAERO.",
    sources: [["ctyeh — China carbon wheels showdown", "https://ctyeh.com/articles/588?lang=en", "publication"], ["Cyclists Hub — best Chinese carbon wheels", "https://www.cyclistshub.com/best-chinese-carbon-wheels", "publication"]],
  },
  {
    name: "Elitewheels", country: "China", categories: ["road", "gravel", "mtb"], kinds: ["wheels"], status: "cross-verified", confidence: "medium", color: "#FACC15",
    description: "Large Chinese carbon-wheel maker (Drive, Edge, Velo series) known for carbon-spoke wheels at accessible prices.",
    sources: [["Cyclingnews — Elitewheels", "https://www.cyclingnews.com/features/elitewheels-offers-you-top-wheel-tech-at-a-bargain-price", "publication"], ["Bikerumor — Elitewheels", "https://bikerumor.com/elitewheels-is-changing-the-way-we-think-about-carbon-wheels", "publication"]],
    notes: "City conflicts between sources — headquarters left empty.",
  },
  {
    name: "Yoeleo", country: "China", categories: ["road", "gravel"], kinds: ["wheels", "frames", "bicycles"], status: "unverified", confidence: "medium", color: "#9333EA",
    description: "Chinese brand selling carbon wheels (e.g. SAT series), framesets and complete bikes.",
    sources: [["Cyclists Hub — Chinese carbon wheels", "https://www.cyclistshub.com/chinese-carbon/chinese-wheels/", "publication"]],
  },
  {
    name: "Farsports", country: "China", categories: ["road", "gravel"], kinds: ["wheels", "components", "oem-manufacturer"], hq: "Xiamen, Fujian", parent: "Xiamen Far Sports Industry and Trade Co., Ltd.", status: "cross-verified", confidence: "medium", color: "#475569",
    description: "Xiamen carbon specialist that moved from OEM manufacturing to its own brand of aero wheelsets, bars and stems.",
    sources: [["ctyeh — Farsports profile", "https://ctyeh.com/articles/583?lang=en", "publication"], ["Velofanatics — Farsports", "https://www.velofanatics.com/farsports-carbon-wheels-brand-review/", "publication"]],
  },
  {
    name: "Light Bicycle", country: "China", website: "https://www.lightbicycle.com", categories: ["road", "gravel", "mtb"], kinds: ["wheels", "frames", "components"], hq: "Xiamen, Fujian", parent: "Xiamen LightCarbon Composite Technology Co., Ltd.", status: "cross-verified", confidence: "medium", color: "#64748B",
    description: "Xiamen maker of carbon rims, custom-built wheels and frames, offering a 2-year warranty on carbon frames, rims and wheels.",
    sources: [["LightCarbon — About (official)", "https://lightcarbon.com/about-lc_d1", "official-website"], ["Light Bicycle — wheel product page (official)", "https://www.lightbicycle.com/65mm-depth-Hand-built-700C-carbon-25-85mm-wide-hooked-road-bicycle-wheels-for-tubeless-compatible.html", "official-website"]],
  },
  {
    name: "Superteam", country: "China", categories: ["road", "gravel"], kinds: ["wheels", "oem-manufacturer"], status: "cross-verified", confidence: "medium", color: "#B45309",
    description: "Chinese carbon-wheel brand sold mainly through online marketplaces; also an OEM producer.",
    sources: [["road.cc — Superteam feature", "https://road.cc/content/feature/how-strong-chinese-road-bike-wheels-so-much-cheaper-superteam-310849", "publication"], ["Ride On — Superteam Classic 38 tested", "https://rideonmagazine.com.au/tested-superteam-classic-series-38mm-carbon-wheels/", "publication"]],
  },
  {
    name: "UPVINE", country: "China", categories: ["road", "gravel"], kinds: ["wheels"], hq: "Hangzhou, Zhejiang", parent: "Hangzhou Up Vine Bicycle Co., Ltd.", status: "cross-verified", confidence: "medium", color: "#0D9488",
    description: "Chinese wheel maker since 2016, moving from aluminium wheels and hubs to carbon (Pro+, Ultra); sub-brand INERTIA.",
    sources: [["Cyclists Hub — UPVINE Pro+ 2 review", "https://www.cyclistshub.com/upvine-pro-plus-2-review/", "publication"], ["Eurobike — Hangzhou Up Vine exhibitor", "https://eurobike.com/frankfurt/en/exhibitor-search.detail.html/hangzhou-up-vine-bicycle-coltd/mf_1_0052819718_4550702_10000795202501.html", "manufacturer-announcement"]],
  },
  {
    name: "Nepest", country: "China", categories: ["road"], kinds: ["wheels"], hq: "Xiamen, Fujian", status: "cross-verified", confidence: "medium", color: "#4F46E5",
    description: "Xiamen carbon wheel maker; the Nova wheelset uses titanium T-head spokes and a 3-year warranty.",
    sources: [["Hambini — Nepest Nova review", "https://www.hambini.com/tag/nova", "publication"], ["Cyclists Hub — Nepest Nova review", "https://www.cyclistshub.com/nepest-nova-review/", "publication"]],
  },
  {
    name: "XMCS", country: "China", categories: ["road"], kinds: ["wheels"], hq: "Xiamen, Fujian", parent: "XiaMen Carbon Speed", status: "unverified", confidence: "low", color: "#334155",
    description: "XiaMen Carbon Speed — custom carbon wheel builder discussed by enthusiast communities.",
    sources: [["Weight Weenies — XMCS thread", "https://weightweenies.starbike.com/forum/viewtopic.php?p=1943939", "community"]],
    notes: "Community-sourced only. Forum reports that sales may pause until 2027 — check availability.",
  },
  {
    name: "BladeX", country: "China", categories: ["road"], kinds: ["wheels", "oem-manufacturer"], status: "unverified", confidence: "low", color: "#1F2937",
    description: "Carbon wheel factory (OEM/wholesale since 2011 per its founder) launching its own rider-facing brand in 2025.",
    sources: [["Weight Weenies — BladeX founder post", "https://weightweenies.starbike.com/forum/viewtopic.php?p=1997882", "community"]],
    notes: "Founder's own claims; not to be confused with Canadian Blade Carbon Wheels.",
  },
  {
    name: "EXAR", country: "China", categories: ["road"], kinds: ["wheels"], parent: "Magene", status: "unverified", confidence: "medium", color: "#E11D48",
    description: "Carbon wheel line from Magene (EXAR Pro, Ultra) in rim- and disc-brake versions.",
    sources: [["Magene support — Carbon Fiber Wheelset Pro 2022", "https://support.magene.com/hc/en-us/categories/25599277850137-Carbon-Fiber-Wheelset-Pro-2022", "official-website"]],
  },
  {
    name: "Dengfu", country: "China", categories: ["road", "gravel", "mtb"], kinds: ["frames", "private-label"], status: "unverified", confidence: "low", color: "#78716C",
    description: "Direct-to-consumer carbon frame seller, largely open-mould designs.",
    sources: [["Cycling Weekly — Chinese tech feature", "https://www.cyclingweekly.com/news/chinese-tech", "publication"]],
    notes: "Location and factory details not found.",
  },
  {
    name: "Avian", country: "Not Available", categories: ["bmx"], kinds: ["components", "wheels"], parent: "Avian Speed Co.", status: "cross-verified", confidence: "medium", color: "#F43F5E",
    description: "Specialist in BMX race components, including carbon BMX rims (Venatic) — not a road wheel brand.",
    sources: [["Crucial BMX — Avian Venatic rim", "https://crucialbmxshop.com/avian-venatic-carbon-rim/", "retailer"], ["LUXBMX — Avian Venatic", "https://www.luxbmx.com/en-us/products/avian-venatic-carbon-rim-20x175-braking", "retailer"]],
  },
  { name: "Cadex", country: "Taiwan", categories: ["road", "gravel", "mtb"], kinds: ["wheels", "components"], parent: "Giant", status: "unverified", confidence: "medium", color: "#18181B", description: "Giant's premium component and wheel brand (Cadex 36/50/65, Max XC).", sources: [["BikeRadar — Cadex Max XC", "https://www.bikeradar.com/news/cadex-max-xc-wheelsystem", "publication"]] },
  { name: "Magene", country: "China", categories: ["road", "mtb"], kinds: ["components"], status: "unverified", confidence: "medium", color: "#E11D48", description: "Chinese maker of cycling electronics and parent of the EXAR wheel line.", sources: [["Magene support (official)", "https://support.magene.com/hc/en-us/categories/25599277850137-Carbon-Fiber-Wheelset-Pro-2022", "official-website"]] },
  { name: "EIE Carbon", country: "Not Available", categories: ["mtb"], kinds: ["wheels"], status: "unverified", confidence: "low", color: "#57534E", description: "Carbon rim maker reviewed by MarathonMTB (2018).", sources: [["MarathonMTB — EIE Carbon first look", "https://marathonmtb.com/2018/09/13/first-look-eie-carbon-a29c25d22s/", "publication"]], notes: "Country and current availability not confirmed." },
];

/* ==================== INTERNATIONAL BICYCLE BRANDS (seed) ==================== */

type Seed = [name: string, country: string, founded: number | null, website: string | null, categories: CategoryId[], description: string];
const INTL_BIKES: Seed[] = [
  ["Specialized", "United States", 1974, "https://www.specialized.com", ["road", "mtb", "gravel", "urban", "electric", "bmx", "other"], "Californian manufacturer behind the Tarmac, Roubaix, Stumpjumper and Turbo e-bike families."],
  ["Trek", "United States", 1976, "https://www.trekbikes.com", ["road", "mtb", "gravel", "urban", "electric", "other"], "Wisconsin-based manufacturer of the Madone, Domane, Émonda, Fuel and FX ranges."],
  ["Giant", "Taiwan", 1972, "https://www.giant-bicycles.com", ["road", "mtb", "gravel", "urban", "electric", "other"], "One of the world's largest bicycle manufacturers, known for the TCR, Defy and Trance."],
  ["Cannondale", "United States", 1971, "https://www.cannondale.com", ["road", "mtb", "gravel", "urban", "electric", "other"], "Pioneer of oversized aluminium frames; makers of the SuperSix EVO, Topstone and Scalpel."],
  ["Canyon", "Germany", 1985, "https://www.canyon.com", ["road", "mtb", "gravel", "urban", "electric"], "German direct-to-consumer brand known for the Aeroad, Ultimate, Grail and Spectral."],
  ["Merida", "Taiwan", 1972, "https://www.merida-bikes.com", ["road", "mtb", "gravel", "urban", "electric"], "Taiwanese manufacturer with European R&D, producing the Scultura, Reacto and Big.Nine."],
  ["Scott", "Switzerland", 1958, "https://www.scott-sports.com", ["road", "mtb", "gravel", "electric", "urban"], "Swiss-headquartered maker of the Addict, Foil, Spark and Scale."],
  ["BMC", "Switzerland", 1986, "https://www.bmc-switzerland.com", ["road", "mtb", "gravel", "electric"], "Swiss engineering-led brand behind the Teammachine and Roadmachine."],
  ["Cervélo", "Canada", 1995, "https://www.cervelo.com", ["road", "gravel"], "Canadian brand rooted in aerodynamics and time-trial engineering."],
  ["Pinarello", "Italy", 1952, "https://pinarello.com", ["road", "gravel", "electric"], "Treviso-based racing marque famous for the asymmetric Dogma."],
  ["Colnago", "Italy", 1954, "https://www.colnago.com", ["road", "gravel", "electric"], "Italian racing manufacturer founded by Ernesto Colnago."],
  ["Bianchi", "Italy", 1885, "https://www.bianchi.com", ["road", "gravel", "mtb", "urban", "electric"], "Among the oldest bicycle manufacturers still operating, known for celeste green."],
  ["Orbea", "Spain", 1840, "https://www.orbea.com", ["road", "mtb", "gravel", "urban", "electric"], "Basque manufacturer with a custom-paint programme."],
  ["Cube", "Germany", 1993, "https://www.cube.eu", ["road", "mtb", "gravel", "urban", "electric", "other"], "Bavarian manufacturer with a very broad range."],
  ["Focus", "Germany", 1992, "https://www.focus-bikes.com", ["road", "mtb", "gravel", "electric"], "German brand founded by cyclocross champion Mike Kluge."],
  ["Lapierre", "France", 1946, "https://www.lapierrebikes.com", ["road", "mtb", "gravel", "electric"], "French manufacturer from Dijon."],
  ["Ridley", "Belgium", 1997, "https://www.ridley-bikes.com", ["road", "gravel", "other"], "Belgian brand with cyclocross and classics roots."],
  ["Wilier", "Italy", 1906, "https://www.wilier.com", ["road", "gravel", "mtb", "electric"], "Wilier Triestina — Italian road racing manufacturer."],
  ["Factor", "United Kingdom", 2007, "https://factorbikes.com", ["road", "gravel"], "Engineering-led road and gravel brand with in-house carbon manufacturing."],
  ["Look", "France", 1951, "https://www.lookcycle.com", ["road", "other"], "French company that popularised the clipless pedal; also road and track frames."],
  ["Time", "France", 1987, null, ["road", "gravel"], "French manufacturer known for resin-transfer-moulded carbon frames and pedals."],
  ["Santa Cruz", "United States", 1993, "https://www.santacruzbicycles.com", ["mtb", "gravel", "electric"], "Californian full-suspension specialist."],
  ["Yeti", "United States", 1985, "https://yeticycles.com", ["mtb", "gravel"], "Colorado brand known for Switch Infinity suspension."],
  ["Pivot", "United States", 2007, "https://www.pivotcycles.com", ["mtb", "gravel", "electric"], "Arizona-based brand building DW-Link mountain bikes."],
  ["Kona", "Canada", 1988, "https://www.konaworld.com", ["mtb", "gravel", "urban", "other"], "Canadian-founded brand behind the Process and Honzo."],
  ["Marin", "United States", 1986, "https://www.marinbikes.com", ["mtb", "gravel", "urban", "electric"], "Northern-Californian trail and urban brand."],
  ["GT", "United States", 1972, "https://www.gtbicycles.com", ["mtb", "bmx", "gravel"], "American brand with BMX roots and the triple-triangle frame."],
  ["Norco", "Canada", 1964, "https://www.norco.com", ["mtb", "gravel", "electric"], "Canadian mountain-bike specialist."],
  ["Rocky Mountain", "Canada", 1981, "https://bikes.com", ["mtb", "electric"], "North Shore mountain-bike brand."],
  ["Fuji", "Japan", 1899, "https://www.fujibikes.com", ["road", "mtb", "urban", "other"], "Historic Japanese-founded bicycle brand."],
  ["Felt", "United States", 1991, "https://www.feltbicycles.com", ["road", "gravel", "other"], "American brand with triathlon and time-trial heritage."],
  ["Argon 18", "Canada", 1989, "https://www.argon18bike.com", ["road", "gravel"], "Montréal brand focused on road and triathlon."],
  ["BH", "Spain", 1909, "https://www.bhbikes.com", ["road", "mtb", "gravel", "electric"], "Spanish manufacturer from the Basque Country."],
  ["Commencal", "Andorra", 2000, "https://www.commencal.com", ["mtb", "electric", "bmx"], "Gravity-focused direct-to-consumer brand."],
  ["Transition", "United States", 2001, "https://www.transitionbikes.com", ["mtb"], "Washington-state trail and enduro brand."],
  ["Surly", "United States", 1998, "https://surlybikes.com", ["mtb", "gravel", "urban", "other"], "Steel touring, fat-bike and utility specialists."],
  ["Salsa", "United States", 1982, "https://salsacycles.com", ["gravel", "mtb", "other"], "Adventure-by-bike brand behind the Cutthroat and Fargo."],
  ["Brompton", "United Kingdom", 1976, "https://www.brompton.com", ["folding", "electric"], "London folding-bike maker."],
  ["Tern", "Taiwan", 2011, "https://www.ternbicycles.com", ["folding", "electric", "urban", "other"], "Folding and compact cargo bike specialist."],
  ["Dahon", "United States", 1982, "https://dahon.com", ["folding", "electric"], "One of the earliest dedicated folding-bike makers."],
  ["Ghost", "Germany", 1993, null, ["mtb", "electric", "gravel"], "German mountain and e-mountain bike brand."],
  ["Bombtrack", "Germany", 2008, null, ["gravel", "urban", "bmx", "other"], "Cologne brand for adventure, gravel and BMX."],
  ["Mondraker", "Spain", 2001, null, ["mtb", "electric"], "Spanish brand that pioneered Forward Geometry."],
  ["Ibis", "United States", 1981, null, ["mtb", "gravel"], "Santa Cruz-based trail bike specialist."],
  ["Niner", "United States", 2005, null, ["mtb", "gravel"], "Brand that championed 29-inch wheels."],
  ["Intense", "United States", 1993, null, ["mtb"], "Southern-Californian gravity mountain-bike brand."],
  ["Devinci", "Canada", 1987, null, ["mtb", "road", "gravel"], "Québec manufacturer with in-house aluminium production."],
  ["3T", "Italy", 1961, null, ["road", "gravel"], "Italian component maker turned gravel-bike innovator."],
  ["Open", "Switzerland", 2012, null, ["gravel", "road"], "Small brand behind the U.P. gravel bike."],
  ["Lauf", "Iceland", 2011, null, ["gravel"], "Icelandic brand known for leaf-spring forks."],
  ["Rose", "Germany", 1907, null, ["road", "mtb", "gravel", "electric"], "German direct-to-consumer manufacturer."],
  ["Ribble", "United Kingdom", 1897, null, ["road", "gravel", "electric"], "British direct-sales brand."],
  ["Raleigh", "United Kingdom", 1887, null, ["urban", "mtb", "other"], "Historic Nottingham bicycle maker."],
  ["Gazelle", "Netherlands", 1892, null, ["urban", "electric"], "Dutch city and e-bike manufacturer."],
  ["Riese & Müller", "Germany", 1993, null, ["electric", "folding"], "Premium e-bike and cargo e-bike maker."],
  ["Van Raam", "Netherlands", null, null, ["other", "electric"], "Dutch maker of adapted bicycles, tricycles and tandems."],
  ["HP Velotechnik", "Germany", null, null, ["other"], "German maker of recumbent trikes and bikes."],
  ["Haro", "United States", 1978, null, ["bmx", "mtb"], "Freestyle BMX pioneer."],
  ["Mongoose", "United States", 1974, null, ["bmx", "mtb"], "Early BMX racing brand."],
  ["WeThePeople", "Germany", 1996, null, ["bmx"], "German BMX brand for street and park."],
  ["Kink", "United States", null, null, ["bmx"], "BMX brand focused on street riding."],
  ["Strider", "United States", null, null, ["other"], "Balance-bike brand for toddlers."],
  ["Woom", "Austria", null, null, ["other"], "Lightweight children's bicycles."],
  ["Tokyobike", "Japan", 2002, null, ["urban"], "Minimalist city bikes designed in Tokyo."],
  ["Bridgestone", "Japan", 1949, null, ["urban", "road", "other"], "Japanese manufacturer of city and road bicycles (incl. Anchor)."],
  ["Samchuly", "South Korea", null, null, ["urban", "mtb", "electric"], "South Korean bicycle manufacturer."],
  ["Schwinn", "United States", 1895, null, ["urban", "mtb", "other"], "Classic American bicycle brand."],
  ["Electra", "United States", 1993, null, ["urban", "other"], "Cruiser and lifestyle bike brand."],
  ["Java", "China", null, null, ["road", "folding", "mtb"], "Chinese value-performance brand popular in Southeast Asia, including Indonesia."],
  ["Twitter", "China", null, null, ["road", "mtb", "gravel"], "Chinese carbon-frame brand widely sold in Indonesia."],
  ["Sava", "China", null, null, ["road", "mtb"], "Chinese carbon bike brand popular with Southeast-Asian riders."],
  ["Fnhon", "China", null, null, ["folding"], "Folding-bike brand with a strong following in Indonesia."],
  ["Phoenix", "China", 1897, null, ["urban", "mtb", "other"], "Historic Shanghai-founded brand, widely distributed in Indonesia."],
];

/* ================= COMPONENT, WHEEL & BEARING MANUFACTURERS (seed) ================= */

type CSeed = [name: string, country: string, kinds: BrandKind[], description: string, parent?: string];
const MAKERS: CSeed[] = [
  ["Shimano", "Japan", ["components", "wheels"], "Drivetrains, brakes, wheels and pedals across every discipline."],
  ["SRAM", "United States", ["components"], "Drivetrains, brakes and suspension (owner of RockShox, Zipp)."],
  ["Campagnolo", "Italy", ["components", "wheels"], "Italian road groupsets and wheels; parent of Fulcrum."],
  ["MicroSHIFT", "Taiwan", ["components"], "Affordable drivetrains including Advent X."],
  ["LTWOO", "China", ["components"], "Value drivetrains for road and MTB."],
  ["Sensah", "China", ["components"], "Value road and MTB groupsets."],
  ["Wheeltop", "China", ["components"], "Electronic and mechanical value drivetrains."],
  ["TRP", "Taiwan", ["components"], "Brakes and drivetrain components.", "Tektro"],
  ["Tektro", "Taiwan", ["components"], "Brake manufacturer."],
  ["Box Components", "United States", ["components"], "MTB and BMX drivetrain components."],
  ["SunRace", "Taiwan", ["components"], "Cassettes and drivetrain parts."],
  ["Rotor", "Spain", ["components"], "Cranks, power meters and chainrings."],
  ["Classified", "Belgium", ["components", "wheels"], "Hub-based two-speed shifting system."],
  ["KMC", "Taiwan", ["components"], "Bicycle chains."],
  ["RockShox", "United States", ["components"], "Suspension forks, shocks and dropper posts.", "SRAM"],
  ["Fox", "United States", ["components"], "Suspension forks, shocks and dropper posts."],
  ["SR Suntour", "Taiwan", ["components"], "Suspension forks for every budget."],
  ["Odyssey", "United States", ["components", "wheels"], "BMX parts."],
  ["Zipp", "United States", ["wheels", "components"], "Carbon wheels and cockpit parts.", "SRAM"],
  ["ENVE", "United States", ["wheels", "components", "frames"], "Premium carbon wheels, cockpits and frames."],
  ["DT Swiss", "Switzerland", ["wheels", "components"], "Hubs, rims, spokes, wheels and suspension."],
  ["Mavic", "France", ["wheels"], "Wheels and rims."],
  ["Fulcrum", "Italy", ["wheels"], "Wheels.", "Campagnolo"],
  ["Vision", "Not Available", ["wheels", "components"], "Wheels and aero cockpits.", "FSA"],
  ["Roval", "United States", ["wheels"], "Specialized's wheel brand.", "Specialized"],
  ["Bontrager", "United States", ["wheels", "components"], "Trek's component and wheel brand.", "Trek"],
  ["Reserve", "United States", ["wheels"], "Santa Cruz's wheel brand.", "Santa Cruz"],
  ["Hunt", "United Kingdom", ["wheels"], "Direct-sales wheel brand."],
  ["Reynolds", "United States", ["wheels"], "Carbon wheels."],
  ["Industry Nine", "United States", ["wheels", "components"], "Hubs and wheels."],
  ["Chris King", "United States", ["components", "wheels"], "Hubs and headsets."],
  ["Boyd Cycling", "United States", ["wheels"], "Wheels."],
  ["Easton", "United States", ["wheels", "components"], "Wheels and cockpit components."],
  ["Scope Cycling", "Netherlands", ["wheels"], "Carbon wheels."],
  ["FFWD", "Netherlands", ["wheels"], "Carbon wheels."],
  ["Syncros", "Switzerland", ["components", "wheels"], "Scott's component brand.", "Scott"],
  ["Princeton CarbonWorks", "United States", ["wheels"], "Wave-profile carbon wheels."],
  ["Novatec", "Taiwan", ["wheels", "components"], "Hubs and wheels."],
  ["Hope", "United Kingdom", ["components", "wheels"], "Hubs, brakes and machined components."],
  ["Bitex", "Taiwan", ["components"], "Hubs."],
  ["Powerway", "Taiwan", ["components"], "Hubs."],
  ["Chosen", "Taiwan", ["components"], "Hubs."],
  ["Enduro Bearings", "United States", ["components"], "Bicycle-specific bearings."],
  ["CeramicSpeed", "Denmark", ["components"], "Ceramic bearings and drivetrain parts."],
  ["SKF", "Sweden", ["components"], "Industrial bearing manufacturer."],
  ["NTN", "Japan", ["components"], "Industrial bearing manufacturer."],
  ["NSK", "Japan", ["components"], "Industrial bearing manufacturer."],
  ["Koyo", "Japan", ["components"], "Bearing brand of JTEKT."],
  ["FSA", "Not Available", ["components"], "Cranks, cockpits and headsets."],
  ["Deda", "Italy", ["components"], "Handlebars, stems and seatposts."],
  ["Ritchey", "United States", ["components"], "Cockpit, seatposts and frames."],
  ["PRO", "Netherlands", ["components"], "Shimano's cockpit and accessory brand.", "Shimano"],
  ["Token", "Taiwan", ["components"], "Bottom brackets, hubs and cockpit parts."],
  ["KCNC", "Taiwan", ["components"], "Lightweight machined components."],
  ["UNO", "Taiwan", ["components"], "Stems, bars and seatposts."],
  ["Controltech", "Taiwan", ["components"], "Cockpit and seatposts."],
  ["Renthal", "United Kingdom", ["components"], "MTB handlebars and stems."],
  ["OneUp", "Canada", ["components"], "Dropper posts, bars and pedals."],
  ["Race Face", "Canada", ["components"], "Cranks, bars and stems."],
  ["Thomson", "United States", ["components"], "Seatposts and stems."],
  ["Crankbrothers", "United States", ["components"], "Pedals and tools."],
  ["Wellgo", "Taiwan", ["components"], "Pedals."],
  ["Garmin", "United States", ["components"], "Cycling computers, power meters and radar."],
  ["Wahoo", "United States", ["components"], "Cycling computers and trainers."],
  ["Lezyne", "United States", ["components"], "Lights, pumps and tools."],
  ["Topeak", "Taiwan", ["components"], "Tools, pumps and bags."],
  ["Elite", "Italy", ["components"], "Bottles, cages and trainers."],
  ["Fizik", "Italy", ["components"], "Saddles, shoes and bar tape."],
  ["Selle Italia", "Italy", ["components"], "Saddles."],
  ["Prologo", "Italy", ["components"], "Saddles."],
  ["Brooks", "United Kingdom", ["components"], "Leather saddles."],
  ["Ergon", "Germany", ["components"], "Saddles and grips."],
  ["SQlab", "Germany", ["components"], "Ergonomic saddles and grips."],
  ["Selle SMP", "Italy", ["components"], "Saddles."],
  ["Selle Royal", "Italy", ["components"], "Comfort saddles."],
  ["WTB", "United States", ["components"], "Saddles, tyres and rims."],
  ["Continental", "Germany", ["components"], "Tyres."],
  ["Schwalbe", "Germany", ["components"], "Tyres."],
  ["Pirelli", "Italy", ["components"], "Tyres."],
  ["Vittoria", "Italy", ["components"], "Tyres."],
  ["Maxxis", "Taiwan", ["components"], "Tyres."],
  ["Michelin", "France", ["components"], "Tyres."],
  ["CST", "Taiwan", ["components"], "Tyres."],
  ["Kenda", "Taiwan", ["components"], "Tyres."],
  ["Chaoyang", "China", ["components"], "Tyres."],
  ["IRC", "Japan", ["components"], "Tyres."],
];

function seedBrand(s: Seed): Brand {
  const [name, country, founded, website, categories, description] = s;
  return toBrand({ name, country, founded, website, categories, description, kinds: ["bicycles"] }, "International");
}
function makerBrand(s: CSeed): Brand {
  const [name, country, kinds, description, parent] = s;
  return toBrand({ name, country, kinds, description, parent, categories: [] }, country === "Indonesia" ? "Indonesia" : "International");
}

export const BRANDS: Brand[] = [
  ...INDONESIA.map((d) => toBrand(d, "Indonesia")),
  ...ASIA_RESEARCHED.map((d) => toBrand(d, "International")),
  ...INTL_BIKES.map(seedBrand),
  ...MAKERS.map(makerBrand),
].filter((b, i, all) => all.findIndex((x) => x.id === b.id) === i);

