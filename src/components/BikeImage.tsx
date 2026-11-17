"use client";
import Image from "next/image";
import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import type { BikeModel, ComponentType, ProductImage } from "@/lib/types";
import { ComponentGlyph } from "./Glyphs";
import { imageForBike, imageForComponent, MATCH_LABEL, photoSources } from "@/data/product-images";
import { imageReviewStore } from "@/lib/state";
import { useStore } from "@/lib/store";
import { cx } from "@/lib/format";
import { useT } from "@/lib/i18n";

/**
 * The only way a specific bicycle is pictured in VELOX.
 *
 * Fallback chain (never another product's photo, never category photography):
 *   1. verified primary image of this exact product
 *   2. verified gallery images of the same product, in order
 *   3. an admin-supplied image (labelled "not yet verified")
 *   4. the VELOX placeholder, with the official product page
 * Each step advances only when the previous file actually fails to load in the browser.
 */
export function BikeImage({
  bike, brandName, className, sizes = "100vw", priority, variant = "tile", index = 0,
}: {
  bike: Pick<BikeModel, "id" | "name" | "year" | "imageUrl" | "officialUrl"> & { yearBasis?: BikeModel["yearBasis"] };
  brandName?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** tile: inside a link (no nested anchors) · detail: large, shows credit + official link · thumb: tiny */
  variant?: "tile" | "detail" | "thumb";
  /** detail galleries: which verified image to start from */
  index?: number;
}) {
  const t = useT();
  const reviews = useStore(imageReviewStore);
  const img = imageForBike(bike.id);
  const usable = img && reviews[img.id] !== "rejected" ? img : null;
  const sources = usable ? photoSources(usable) : [];
  const ordered = index > 0 && index < sources.length ? [...sources.slice(index), ...sources.slice(0, index)] : sources;
  const [failed, setFailed] = useState(0); // how many sources failed in this browser
  const [adminFailed, setAdminFailed] = useState(false);
  const label = `${brandName ? `${brandName} ` : ""}${bike.name}`;
  const root = cx("overflow-hidden bg-ink-900", /\b(absolute|fixed|sticky)\b/.test(className ?? "") ? null : "relative", className);
  const current = ordered[failed];

  if (usable && current) {
    return (
      <figure className={root} data-image-status="verified" data-image-step={failed === 0 ? "primary" : "gallery"}>
        <Image key={current.src} src={current.src} alt={usable.alt} fill sizes={sizes} priority={priority && failed === 0} className={cx("object-contain", variant === "thumb" ? "p-1" : "p-3 sm:p-5")} onError={() => setFailed((n) => n + 1)} />
        {variant !== "thumb" && <Caption img={usable} detail={variant === "detail"} />}
      </figure>
    );
  }

  if (bike.imageUrl && !adminFailed) {
    return (
      <figure className={root} data-image-status="admin-unverified">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bike.imageUrl} alt={label} loading={priority ? "eager" : "lazy"} className="h-full w-full object-contain p-3" onError={() => setAdminFailed(true)} />
        {variant !== "thumb" && <figcaption className="absolute bottom-2 left-2 rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-warn">{t("img.adminUnverified")}</figcaption>}
      </figure>
    );
  }

  return (
    <MissingBikeImage className={root} brandName={brandName} name={bike.name} year={bike.yearBasis === "undated" ? undefined : bike.year}
      officialUrl={variant === "detail" ? bike.officialUrl : null} variant={variant} failed={!!usable || adminFailed} />
  );
}

function Caption({ img, detail }: { img: ProductImage; detail: boolean }) {
  const t = useT();
  const official = img.image_license_status === "manufacturer-product-image";
  return (
    <figcaption className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5">
      <span className="rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-lime backdrop-blur-sm" title={img.matchNotes}>
        {MATCH_LABEL[img.image_model_match]}
      </span>
      {detail ? (
        <a href={img.image_source_url} target="_blank" rel="noreferrer" className="rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted backdrop-blur-sm hover:text-fg">
          {official ? `${t("img.officialPhoto")} · © ${img.author}` : `Photo: ${img.author ?? "Wikimedia Commons"} · ${img.license}`}
        </a>
      ) : (
        <span className="rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted backdrop-blur-sm">{official ? t("img.officialPhoto") : img.license}</span>
      )}
    </figcaption>
  );
}

