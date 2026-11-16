import Image from "next/image";
import type { MediaAsset } from "@/lib/types";
import { cx } from "@/lib/format";

/**
 * Registry-backed photo. `label` shows the "representative image" disclosure so category
 * photography is never mistaken for the specific product being displayed.
 */
export function Photo({
  asset, className, sizes = "100vw", priority, label, overlay = "none", imgClassName,
}: {
  asset: MediaAsset;
  className?: string;
  sizes?: string;
  priority?: boolean;
  label?: "representative" | "credit" | false;
  overlay?: "none" | "bottom" | "left" | "full";
  imgClassName?: string;
}) {
  return (
    <div className={cx("overflow-hidden bg-ink-900", /\b(absolute|fixed|sticky)\b/.test(className ?? "") ? null : "relative", className)}>
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cx("object-cover", imgClassName)}
        style={{ objectPosition: asset.focal ?? "50% 50%" }}
      />
      {overlay === "bottom" && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />}
      {overlay === "left" && <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/60 to-transparent" />}
      {overlay === "full" && <div className="pointer-events-none absolute inset-0 bg-ink-950/45" />}
      {label === "representative" && (
        <span className="absolute bottom-2 right-2 rounded-[2px] bg-ink-950/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted backdrop-blur-sm" title={`${asset.subject} — representative photo, not this exact product. ${asset.source}${asset.photographer ? ` · ${asset.photographer}` : ""} · ${asset.license}`}>
          Representative image
        </span>
      )}
      {label === "credit" && (
        <a href={asset.sourceUrl ?? undefined} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 rounded-[2px] bg-ink-950/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted backdrop-blur-sm hover:text-fg">
          Photo: {asset.photographer ?? asset.source} · {asset.license}
        </a>
      )}
    </div>
  );
}
