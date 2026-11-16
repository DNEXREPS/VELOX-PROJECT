import Image from "next/image";
import { ExternalLink, ImageOff } from "lucide-react";
import type { BikeModel } from "@/lib/types";
import { imageForBike, MATCH_LABEL } from "@/data/product-images";
import { cx } from "@/lib/format";

/**
 * The only way a specific bicycle is pictured in VELOX. It renders a verified, licensed photo of
 * that model, an admin-supplied image (flagged as unverified), or the VELOX placeholder. It never
 * falls back to category photography or another model's photo.
 */
export function BikeImage({
  bike, brandName, className, sizes = "100vw", priority, variant = "tile",
}: {
  bike: Pick<BikeModel, "id" | "name" | "year" | "imageUrl" | "officialUrl"> & { yearBasis?: BikeModel["yearBasis"] };
  brandName?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** tile: inside a link (no nested anchors) · detail: large, shows credit + official link · thumb: tiny */
  variant?: "tile" | "detail" | "thumb";
}) {
  const label = `${brandName ? `${brandName} ` : ""}${bike.name}`;
  const img = imageForBike(bike.id);
  const root = cx("overflow-hidden bg-ink-900", /\b(absolute|fixed|sticky)\b/.test(className ?? "") ? null : "relative", className);

  if (img) {
    return (
      <figure className={root} data-image-status="verified">
        <Image src={img.primary_image_url} alt={img.alt} fill sizes={sizes} priority={priority} className={cx("object-contain", variant === "thumb" ? "p-1" : "p-3 sm:p-5")} />
        {variant !== "thumb" && (
          <figcaption className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5">
            <span className="rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-lime backdrop-blur-sm" title={img.matchNotes}>
              {MATCH_LABEL[img.image_model_match]}
            </span>
            {variant === "detail" ? (
              <a href={img.image_source_url} target="_blank" rel="noreferrer" className="rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted backdrop-blur-sm hover:text-fg">
                {img.image_license_status === "manufacturer-product-image" ? `Official photo · © ${img.author}` : `Photo: ${img.author ?? "Wikimedia Commons"} · ${img.license}`}
              </a>
            ) : (
              <span className="rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted backdrop-blur-sm">{img.image_license_status === "manufacturer-product-image" ? "Official photo" : img.license}</span>
            )}
          </figcaption>
        )}
      </figure>
    );
  }

  if (bike.imageUrl) {
    return (
      <figure className={root} data-image-status="admin-unverified">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bike.imageUrl} alt={label} loading={priority ? "eager" : "lazy"} className="h-full w-full object-contain p-3" />
        {variant !== "thumb" && <figcaption className="absolute bottom-2 left-2 rounded-[2px] bg-ink-950/75 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-warn">Admin image · not yet verified</figcaption>}
      </figure>
    );
  }

  return <MissingBikeImage className={root} brandName={brandName} name={bike.name} year={bike.yearBasis === "undated" ? undefined : bike.year} officialUrl={variant === "detail" ? bike.officialUrl : null} variant={variant} />;
}

/** Deliberately designed "no verified photo" state — typographic, never a fake bicycle. */
export function MissingBikeImage({
  className, brandName, name, year, officialUrl, variant = "tile",
}: { className?: string; brandName?: string; name: string; year?: number; officialUrl?: string | null; variant?: "tile" | "detail" | "thumb" }) {
  if (variant === "thumb") {
    return (
      <div className={cx(className, "flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-900")} data-image-status="missing" aria-label={`${name}: no verified photo`}>
        <ImageOff className="h-4 w-4 text-subtle" aria-hidden />
      </div>
    );
  }
  return (
    <div className={cx(className, "bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950")} data-image-status="missing">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden />
      <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
        <span className="self-end font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{brandName ?? "VELOX"}{year ? ` · ${year}` : ""}</span>
        <div className="min-w-0">
          <p className={cx("display truncate text-fg/90", variant === "detail" ? "text-[clamp(2rem,4vw,3.2rem)]" : "text-2xl")}>{name}</p>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            <ImageOff className="h-3 w-3" aria-hidden /> Verified product photo not available
          </p>
          {variant === "detail" && (
            <p className="mt-3 max-w-md text-xs leading-relaxed text-muted">
              VELOX only shows photos that are confirmed to depict this model and that we are licensed to display.{" "}
              {officialUrl ? (
                <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lime link-u">
                  See the manufacturer’s photos <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "No official product page is on record yet."
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
