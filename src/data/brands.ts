import type { Brand, CategoryId, Region } from "@/lib/types";
import { DEMO_PROVENANCE } from "./provenance";

/**
 * Seed brand directory.
 *
 * Status: every record is `unverified` editorial seed data. Founding years and websites
 * are included only where widely documented; anything uncertain is left null and the UI
 * renders "Not Available". Admins verify and extend records through the Admin panel
 * or bulk JSON/CSV import.
 */

type Seed = [
  name: string,
  country: string,
  founded: number | null,
  website: string | null,
  categories: CategoryId[],
  description: string,
  color?: string,
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const INDONESIAN: Seed[] = [
  ["Polygon", "Indonesia", 1989, "https://www.polygonbikes.com", ["road", "mtb", "gravel", "urban", "electric", "bmx", "other"], "Indonesia's largest bicycle brand, designing and manufacturing road, mountain, gravel, urban and electric bikes in East Java and exporting them worldwide.", "#3B82F6"],
  ["United Bike", "Indonesia", null, "https://www.unitedbike.co.id", ["road", "mtb", "gravel", "urban", "folding", "electric", "bmx", "other"], "Indonesian brand with one of the widest local line-ups — from kids' bikes and folding bikes to performance road and trail models.", "#EF4444"],
  ["Pacific", "Indonesia", null, null, ["mtb", "urban", "folding", "bmx", "other"], "Long-standing Indonesian brand known for accessible mountain, city, folding and children's bicycles sold through local dealers nationwide.", "#F59E0B"],
  ["Element", "Indonesia", null, null, ["folding", "urban", "mtb", "road", "electric"], "Indonesian brand with a strong folding-bike range alongside urban, mountain and entry-level road bikes.", "#10B981"],
  ["Exotic", "Indonesia", null, null, ["mtb", "urban", "folding", "other"], "Indonesian value-focused brand offering mountain, city and children's bicycles.", "#A855F7"],
  ["Wimcycle", "Indonesia", null, null, ["mtb", "urban", "bmx", "folding", "other"], "Classic Indonesian bicycle maker familiar to generations of riders, producing everyday, mountain, BMX and kids' bikes.", "#14B8A6"],
  ["Thrill", "Indonesia", null, null, ["mtb", "road", "gravel"], "Indonesian performance-oriented brand focused on trail, enduro and road bikes for enthusiast riders.", "#F97316"],
  ["Genio", "Indonesia", null, null, ["urban", "folding", "mtb", "other"], "Indonesian brand producing city, folding and recreational bicycles.", "#06B6D4"],
  ["Aviator", "Indonesia", null, null, ["urban", "mtb", "other"], "Indonesian bicycle brand with recreational, city and children's models.", "#84CC16"],
  ["London Taxi", "Indonesia", null, null, ["folding", "urban", "other"], "Indonesian brand known for its compact folding bikes and classic-styled city bicycles.", "#EAB308"],
  ["Evergreen", "Indonesia", null, null, ["urban", "mtb", "other"], "Indonesian brand making affordable everyday, mountain and children's bicycles.", "#22C55E"],
  ["Atlantis", "Indonesia", null, null, ["urban", "mtb", "bmx", "other"], "Indonesian brand with entry-level mountain, city, BMX and kids' bicycles.", "#0EA5E9"],
  ["Avand", "Indonesia", null, null, ["folding", "urban", "electric"], "Indonesian brand focused on folding and compact urban bicycles.", "#E879F9"],
  ["Selis", "Indonesia", null, null, ["electric"], "Indonesian electric-mobility brand producing electric bicycles for urban use.", "#4ADE80"],
];

const INTERNATIONAL: Seed[] = [
  ["Specialized", "United States", 1974, "https://www.specialized.com", ["road", "mtb", "gravel", "urban", "electric", "bmx", "other"], "Californian manufacturer behind the Tarmac, Roubaix, Stumpjumper and Turbo e-bike families."],
  ["Trek", "United States", 1976, "https://www.trekbikes.com", ["road", "mtb", "gravel", "urban", "electric", "other"], "Wisconsin-based manufacturer of the Madone, Domane, Émonda, Fuel and FX ranges."],
  ["Giant", "Taiwan", 1972, "https://www.giant-bicycles.com", ["road", "mtb", "gravel", "urban", "electric", "other"], "One of the world's largest bicycle manufacturers, known for compact road geometry and the TCR, Defy and Trance."],
  ["Cannondale", "United States", 1971, "https://www.cannondale.com", ["road", "mtb", "gravel", "urban", "electric", "other"], "Pioneer of oversized aluminium frames; makers of the SuperSix EVO, Topstone and Scalpel."],
  ["Canyon", "Germany", 1985, "https://www.canyon.com", ["road", "mtb", "gravel", "urban", "electric"], "German direct-to-consumer brand known for the Aeroad, Ultimate, Grail and Spectral."],
  ["Merida", "Taiwan", 1972, "https://www.merida-bikes.com", ["road", "mtb", "gravel", "urban", "electric"], "Taiwanese manufacturer with European R&D, producing the Scultura, Reacto and Big.Nine."],
  ["Scott", "Switzerland", 1958, "https://www.scott-sports.com", ["road", "mtb", "gravel", "electric", "urban"], "Swiss-headquartered maker of the Addict, Foil, Spark and Scale."],
  ["BMC", "Switzerland", 1986, "https://www.bmc-switzerland.com", ["road", "mtb", "gravel", "electric"], "Swiss engineering-led brand behind the Teammachine, Roadmachine and Fourstroke."],
  ["Cervélo", "Canada", 1995, "https://www.cervelo.com", ["road", "gravel"], "Canadian brand rooted in aerodynamics and time-trial engineering; makers of the S5, R5 and Áspero."],
  ["Pinarello", "Italy", 1952, "https://pinarello.com", ["road", "gravel", "electric"], "Treviso-based racing marque famous for the asymmetric Dogma."],
  ["Colnago", "Italy", 1954, "https://www.colnago.com", ["road", "gravel", "electric"], "Italian racing manufacturer founded by Ernesto Colnago; makers of the V-series and C-series."],
  ["Bianchi", "Italy", 1885, "https://www.bianchi.com", ["road", "gravel", "mtb", "urban", "electric"], "Among the oldest bicycle manufacturers still operating, known for its celeste green."],
  ["Orbea", "Spain", 1840, "https://www.orbea.com", ["road", "mtb", "gravel", "urban", "electric"], "Basque manufacturer with a custom-paint programme, makers of the Orca, Oiz and Rise."],
  ["Cube", "Germany", 1993, "https://www.cube.eu", ["road", "mtb", "gravel", "urban", "electric", "other"], "Bavarian manufacturer with a very broad range across every discipline."],
  ["Focus", "Germany", 1992, "https://www.focus-bikes.com", ["road", "mtb", "gravel", "electric"], "German brand founded by cyclocross champion Mike Kluge."],
  ["Lapierre", "France", 1946, "https://www.lapierrebikes.com", ["road", "mtb", "gravel", "electric"], "French manufacturer from Dijon with WorldTour and gravity racing heritage."],
  ["Ridley", "Belgium", 1997, "https://www.ridley-bikes.com", ["road", "gravel", "other"], "Belgian brand with deep cyclocross and classics racing roots."],
  ["Wilier", "Italy", 1906, "https://www.wilier.com", ["road", "gravel", "mtb", "electric"], "Wilier Triestina — Italian road racing manufacturer from the Veneto."],
  ["Factor", "United Kingdom", 2007, "https://factorbikes.com", ["road", "gravel"], "Engineering-led road and gravel brand with in-house carbon manufacturing."],
  ["Look", "France", 1951, "https://www.lookcycle.com", ["road", "other"], "French company that popularised the clipless pedal; also makes road and track frames."],
  ["Time", "France", 1987, null, ["road", "gravel"], "French manufacturer known for resin-transfer-moulded carbon frames and pedals."],
  ["Santa Cruz", "United States", 1993, "https://www.santacruzbicycles.com", ["mtb", "gravel", "electric"], "Californian full-suspension specialist behind the Hightower, Megatower and Blur."],
  ["Yeti", "United States", 1985, "https://yeticycles.com", ["mtb", "gravel"], "Colorado brand known for Switch Infinity suspension and racing pedigree."],
  ["Pivot", "United States", 2007, "https://www.pivotcycles.com", ["mtb", "gravel", "electric"], "Arizona-based brand building DW-Link mountain bikes."],
  ["Kona", "Canada", 1988, "https://www.konaworld.com", ["mtb", "gravel", "urban", "other"], "Canadian-founded brand behind the Process, Honzo and Sutra."],
  ["Marin", "United States", 1986, "https://www.marinbikes.com", ["mtb", "gravel", "urban", "electric"], "Northern-Californian brand with strong value-oriented trail and urban bikes."],
  ["GT", "United States", 1972, "https://www.gtbicycles.com", ["mtb", "bmx", "gravel"], "American brand with BMX roots and the iconic triple-triangle frame."],
  ["Norco", "Canada", 1964, "https://www.norco.com", ["mtb", "gravel", "electric"], "Canadian mountain-bike specialist from British Columbia."],
  ["Rocky Mountain", "Canada", 1981, "https://bikes.com", ["mtb", "electric"], "North Shore mountain-bike brand from Vancouver."],
  ["Fuji", "Japan", 1899, "https://www.fujibikes.com", ["road", "mtb", "urban", "other"], "Historic Japanese-founded bicycle brand now distributed worldwide."],
  ["Felt", "United States", 1991, "https://www.feltbicycles.com", ["road", "gravel", "other"], "American brand with triathlon and time-trial heritage."],
  ["Argon 18", "Canada", 1989, "https://www.argon18bike.com", ["road", "gravel"], "Montréal brand focused on road and triathlon engineering."],
  ["BH", "Spain", 1909, "https://www.bhbikes.com", ["road", "mtb", "gravel", "electric"], "Spanish manufacturer from the Basque Country, active in road and e-bikes."],
  ["Commencal", "Andorra", 2000, "https://www.commencal.com", ["mtb", "electric", "bmx"], "Gravity-focused direct-to-consumer brand founded by Max Commençal."],
  ["Transition", "United States", 2001, "https://www.transitionbikes.com", ["mtb"], "Washington-state trail and enduro brand."],
  ["Surly", "United States", 1998, "https://surlybikes.com", ["mtb", "gravel", "urban", "other"], "Steel touring, fat-bike and utility specialists from Minnesota."],
  ["Salsa", "United States", 1982, "https://salsacycles.com", ["gravel", "mtb", "other"], "Adventure-by-bike brand behind the Cutthroat and Fargo."],
  ["Brompton", "United Kingdom", 1976, "https://www.brompton.com", ["folding", "electric"], "London folding-bike maker with a famously compact fold."],
  ["Tern", "Taiwan", 2011, "https://www.ternbicycles.com", ["folding", "electric", "urban", "other"], "Folding and compact cargo bike specialist."],
  ["Dahon", "United States", 1982, "https://dahon.com", ["folding", "electric"], "One of the earliest dedicated folding-bike makers."],
  ["Ghost", "Germany", 1993, null, ["mtb", "electric", "gravel"], "German mountain and e-mountain bike brand."],
  ["Bombtrack", "Germany", 2008, null, ["gravel", "urban", "bmx", "other"], "Cologne brand for adventure, gravel and BMX."],
  ["Mondraker", "Spain", 2001, null, ["mtb", "electric"], "Spanish brand that pioneered long, slack Forward Geometry."],
  ["Ibis", "United States", 1981, null, ["mtb", "gravel"], "Santa Cruz-based trail bike specialist."],
  ["Niner", "United States", 2005, null, ["mtb", "gravel"], "Brand that championed 29-inch wheels."],
  ["Intense", "United States", 1993, null, ["mtb"], "Southern-Californian gravity mountain-bike brand."],
  ["Devinci", "Canada", 1987, null, ["mtb", "road", "gravel"], "Québec manufacturer with in-house aluminium production."],
  ["3T", "Italy", 1961, null, ["road", "gravel"], "Italian component maker turned gravel-bike innovator."],
  ["Open", "Switzerland", 2012, null, ["gravel", "road"], "Small brand behind the U.P. gravel bike."],
  ["Lauf", "Iceland", 2011, null, ["gravel"], "Icelandic brand known for leaf-spring forks."],
  ["Rose", "Germany", 1907, null, ["road", "mtb", "gravel", "electric"], "German direct-to-consumer manufacturer from Bocholt."],
  ["Ribble", "United Kingdom", 1897, null, ["road", "gravel", "electric"], "British direct-sales brand."],
  ["Raleigh", "United Kingdom", 1887, null, ["urban", "mtb", "other"], "Historic Nottingham bicycle maker."],
  ["Gazelle", "Netherlands", 1892, null, ["urban", "electric"], "Dutch city and e-bike manufacturer."],
  ["Riese & Müller", "Germany", 1993, null, ["electric", "folding"], "Premium e-bike and cargo e-bike maker from Darmstadt."],
  ["Haro", "United States", 1978, null, ["bmx", "mtb"], "Freestyle BMX pioneer."],
  ["Mongoose", "United States", 1974, null, ["bmx", "mtb"], "Early BMX racing brand."],
  ["WeThePeople", "Germany", 1996, null, ["bmx"], "German BMX brand for street and park."],
  ["Kink", "United States", null, null, ["bmx"], "BMX brand focused on street riding."],
  ["Tokyobike", "Japan", 2002, null, ["urban"], "Minimalist city bikes designed in Tokyo."],
  ["Bridgestone", "Japan", 1949, null, ["urban", "road", "other"], "Japanese manufacturer of city and road bicycles."],
  ["Schwinn", "United States", 1895, null, ["urban", "mtb", "other"], "Classic American bicycle brand."],
  ["Electra", "United States", 1993, null, ["urban", "other"], "Cruiser and lifestyle bike brand."],
  ["Java", "China", null, null, ["road", "folding", "mtb"], "Chinese value-performance brand popular in Southeast Asia, including Indonesia."],
  ["Twitter", "China", null, null, ["road", "mtb", "gravel"], "Chinese carbon-frame brand widely sold in Indonesia for value road and MTB builds."],
  ["Sava", "China", null, null, ["road", "mtb"], "Chinese carbon bike brand popular with Southeast-Asian riders."],
  ["Fnhon", "China", null, null, ["folding"], "Folding-bike brand with a strong following in Indonesia."],
  ["Phoenix", "China", 1897, null, ["urban", "mtb", "other"], "Historic Shanghai-founded brand, widely distributed in Indonesia."],
];

function toBrand([name, country, founded, website, categories, description, color]: Seed, region: Region): Brand {
  const slug = slugify(name);
  return {
    id: slug,
    slug,
    name,
    country,
    region,
    founded,
    website,
    description,
    history: null,
    categories,
    mark: { color: color ?? "#C5F36A" },
    logoUrl: null,
    provenance: DEMO_PROVENANCE,
  };
}

export const BRANDS: Brand[] = [
  ...INDONESIAN.map((s) => toBrand(s, "Indonesia")),
  ...INTERNATIONAL.map((s) => toBrand(s, "International")),
];

export { slugify };
