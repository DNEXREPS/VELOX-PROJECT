import type { CategoryId, MediaAsset } from "@/lib/types";

/**
 * Central image registry. Every photograph shown in VELOX is listed here with its source,
 * licence and verification date. All current assets are Pexels photos, downloaded and visually
 * checked on 2026-11-16 and served locally from /public/media (re-encoded to WebP).
 *
 * Pexels License: free for commercial use, modification allowed, attribution not required
 * (https://www.pexels.com/license/). Photographer names are recorded where the source listing
 * stated them; null means it was not recorded during sourcing.
 *
 * These are REPRESENTATIVE category images — never presented as a specific catalogue product.
 * To replace the hero with commissioned or licensed studio photography, change `hero` only.
 */
const VERIFIED = "2026-11-16";
const px = (id: number) => `https://www.pexels.com/photo/${id}/`;
const LICENSE = { license: "Pexels License" as const, licenseUrl: "https://www.pexels.com/license/", source: "Pexels", verifiedAt: VERIFIED, representative: true };

export const MEDIA = {
  hero: { id: "hero", src: "/media/hero.webp", width: 2400, height: 1600, alt: "Road cyclist climbing a mountain road with a valley below", subject: "Road cycling", sourceUrl: px(17239244), photographer: "Tuvalum", quality: "hero", focal: "60% 40%", ...LICENSE },
  road: { id: "road", src: "/media/road.webp", width: 1800, height: 1202, alt: "Road cyclist riding through a pine forest", subject: "Road bike", sourceUrl: px(5807684), photographer: null, quality: "high", focal: "50% 60%", ...LICENSE },
  mtb: { id: "mtb", src: "/media/mtb.webp", width: 1800, height: 1200, alt: "Mountain biker descending a rocky trail", subject: "Mountain bike", sourceUrl: px(11049373), photographer: null, quality: "high", focal: "45% 40%", ...LICENSE },
  gravel: { id: "gravel", src: "/media/gravel.webp", width: 1800, height: 1013, alt: "Two riders on drop-bar gravel bikes with wide tyres", subject: "Gravel bike", sourceUrl: px(12266469), photographer: "Utopix Pictures", quality: "high", focal: "40% 60%", ...LICENSE },
  urban: { id: "urban", src: "/media/urban.webp", width: 1200, height: 1800, alt: "City bicycle leaning on a signpost on a Paris street corner", subject: "City bike", sourceUrl: px(19240273), photographer: null, quality: "high", focal: "50% 70%", ...LICENSE },
  hybrid: { id: "hybrid", src: "/media/hybrid.webp", width: 1200, height: 1800, alt: "Step-through trekking bike on a farm track", subject: "Hybrid / trekking bike", sourceUrl: px(3370153), photographer: null, quality: "high", focal: "50% 55%", ...LICENSE },
  bmx: { id: "bmx", src: "/media/bmx.webp", width: 1800, height: 1200, alt: "BMX rider airborne at an urban skatepark under a bridge", subject: "BMX", sourceUrl: px(5464925), photographer: "cottonbro studio", quality: "high", focal: "50% 35%", ...LICENSE },
  folding: { id: "folding", src: "/media/folding.webp", width: 1200, height: 1800, alt: "Rider unfolding a compact black folding bike", subject: "Folding bike", sourceUrl: px(9354885), photographer: "PNW Production", quality: "high", focal: "50% 60%", ...LICENSE },
  electric: { id: "electric", src: "/media/electric.webp", width: 1800, height: 1200, alt: "Black fat-tyre electric bicycle in front of stone steps", subject: "Electric bike", sourceUrl: px(8811401), photographer: null, quality: "high", focal: "50% 60%", ...LICENSE },
  touring: { id: "touring", src: "/media/touring.webp", width: 1600, height: 2400, alt: "Black-and-white photo of a rider pushing a heavily loaded touring bicycle", subject: "Touring bike", sourceUrl: px(19221837), photographer: null, quality: "standard", focal: "50% 60%", ...LICENSE },
  track: { id: "track", src: "/media/track.webp", width: 1800, height: 1200, alt: "Silver single-speed track-style bike parked on a street", subject: "Track / fixed gear", sourceUrl: px(10851178), photographer: null, quality: "high", focal: "50% 60%", ...LICENSE },
  triathlon: { id: "triathlon", src: "/media/triathlon.webp", width: 1800, height: 1200, alt: "Triathlete on aero bars riding a time-trial bike", subject: "Triathlon / time trial", sourceUrl: px(8024999), photographer: "Alari Tammsalu", quality: "high", focal: "55% 45%", ...LICENSE },
  mechanic: { id: "mechanic", src: "/media/mechanic.webp", width: 1800, height: 1200, alt: "Hands truing a bicycle wheel", subject: "Bicycle repair", sourceUrl: px(7153021), photographer: null, quality: "high", focal: "50% 50%", ...LICENSE },
  workshop: { id: "workshop", src: "/media/workshop.webp", width: 1800, height: 1201, alt: "Road bike on a repair stand in a workshop", subject: "Workshop", sourceUrl: px(132682), photographer: null, quality: "standard", focal: "50% 50%", ...LICENSE },
  visualizer: { id: "visualizer", src: "/media/visualizer.webp", width: 1800, height: 1081, alt: "Black-and-white photo of a classic black bicycle against a wooden wall", subject: "Bicycle reference photo", sourceUrl: px(1616566), photographer: null, quality: "high", focal: "50% 55%", ...LICENSE },
  drivetrain: { id: "drivetrain", src: "/media/drivetrain.webp", width: 1600, height: 1067, alt: "Close-up of a mountain bike cassette, chain and rotor", subject: "Drivetrain detail", sourceUrl: px(4530854), photographer: "Harvey Tan Villarino", quality: "high", focal: "50% 50%", ...LICENSE },
  wheelDetail: { id: "wheelDetail", src: "/media/wheel-detail.webp", width: 1400, height: 2100, alt: "Close-up of a bicycle wheel with red rim and spokes", subject: "Wheel detail", sourceUrl: px(5914611), photographer: null, quality: "standard", focal: "50% 50%", ...LICENSE },
  saddleDetail: { id: "saddleDetail", src: "/media/saddle-detail.webp", width: 1400, height: 2100, alt: "Close-up of a black bicycle saddle", subject: "Saddle detail", sourceUrl: px(5920492), photographer: null, quality: "standard", focal: "50% 40%", ...LICENSE },
  trailSunset: { id: "trailSunset", src: "/media/trail-sunset.webp", width: 2000, height: 1500, alt: "Mountain biker silhouetted on a hilltop at sunset", subject: "Trail at sunset", sourceUrl: px(2248713), photographer: "Daniel Frank", quality: "high", focal: "50% 60%", ...LICENSE },
  roadbikeWall: { id: "roadbikeWall", src: "/media/roadbike-wall.webp", width: 1800, height: 1200, alt: "Black road bike leaning against a white brick wall", subject: "Road bike", sourceUrl: px(544997), photographer: null, quality: "high", focal: "50% 60%", ...LICENSE },
} satisfies Record<string, MediaAsset>;

