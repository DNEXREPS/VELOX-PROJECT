#!/usr/bin/env node
// Validates the product-image registry: local files, format, dimensions, checksums, duplicate
// files/URLs and duplicate assignments across unrelated models. `--remote` also checks that the
// documented source pages and original files still answer over HTTP.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { withModules } from "./lib/load-ts.mjs";

const remote = process.argv.includes("--remote");
const root = path.resolve(import.meta.dirname, "..");
const problems = [];
const warn = [];

await withModules(async (load) => {
  const { PRODUCT_IMAGES, isDisplayable } = await load("/src/data/product-images.ts");
  const { BIKES } = await load("/src/data/bikes.ts");
  const { COMPONENTS } = await load("/src/data/components.ts");
  const { MEDIA_LIST } = await load("/src/data/media.ts");
  const ids = { bike: new Set(BIKES.map((b) => b.id)), component: new Set(COMPONENTS.map((c) => c.id)) };
  const categoryFiles = new Set(MEDIA_LIST.map((m) => m.src));
  const byHash = new Map(), byUrl = new Map(), bySource = new Map(), primaryPerSubject = new Map();

  for (const img of PRODUCT_IMAGES) {
    const tag = `${img.id} → ${img.subjectKind}:${img.subjectId}`;
    if (!ids[img.subjectKind]?.has(img.subjectId)) problems.push(`${tag}: subject does not exist in the catalogue`);
    if (categoryFiles.has(img.primary_image_url)) problems.push(`${tag}: uses category photography as a product image`);
    if (!/^\/media\/products\//.test(img.primary_image_url)) problems.push(`${tag}: product images must be stored locally under /media/products/ (no hot-linked or search-result URLs)`);
    const file = path.join(root, "public", img.primary_image_url);
    if (!fs.existsSync(file)) { problems.push(`${tag}: file missing (${img.primary_image_url})`); continue; }
    const buf = fs.readFileSync(file);
    const isWebp = buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf.subarray(1, 4).toString() === "PNG";
    if (!isWebp && !isJpeg && !isPng) problems.push(`${tag}: unsupported image format`);
    try {
      const meta = await sharp(buf).metadata();
      if (meta.width !== img.width || meta.height !== img.height) problems.push(`${tag}: recorded ${img.width}×${img.height} but file is ${meta.width}×${meta.height}`);
      if (Math.min(meta.width, meta.height) < 400) warn.push(`${tag}: low resolution (${meta.width}×${meta.height})`);
    } catch (e) { problems.push(`${tag}: cannot decode (${e.message})`); }
    const sha = crypto.createHash("sha256").update(buf).digest("hex");
    if (sha !== img.sha256) problems.push(`${tag}: checksum mismatch — file changed since verification`);
    for (const [map, key, what] of [[byHash, sha, "same file"], [byUrl, img.primary_image_url, "same URL"], [bySource, img.image_source_url, "same source photo"]]) {
      const prev = map.get(key);
      if (prev && prev.subjectId !== img.subjectId) problems.push(`${tag}: ${what} already assigned to ${prev.subjectKind}:${prev.subjectId}`);
      map.set(key, img);
    }
    if (isDisplayable(img)) {
      const k = `${img.subjectKind}:${img.subjectId}`;
      if (primaryPerSubject.has(k)) warn.push(`${tag}: more than one displayable image; the first is primary`);
      primaryPerSubject.set(k, img);
    }
    if (!["open-license", "licensed", "manufacturer-product-image"].includes(img.image_license_status) && img.image_verification_status === "verified") warn.push(`${tag}: verified but not licensed for display — it will not be shown`);
    if (remote) {
      for (const u of [img.image_source_url, img.original_file_url].filter(Boolean)) {
        try {
          const res = await fetch(u, { method: "HEAD", headers: { "user-agent": "VELOX-image-validator/1.0" }, redirect: "follow" });
          if (!res.ok) problems.push(`${tag}: ${u} answered HTTP ${res.status}`);
        } catch (e) { problems.push(`${tag}: ${u} unreachable (${e.message})`); }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  // admin-supplied image URLs on catalogue records must not reuse category photography either
  for (const b of BIKES) if (b.imageUrl && categoryFiles.has(b.imageUrl)) problems.push(`bike:${b.id}: imageUrl points at category photography`);

  console.log(`Product images: ${PRODUCT_IMAGES.length} registered, ${primaryPerSubject.size} displayed (one per model)`);
  console.log(`Bikes with a verified photo: ${[...primaryPerSubject.keys()].filter((k) => k.startsWith("bike:")).length} / ${BIKES.length}`);
});

for (const w of warn) console.log(`warn  ${w}`);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `\n${problems.length} problem(s)` : "\nAll image checks passed");
process.exit(problems.length ? 1 : 0);