/** Thumbnail strip for a product's verified photos (primary + official gallery). */
export function BikeGalleryThumbs({ bikeId, active, onSelect }: { bikeId: string; active: number; onSelect: (i: number) => void }) {
  const t = useT();
  const img = imageForBike(bikeId);
  const sources = img ? photoSources(img) : [];
  if (sources.length < 2) return null;
  return (
    <div className="mt-3 flex gap-2" role="group" aria-label={t("img.gallery")}>
      {sources.map((s, i) => (
        <button key={s.src} type="button" onClick={() => onSelect(i)} aria-label={`${t("img.photo")} ${i + 1} / ${sources.length}`} aria-pressed={active === i}
          className={cx("relative h-16 w-24 overflow-hidden border bg-ink-900 transition-colors", active === i ? "border-lime" : "border-line hover:border-line-strong")}>
          <Image src={s.src} alt="" fill sizes="96px" className="object-contain p-1" />
        </button>
      ))}
    </div>
  );
}

/** Deliberately designed "no verified photo" state — typographic, never a fake bicycle. */
export function MissingBikeImage({
  className, brandName, name, year, officialUrl, variant = "tile", failed = false,
}: { className?: string; brandName?: string; name: string; year?: number; officialUrl?: string | null; variant?: "tile" | "detail" | "thumb"; failed?: boolean }) {
  const t = useT();
  const status = failed ? "failed" : "missing";
  if (variant === "thumb") {
    return (
      <div className={cx(className, "flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-900")} data-image-status={status} role="img" aria-label={`${name}: ${t("img.missing")}`}>
        <ImageOff className="h-4 w-4 text-subtle" aria-hidden />
      </div>
    );
  }
  return (
    <div className={cx(className, "bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950")} data-image-status={status}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden />
      <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
        <span className="self-end font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{brandName ?? "VELOX"}{year ? ` · ${year}` : ""}</span>
        <div className="min-w-0">
          <p className={cx("display truncate text-fg/90", variant === "detail" ? "text-[clamp(2rem,4vw,3.2rem)]" : "text-2xl")}>{name}</p>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            <ImageOff className="h-3 w-3" aria-hidden /> {failed ? t("img.failed") : t("img.missing")}
          </p>
          {variant === "detail" && (
            <p className="mt-3 max-w-md text-xs leading-relaxed text-muted">
              {t("img.missingExplain")}{" "}
              {officialUrl ? (
                <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lime link-u">
                  {t("img.seeManufacturer")} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                t("img.noOfficialPage")
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Component photo: verified official image when one exists, else the technical glyph (never a stand-in photo). */
export function ComponentPhoto({ componentId, type, alt, className, sizes = "64px", large = false }: { componentId: string; type: ComponentType; alt: string; className?: string; sizes?: string; large?: boolean }) {
  const reviews = useStore(imageReviewStore);
  const img = imageForComponent(componentId);
  const [failed, setFailed] = useState(false);
  const ok = img && !failed && reviews[img.id] !== "rejected";
  return (
    <div className={cx("relative flex items-center justify-center overflow-hidden bg-ink-900", className)} data-image-status={ok ? "verified" : failed ? "failed" : "missing"}>
      {ok ? (
        <Image src={photoSources(img)[0].src} alt={img.alt} fill sizes={sizes} className={cx("object-contain", large ? "p-6" : "p-1")} onError={() => setFailed(true)} />
      ) : (
        <ComponentGlyph type={type} className={large ? "h-1/2 w-1/2 text-fg/80" : "h-8 w-8 text-muted"} aria-label={alt} />
      )}
    </div>
  );
}