export type MediaKey = keyof typeof MEDIA;
export const MEDIA_LIST: MediaAsset[] = Object.values(MEDIA);

/** Distinct imagery per category — and per subcategory where a better match exists. */
export function mediaForCategory(category: CategoryId, subcategory?: string | null): MediaAsset {
  const sub = subcategory ?? "";
  if (category === "road") return ["time-trial", "triathlon"].includes(sub) ? MEDIA.triathlon : sub === "track" ? MEDIA.track : ["endurance", "all-rounder"].includes(sub) ? MEDIA.roadbikeWall : MEDIA.road;
  if (category === "urban") return ["touring", "trekking"].includes(sub) ? MEDIA.touring : ["hybrid", "fitness", "commuter"].includes(sub) ? MEDIA.hybrid : MEDIA.urban;
  if (category === "other") return ["touring"].includes(sub) ? MEDIA.touring : ["cyclocross"].includes(sub) ? MEDIA.gravel : MEDIA.track;
  const map: Record<CategoryId, MediaAsset> = { road: MEDIA.road, mtb: MEDIA.mtb, gravel: MEDIA.gravel, urban: MEDIA.urban, electric: MEDIA.electric, folding: MEDIA.folding, bmx: MEDIA.bmx, other: MEDIA.track };
  if (category === "electric" && sub === "e-folding") return MEDIA.folding;
  if (category === "electric" && sub === "e-mtb") return MEDIA.electric;
  return map[category];
}

/*
 * There is deliberately no "image for this bike" helper here. Category photography illustrates
 * categories only; specific models are pictured exclusively through src/data/product-images.ts
 * (see components/BikeImage.tsx), which falls back to a designed placeholder.
 */
