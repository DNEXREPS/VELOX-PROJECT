#!/usr/bin/env node
/**
 * VELOX Image Health Checker.
 *
 *   node scripts/image-health.mjs            local checks + remote checks older than 7 days
 *   node scripts/image-health.mjs --offline  local checks only (no network)
 *   node scripts/image-health.mjs --force    re-check every remote URL
 *
 * Local: file exists, real format (magic bytes), decodable, dimensions match the record, checksum
 * unchanged, resolution, duplicate files / URLs / assignments.
 * Remote (polite): the original image URL and the source product page are re-checked with HEAD
 * (falling back to a 1-byte ranged GET), one request per second per host, honouring robots.txt,
 * results cached for 7 days. A dead source does NOT break VELOX (images are served from VELOX's own
 * storage) — it is flagged so an admin can re-verify the product page.
 * Writes src/data/image-health.json, read by the admin "Images" tab and the coverage report.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { spawnSync } from "node:child_process";
import { withModules } from "./lib/load-ts.mjs";

// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set: re-run with proxy support when a proxy is configured.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY && !process.argv.includes("--offline")) {
  const r = spawnSync(process.execPath, ["--no-warnings", ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS || (fs.existsSync("/root/.ccr/ca-bundle.crt") ? "/root/.ccr/ca-bundle.crt" : "") } });
  process.exit(r.status ?? 1);
}

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "src/data/image-health.json");
const offline = process.argv.includes("--offline");
const force = process.argv.includes("--force");
const TTL_MS = 7 * 24 * 3600 * 1000;
const UA = "VELOX-image-health/1.0";
const MIN_SHORT_SIDE = 600;

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { images: [] };
const cache = new Map();
for (const i of previous.images ?? []) for (const k of ["source", "original"]) if (i[k]?.url && i[k]?.checkedAt) cache.set(i[k].url, i[k]);

/* ------------------------------ remote checks ------------------------------ */
const robots = new Map();
async function allowedByRobots(url) {
  const u = new URL(url);
  if (!robots.has(u.host)) {
    let rules = [];
    try {
      const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { "user-agent": UA } });
      if (r.ok) {
        let applies = false;
        for (const line of (await r.text()).split("\n")) {
          const [k, ...rest] = line.split(":"); const v = rest.join(":").trim(); const key = k.trim().toLowerCase();
          if (key === "user-agent") applies = v === "*" || UA.toLowerCase().startsWith(v.toLowerCase());
          else if (applies && key === "disallow" && v) rules.push(v);
        }
      }
    } catch { /* unreachable robots.txt: treat as no rules */ }
    robots.set(u.host, rules);
  }
  return !robots.get(u.host).some((d) => u.pathname.startsWith(d.replace(/\*.*$/, "")));
}

async function probe(url) {
  const now = new Date().toISOString();
  if (!(await allowedByRobots(url))) return { url, status: null, ok: null, note: "robots.txt disallows checking", checkedAt: now };
  for (const method of ["HEAD", "GET"]) {
    try {
      const r = await fetch(url, { method, redirect: "follow", headers: { "user-agent": UA, ...(method === "GET" ? { range: "bytes=0-0" } : {}) }, signal: AbortSignal.timeout(20000) });
      if (method === "HEAD" && (r.status === 405 || r.status === 501)) continue;
      return { url, status: r.status, ok: r.status < 400, contentType: r.headers.get("content-type"), finalUrl: r.url !== url ? r.url : undefined, checkedAt: now };
    } catch (e) {
      if (method === "GET") return { url, status: null, ok: false, note: String(e.cause?.code ?? e.message).slice(0, 80), checkedAt: now };
    }
  }
  return { url, status: null, ok: false, checkedAt: now };
}

