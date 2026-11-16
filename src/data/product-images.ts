import type { ImageModelMatch, ProductImage } from "@/lib/types";
import type { BikeModel } from "@/lib/types";
import { PRODUCT_IMAGE_RECORDS } from "./product-images.records";
import { OFFICIAL_PRODUCT_IMAGES } from "./product-images.official";

/**
 * Model-specific product photography.
 *
 * Rules enforced here and in tests/images.test.ts:
 *  - a file is attached to exactly one catalogue record (no silent inheritance across models);
 *  - only openly licensed or explicitly licensed files are rendered;
 *  - "family" matches (a different frame generation) are never shown as the product photo;
 *  - when no verified image exists the UI shows the VELOX placeholder — never another bike's photo
 *    and never category photography.
 */
export const PRODUCT_IMAGES: ProductImage[] = [...PRODUCT_IMAGE_RECORDS, ...OFFICIAL_PRODUCT_IMAGES];

const DISPLAYABLE_MATCH: ImageModelMatch[] = ["exact", "model", "generation"];

export function isDisplayable(img: ProductImage): boolean {
  return (
    (img.image_license_status === "open-license" || img.image_license_status === "licensed" || img.image_license_status === "manufacturer-product-image") &&
    img.image_verification_status === "verified" &&
    DISPLAYABLE_MATCH.includes(img.image_model_match)
  );
}

const BY_SUBJECT = new Map<string, ProductImage>();
for (const img of PRODUCT_IMAGES) if (isDisplayable(img) && !BY_SUBJECT.has(`${img.subjectKind}:${img.subjectId}`)) BY_SUBJECT.set(`${img.subjectKind}:${img.subjectId}`, img);

export function imageForBike(bikeId: string): ProductImage | null {
  return BY_SUBJECT.get(`bike:${bikeId}`) ?? null;
}

export function imageForComponent(componentId: string): ProductImage | null {
  return BY_SUBJECT.get(`component:${componentId}`) ?? null;
}

export const MATCH_LABEL: Record<ImageModelMatch, string> = {
  exact: "Exact model & year",
  model: "Same model · year not confirmed",
  generation: "Same frame generation · different build",
  family: "Different generation",
};

/** Image coverage classes used by the audit and the admin view. */
export type ImageCoverage = "verified-official" | "verified-distributor" | "licensed" | "unverified" | "missing";
export const COVERAGE_LABEL: Record<ImageCoverage, string> = {
  "verified-official": "Verified official image",
  "verified-distributor": "Verified authorised-distributor image",
  licensed: "Licensed product image",
  unverified: "Unverified image",
  missing: "Missing image",
};

export function imageCoverage(bike: Pick<BikeModel, "id" | "imageUrl">): ImageCoverage {
  const img = imageForBike(bike.id);
  if (img) {
    if (img.image_source_type === "manufacturer" || img.image_source_type === "manufacturer-catalog") return "verified-official";
    if (img.image_source_type === "distributor") return "verified-distributor";
    return "licensed";
  }
  const pending = PRODUCT_IMAGES.some((i) => i.subjectKind === "bike" && i.subjectId === bike.id && i.image_verification_status === "pending-review");
  return bike.imageUrl || pending ? "unverified" : "missing";
}
