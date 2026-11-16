"use client";
import Link from "next/link";
import { GitCompare, Heart } from "lucide-react";
import type { BikeModel, Brand, CompareKind, Component } from "@/lib/types";
import { BikeGraphic } from "./BikeGraphic";
import { ComponentGlyph } from "./Glyphs";
import { Price, StatusBadge } from "./ui";
import { toast } from "./ui/toast";
import { compareStore, wishlistStore } from "@/lib/state";
import { useStore } from "@/lib/store";
import { cx, formatWeightG, titleCase, uid } from "@/lib/format";

export const MAX_COMPARE = 4;

export function toggleCompare(kind: CompareKind, id: string, label: string) {
  const list = compareStore.get();
  if (list.some((c) => c.kind === kind && c.id === id)) {
    compareStore.set(list.filter((c) => !(c.kind === kind && c.id === id)));
    toast("Removed from compare", { body: label, tone: "info" });
    return;
  }
  const sameKind = list.filter((c) => c.kind === kind);
  if (sameKind.length >= MAX_COMPARE) {
    toast(`Compare holds up to ${MAX_COMPARE} ${kind}s`, { body: "Remove one before adding another.", tone: "error", action: { label: "Open compare", href: `/compare?kind=${kind}` } });
    return;
  }
  compareStore.set([...list, { kind, id }]);
  toast("Added to compare", { body: label, action: { label: `Compare ${sameKind.length + 1} ${kind}${sameKind.length ? "s" : ""}`, href: `/compare?kind=${kind}` } });
}

export function CompareButton({ kind, id, label, className, compact }: { kind: CompareKind; id: string; label: string; className?: string; compact?: boolean }) {
  const list = useStore(compareStore);
  const on = list.some((c) => c.kind === kind && c.id === id);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(kind, id, label); }}
      aria-pressed={on}
      aria-label={on ? `Remove ${label} from compare` : `Add ${label} to compare`}
      className={cx("inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs transition-colors", on ? "border-lime/50 bg-lime/10 text-lime" : "border-line text-muted hover:border-line-strong hover:text-fg", className)}
    >
      <GitCompare className="h-3.5 w-3.5" />
      {!compact && (on ? "Comparing" : "Compare")}
    </button>
  );
}

export function WishlistButton({ kind, refId, label, className }: { kind: "bike" | "component"; refId: string; label: string; className?: string }) {
  const list = useStore(wishlistStore);
  const on = list.some((w) => w.kind === kind && w.refId === refId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (on) { wishlistStore.set(list.filter((w) => !(w.kind === kind && w.refId === refId))); toast("Removed from wishlist", { body: label, tone: "info" }); }
        else { wishlistStore.set([...list, { id: uid("wish"), kind, refId, addedAt: new Date().toISOString() }]); toast("Saved to wishlist", { body: label, action: { label: "View garage", href: "/garage?tab=wishlist" } }); }
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${label} from wishlist` : `Save ${label} to wishlist`}
      className={cx("inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-colors", on ? "border-lime/50 text-lime" : "border-line text-muted hover:border-line-strong hover:text-fg", className)}
    >
      <Heart className={cx("h-3.5 w-3.5", on && "fill-current")} />
    </button>
  );
}

export function BikeTile({ bike, brand, className, children }: { bike: BikeModel; brand?: Brand; className?: string; children?: React.ReactNode }) {
  const label = `${brand?.name ?? ""} ${bike.name}`;
  return (
    <article className={cx("group relative flex flex-col border-t hairline pt-5", className)}>
      <Link href={`/bikes/${bike.slug}`} className="absolute inset-0 z-0" aria-label={`${label} ${bike.year}`} />
      <div className="relative -mx-1 aspect-[5/3] overflow-hidden bg-gradient-to-b from-ink-900 to-ink-950">
        <div className="grid-bg absolute inset-0 opacity-60" />
        {bike.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bike.imageUrl} alt={label} loading="lazy" className="relative h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <BikeGraphic category={bike.category} subcategory={bike.subcategory} suspension={bike.suspension} color={bike.frameColor} disc={bike.brakeType?.includes("disc")} className="relative h-full w-full p-3 transition-transform duration-500 group-hover:scale-[1.03]" title={label} />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {brand?.region === "Indonesia" && <span className="rounded-sm bg-ink-950/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lime">Lokal · ID</span>}
          {bike.provenance.status === "discontinued" && <StatusBadge status="discontinued" />}
        </div>
      </div>
      <div className="relative z-10 pointer-events-none mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-tech">{brand?.name} · {bike.year}</p>
          <h3 className="mt-1 truncate text-lg font-medium tracking-tight">{bike.name}</h3>
          <p className="mt-1 truncate text-[13px] text-muted">{titleCase(bike.subcategory)} · {bike.groupset ?? "Groupset n/a"}</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1.5">
          <WishlistButton kind="bike" refId={bike.id} label={label} />
          <CompareButton kind="bike" id={bike.id} label={label} compact />
        </div>
      </div>
      <div className="relative z-10 pointer-events-none mt-3 flex items-center justify-between text-sm">
        <Price price={bike.price} />
        <span className="font-mono text-[11px] text-subtle">{bike.frameMaterial ?? "—"}</span>
      </div>
      {children && <div className="relative z-10 mt-3">{children}</div>}
    </article>
  );
}

export function ComponentRow({ c, action, className }: { c: Component; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("group relative flex items-center gap-4 border-b hairline py-4", className)}>
      <Link href={`/components/${c.id}`} className="absolute inset-0" aria-label={`${c.manufacturer} ${c.name}`} />
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border hairline bg-ink-900 text-muted group-hover:text-lime">
        <ComponentGlyph type={c.type} className="h-8 w-8" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="label-tech">{c.manufacturer} · {titleCase(c.type)}</p>
        <p className="mt-0.5 truncate text-[15px] font-medium tracking-tight">{c.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{c.discipline.map(titleCase).join(" / ")} · {titleCase(c.tier)}{c.material ? ` · ${c.material}` : ""}</p>
      </div>
      <div className="hidden w-24 text-right font-mono text-xs text-muted sm:block">{formatWeightG(c.weightG)}</div>
      <div className="hidden w-40 text-right text-sm md:block"><Price price={c.price} /></div>
      <div className="relative flex shrink-0 gap-1.5">{action ?? <CompareButton kind="component" id={c.id} label={`${c.manufacturer} ${c.name}`} compact />}</div>
    </div>
  );
}