async function remoteCheck(urls) {
  const byHost = new Map();
  for (const u of urls) {
    const c = cache.get(u);
    if (!force && c && Date.now() - Date.parse(c.checkedAt) < TTL_MS) continue;
    const h = new URL(u).host; if (!byHost.has(h)) byHost.set(h, []); byHost.get(h).push(u);
  }
  let done = 0; const total = [...byHost.values()].reduce((n, l) => n + l.length, 0);
  await Promise.all([...byHost.values()].map(async (list) => {
    for (const u of list) {
      cache.set(u, await probe(u));
      if (++done % 50 === 0) console.log(`  remote ${done}/${total}`);
      await new Promise((r) => setTimeout(r, 1000)); // ≤ 1 request / second / host
    }
  }));
  return total;
}

/* --------------------------------- main ----------------------------------- */
await withModules(async (load) => {
  const { PRODUCT_IMAGES, isDisplayable } = await load("/src/data/product-images.ts");
  const { BIKES } = await load("/src/data/bikes.ts");
  const { COMPONENTS } = await load("/src/data/components.ts");
  const { MEDIA_LIST } = await load("/src/data/media.ts");
  const { IMPORT_LOG } = await load("/src/data/import-log.ts");
  const categoryFiles = new Set(MEDIA_LIST.map((m) => m.src));
  const subjectExists = (i) => (i.subjectKind === "bike" ? BIKES : COMPONENTS).some((x) => x.id === i.subjectId);

  let checkedRemote = 0;
  if (!offline) {
    const urls = new Set();
    for (const i of PRODUCT_IMAGES) { if (i.original_file_url?.startsWith("http")) urls.add(i.original_file_url); if (i.image_source_url?.startsWith("http")) urls.add(i.image_source_url); }
    console.log(`Remote: ${urls.size} unique source/original URLs (cached for 7 days)`);
    checkedRemote = await remoteCheck([...urls]);
  }

  const seenSha = new Map(), seenFile = new Map();
  const images = [];
  for (const i of PRODUCT_IMAGES) {
    const issues = [];
    const file = path.join(root, "public", i.primary_image_url);
    const f = { ok: false };
    if (!i.primary_image_url.startsWith("/media/products/")) issues.push("not stored in VELOX storage");
    if (categoryFiles.has(i.primary_image_url)) issues.push("category photography used as product image");
    if (!fs.existsSync(file)) issues.push("file missing (404)");
    else {
      const buf = fs.readFileSync(file);
      const fmt = buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "webp" : buf[0] === 0xff && buf[1] === 0xd8 ? "jpeg" : buf.subarray(1, 4).toString() === "PNG" ? "png" : "unknown";
      if (fmt === "unknown") issues.push("invalid image format");
      try {
        const meta = await sharp(buf).metadata();
        Object.assign(f, { ok: fmt !== "unknown", format: fmt, width: meta.width, height: meta.height, bytes: buf.length });
        if (meta.width !== i.width || meta.height !== i.height) issues.push("dimensions differ from record");
        if (Math.min(meta.width, meta.height) < MIN_SHORT_SIDE) issues.push(`low resolution (${meta.width}×${meta.height})`);
      } catch { issues.push("cannot decode image"); f.ok = false; }
      const sha = crypto.createHash("sha256").update(buf).digest("hex");
      if (sha !== i.sha256) issues.push("checksum changed since verification");
      if (seenSha.has(sha) && seenSha.get(sha) !== i.subjectId) issues.push(`duplicate file also assigned to ${seenSha.get(sha)}`);
      seenSha.set(sha, i.subjectId);
    }
    if (seenFile.has(i.primary_image_url) && seenFile.get(i.primary_image_url) !== i.subjectId) issues.push(`same URL also assigned to ${seenFile.get(i.primary_image_url)}`);
    seenFile.set(i.primary_image_url, i.subjectId);
    if (!subjectExists(i)) issues.push("incorrect association: product record not found");
    for (const g of i.gallery ?? []) {
      const gf = path.join(root, "public", g.src);
      if (!fs.existsSync(gf)) { issues.push(`gallery file missing: ${g.src}`); continue; }
      const gsha = crypto.createHash("sha256").update(fs.readFileSync(gf)).digest("hex");
      if (gsha !== g.sha256) issues.push(`gallery checksum changed: ${g.src}`);
      if (seenSha.has(gsha) && seenSha.get(gsha) !== i.subjectId) issues.push(`gallery file also assigned to ${seenSha.get(gsha)}`);
      seenSha.set(gsha, i.subjectId);
    }
    const source = cache.get(i.image_source_url) ?? null;
    const original = i.original_file_url ? cache.get(i.original_file_url) ?? null : null;
    if (source && source.ok === false) issues.push(`source page now answers ${source.status ?? source.note} — re-verify`);
    if (original && original.ok === false) issues.push(`original image URL now answers ${original.status ?? original.note} (expired or removed at source)`);

    const servable = f.ok && !issues.some((x) => /file missing|cannot decode|invalid image format|checksum|duplicate|same URL|category photography|not stored/.test(x));
    const status = !servable ? "failed"
      : !["open-license", "licensed", "manufacturer-product-image"].includes(i.image_license_status) ? "license-restricted"
      : i.image_verification_status === "pending-review" ? "pending"
      : i.image_verification_status === "verified" && isDisplayable(i) ? "verified"
      : "unverified";
    images.push({ id: i.id, subjectKind: i.subjectKind, subjectId: i.subjectId, status, file: f, source, original, issues, gallery: (i.gallery?.length ?? 0) + (i.gallery_images?.length ?? 0) });
  }

  // missing images, with the actual reason
  const united = (() => { try { return new Map(JSON.parse(fs.readFileSync(path.join(root, "scripts/research/united.json"), "utf8")).map((r) => [r.url, r.imageIssue])); } catch { return new Map(); } })();
  const imaged = new Set(images.filter((x) => x.subjectKind === "bike" && x.status !== "failed").map((x) => x.subjectId));
  const missing = BIKES.filter((b) => !imaged.has(b.id)).map((b) => {
    const host = b.officialUrl ? new URL(b.officialUrl).host : null;
    const reason = /pacific-bike\.com$/.test(host ?? "") ? `Official site blocks automated access (${IMPORT_LOG.pacific.access.split(" on ")[0]}); not circumvented`
      : b.brandId === "polygon" ? "polygonbikes.com refuses automated access (HTTP 403); not circumvented"
      : b.brandId === "united-bike" ? (united.get(b.officialUrl) ? `Official image rejected: ${united.get(b.officialUrl)}` : "Official page declared no usable image")
      : !b.officialUrl ? "No official product page on record (editorial seed / researched record)"
      : "Official page known but image not yet harvested";
    return { subjectId: b.id, brandId: b.brandId, name: b.name, officialUrl: b.officialUrl ?? null, reason };
  });

  const count = (k) => images.filter((x) => x.status === k).length;
  const bikeImgs = images.filter((x) => x.subjectKind === "bike");
  const summary = {
    bikeModels: BIKES.length,
    bikesVerified: bikeImgs.filter((x) => x.status === "verified").length,
    bikesUnverified: bikeImgs.filter((x) => ["unverified", "pending"].includes(x.status)).length + BIKES.filter((b) => b.imageUrl && !imaged.has(b.id)).length,
    bikesMissing: missing.length,
    brokenReferences: count("failed"),
    licenseRestricted: count("license-restricted"),
    componentsWithImages: images.filter((x) => x.subjectKind === "component" && x.status === "verified").length,
    wheelsetsWithImages: images.filter((x) => x.subjectKind === "component" && x.status === "verified" && COMPONENTS.find((c) => c.id === x.subjectId)?.type === "wheelset").length,
    galleryImages: images.reduce((n, x) => n + x.gallery, 0),
    sourcesUnreachable: images.filter((x) => x.source?.ok === false || x.original?.ok === false).length,
    lowResolution: images.filter((x) => x.issues.some((s) => s.startsWith("low resolution"))).length,
    remoteChecksThisRun: checkedRemote,
  };
  const out = { generatedAt: new Date().toISOString(), statuses: ["verified", "pending", "failed", "missing", "unverified", "license-restricted"], summary, images, missing };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(summary, null, 1));
  const failed = images.filter((x) => x.status === "failed");
  for (const x of failed) console.log(`FAIL ${x.id}: ${x.issues.join("; ")}`);
  process.exitCode = failed.length ? 1 : 0;
});
