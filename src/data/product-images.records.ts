import type { ProductImage } from "@/lib/types";

/**
 * Verified product photographs. Each file was compared by eye with the catalogue record, is stored
 * locally (resized to 1280 px, re-encoded as WebP, metadata stripped) and is credited per its licence.
 * CC BY-SA files are redistributed under the same licence; the resized copy is an adaptation of
 * the original linked in `image_source_url`.
 */
export const PRODUCT_IMAGE_RECORDS: ProductImage[] = [
  {
    "id": "img-polygon-strattos-s3-2019",
    "subjectKind": "bike",
    "subjectId": "polygon-strattos-s3-2019",
    "primary_image_url": "/media/products/polygon-strattos-s3-2019.webp",
    "width": 1280,
    "height": 854,
    "alt": "Polygon Strattos S3 road bike, black and yellow, side profile in a shop studio",
    "image_source_url": "https://commons.wikimedia.org/wiki/File:Polygon_Strattos_S3_(Road_Bike_type)_by_Toko_Sepeda_Yerikho.jpg",
    "original_file_url": "https://upload.wikimedia.org/wikipedia/commons/2/21/Polygon_Strattos_S3_%28Road_Bike_type%29_by_Toko_Sepeda_Yerikho.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    "image_source_type": "wikimedia-commons",
    "image_license_status": "open-license",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "author": "consigliere ivan from Bontang, Indonesia",
    "image_verification_status": "verified",
    "image_model_match": "model",
    "matchNotes": "\"STRATTOS\" top-tube and \"POLYGON\" down-tube decals visible; aluminium frame with rim-brake calipers and a 2x drivetrain, consistent with the 2019 S3 build (Sora 2x9, Tektro rim brakes). The Commons title names the model as Strattos S3; the photo was taken March 2019 at an Indonesian dealer (Yerikho Bike). Model year cannot be read from the photo.",
    "view": "side-profile",
    "last_image_verified_at": "2026-11-16",
    "sha256": "74c45173005d95a4b9d63a7e2d952a10b08919d9b96d4c45681c44424474ef07"
  },
  {
    "id": "img-polygon-xquarone-ex9-2018",
    "subjectKind": "bike",
    "subjectId": "polygon-xquarone-ex9-2018",
    "primary_image_url": "/media/products/polygon-xquarone-ex9-2018.webp",
    "width": 1280,
    "height": 960,
    "alt": "Polygon Xquarone EX9 full-suspension mountain bike on a dirt trail",
    "image_source_url": "https://commons.wikimedia.org/wiki/File:Polygon_XQUARONE_EX9_(Mountain_Bike_type)_by_Kurtis_Pape_from_Adelaide,_SA,_AU.jpg",
    "original_file_url": "https://upload.wikimedia.org/wikipedia/commons/9/9f/Polygon_XQUARONE_EX9_%28Mountain_Bike_type%29_by_Kurtis_Pape_from_Adelaide%2C_SA%2C_AU.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    "image_source_type": "wikimedia-commons",
    "image_license_status": "open-license",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "author": "consigliere ivan from Bontang, Indonesia",
    "image_verification_status": "verified",
    "image_model_match": "model",
    "matchNotes": "\"POLYGON\" down-tube decal and the Xquarone dual-link carbon frame; Fox Factory (gold) fork and Fox shock consistent with the EX9 build (Fox 36 Float Factory / Float X2 Factory). The Commons title names the model as Xquarone EX9; photo uploaded February 2018. Model year cannot be read from the photo.",
    "view": "three-quarter",
    "last_image_verified_at": "2026-11-16",
    "sha256": "45ff55ca8f46f0dc761ed3994700bdb1dae0e31087f004bd26676cd04c9594ce"
  }
];
