"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { buildsStore, compareStore, settingsStore } from "@/lib/state";
import { useCatalog, type Catalog } from "@/lib/catalog-client";
import { useHydrated, useStore } from "@/lib/store";
import { summarize, SLOT_LABEL } from "@/lib/builds";
import { STATUS_TEXT, type CompatStatus } from "@/lib/compat";
import type { Build, CompareKind, Component } from "@/lib/types";
import { Photo } from "@/components/Photo";
import { mediaForCategory } from "@/data/media";
import { BikeImage } from "@/components/BikeImage";
import { BrandMark, ComponentGlyph } from "@/components/Glyphs";
import { MAX_COMPARE } from "@/components/catalog";
import { Button, EmptyState, Segmented, StatusBadge } from "@/components/ui";
import { cx, formatMoney, formatWeightG, NA, PRICE_TYPE_LABEL, titleCase, type Currency } from "@/lib/format";
import { buildIndex, search } from "@/lib/search";

type Val = string | number | null | undefined;
interface Row { label: string; values: Val[]; best?: "min" | "max"; fmt?: (v: Val) => string; group?: string }

const KINDS: Array<{ value: CompareKind; label: string }> = [
  { value: "bike", label: "Bicycles" }, { value: "component", label: "Components" }, { value: "brand", label: "Brands" }, { value: "build", label: "Custom builds" },
];

function rowsFor(kind: CompareKind, ids: string[], cat: Catalog, builds: Build[], currency: Currency): { heads: Array<{ id: string; title: string; sub: string; href?: string; visual: React.ReactNode }>; rows: Row[] } {
  const money = (v: Val) => (v == null ? NA : formatMoney(Number(v), currency));
  if (kind === "bike") {
    const items = ids.map((id) => cat.bikeById.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof cat.bikeById.get>>[];
    const brand = (b: (typeof items)[number]) => cat.brandById.get(b.brandId);
    return {
      heads: items.map((b) => ({ id: b.id, title: b.name, sub: `${brand(b)?.name} · ${b.year}`, href: `/bikes/${b.slug}`, visual: <BikeImage bike={b} brandName={brand(b)?.name} sizes="240px" className="aspect-[4/3] w-full" /> })),
      rows: [
        { group: "Overview", label: "Price", values: items.map((b) => b.price?.amount), best: "min", fmt: money },
        { label: "Price type", values: items.map((b) => (b.price ? PRICE_TYPE_LABEL[b.price.type] : null)) },
        { label: "Brand origin", values: items.map((b) => brand(b)?.country) },
        { label: "Category", values: items.map((b) => `${cat.categories.find((c) => c.id === b.category)?.name} · ${titleCase(b.subcategory)}`) },
        { label: "Intended use", values: items.map((b) => b.usage.map(titleCase).join(", ")) },
        { label: "Rider level", values: items.map((b) => b.experience.map(titleCase).join(", ")) },
        { group: "Frame & drivetrain", label: "Frame material", values: items.map((b) => b.frameMaterial) },
        { label: "Groupset", values: items.map((b) => b.groupset) },
        { label: "Drivetrain", values: items.map((b) => b.drivetrain) },
        { label: "Brakes", values: items.map((b) => b.brakes) },
        { group: "Wheels & ride", label: "Wheelset", values: items.map((b) => b.wheelset) },
        { label: "Tyres", values: items.map((b) => b.tires) },
        { label: "Wheel size", values: items.map((b) => b.wheelSize) },
        { label: "Tyre clearance", values: items.map((b) => b.tireClearanceMm), best: "max", fmt: (v) => (v == null ? NA : `${v} mm`) },
        { label: "Suspension", values: items.map((b) => (b.suspension === "rigid" ? "Rigid" : `${titleCase(b.suspension)}${b.travel ? ` · ${b.travel}` : ""}`)) },
        { label: "Weight", values: items.map((b) => b.weightKg), best: "min", fmt: (v) => (v == null ? NA : `${v} kg`) },
        { label: "Sizes", values: items.map((b) => b.sizes.join(", ") || null) },
        { group: "Data", label: "Verification", values: items.map((b) => b.provenance.status) },
      ],
    };
  }
  if (kind === "brand") {
    const items = ids.map((id) => cat.brandById.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof cat.brandById.get>>[];
    const models = (id: string) => cat.bikes.filter((b) => b.brandId === id);
    const prices = (id: string) => models(id).map((m) => m.price?.amount).filter((x): x is number => x != null);
    return {
      heads: items.map((b) => ({ id: b.id, title: b.name, sub: b.country, href: `/brands/${b.slug}`, visual: <div className="flex h-full items-center justify-center py-8"><BrandMark name={b.name} color={b.mark?.color} size="lg" /></div> })),
      rows: [
        { label: "Country", values: items.map((b) => b.country) },
        { label: "Region", values: items.map((b) => b.region) },
        { label: "Founded", values: items.map((b) => b.founded), best: "min" },
        { label: "Categories", values: items.map((b) => b.categories.map((c) => cat.categories.find((x) => x.id === c)?.name).join(", ")) },
        { label: "Catalogued models", values: items.map((b) => models(b.id).length), best: "max" },
        { label: "Lowest model price", values: items.map((b) => (prices(b.id).length ? Math.min(...prices(b.id)) : null)), best: "min", fmt: money },
        { label: "Highest model price", values: items.map((b) => (prices(b.id).length ? Math.max(...prices(b.id)) : null)), fmt: money },
        { label: "Official website", values: items.map((b) => b.website?.replace(/^https?:\/\//, "")) },
        { label: "Verification", values: items.map((b) => b.provenance.status) },
      ],
    };
  }
  if (kind === "component") {
    const items = ids.map((id) => cat.componentById.get(id)).filter(Boolean) as Component[];
    const specKeys = Array.from(new Set(items.flatMap((c) => Object.keys(c.specs))));
    const compatKeys = Array.from(new Set(items.flatMap((c) => Object.keys(c.compat)))).filter((k) => !["brakeInterface"].includes(k));
    const fmtAny = (v: unknown): Val => (v == null ? null : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : (v as Val));
    return {
      heads: items.map((c) => ({ id: c.id, title: c.name, sub: `${c.manufacturer} · ${titleCase(c.type)}`, href: `/components/${c.id}`, visual: <div className="flex items-center justify-center py-6"><ComponentGlyph type={c.type} className="h-20 w-20 text-muted" /></div> })),
      rows: [
        { group: "Overview", label: "Type", values: items.map((c) => titleCase(c.type)) },
        { label: "Price", values: items.map((c) => c.price?.amount || null), best: "min", fmt: money },
        { label: "Weight", values: items.map((c) => c.weightG), best: "min", fmt: (v) => (v == null ? NA : formatWeightG(Number(v))) },
        { label: "Material", values: items.map((c) => c.material) },
        { label: "Tier", values: items.map((c) => titleCase(c.tier)) },
        { label: "Intended use", values: items.map((c) => c.discipline.map(titleCase).join(", ")) },
        ...specKeys.map((k, i) => ({ group: i === 0 ? "Specifications" : undefined, label: k, values: items.map((c) => fmtAny(c.specs[k])) })),
        ...compatKeys.map((k, i) => ({ group: i === 0 ? "Compatibility attributes" : undefined, label: titleCase(k.replace(/([A-Z])/g, " $1")), values: items.map((c) => fmtAny((c.compat as Record<string, unknown>)[k])) })),
        { group: "Data", label: "Verification", values: items.map((c) => c.provenance.status) },
      ],
    };
  }
  const items = ids.map((id) => builds.find((b) => b.id === id)).filter(Boolean) as Build[];
  const sums = items.map((b) => summarize(b, cat.componentById));
  const slots = Array.from(new Set(items.flatMap((b) => Object.keys(b.selection)))) as Array<keyof typeof SLOT_LABEL>;
  return {
    heads: items.map((b) => ({ id: b.id, title: b.name, sub: titleCase(b.discipline), href: `/build?id=${b.id}`, visual: <Photo asset={mediaForCategory(b.discipline === "universal" ? "road" : b.discipline)} sizes="240px" className="aspect-[4/3] w-full" label="representative" /> })),
    rows: [
      { group: "Overview", label: "Estimated total", values: sums.map((s) => s.price), best: "min", fmt: money },
      { label: "Listed weight", values: sums.map((s) => (s.weightKnown ? s.weightG : null)), best: "min", fmt: (v) => (v == null ? NA : formatWeightG(Number(v))) },
      { label: "Parts without weight", values: sums.map((s) => s.weightMissing) },
      { label: "Compatibility", values: sums.map((s) => (s.report.overall === "empty" ? null : STATUS_TEXT[s.report.overall as CompatStatus])) },
      { label: "Incompatibilities", values: sums.map((s) => s.report.counts.incompatible), best: "min" },
      ...slots.map((slot, i) => ({ group: i === 0 ? "Components" : undefined, label: SLOT_LABEL[slot], values: items.map((b) => { const c = b.selection[slot] ? cat.componentById.get(b.selection[slot]!) : null; return c ? `${c.manufacturer} ${c.name}` : null; }) })),
    ],
  };
}

export function CompareView() {
  const cat = useCatalog();
  const sp = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const list = useStore(compareStore);
  const builds = useStore(buildsStore);
  const { currency } = useStore(settingsStore);
  const [kind, setKind] = useState<CompareKind>((sp.get("kind") as CompareKind) ?? "bike");
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  // ?kind=bike&ids=a,b → seed the compare list (shareable comparisons)
  useEffect(() => {
    const ids = sp.get("ids");
    const k = sp.get("kind") as CompareKind | null;
    if (ids && k) {
      const add = ids.split(",").filter(Boolean).slice(0, MAX_COMPARE);
      compareStore.set((l) => [...l.filter((x) => x.kind !== k), ...add.map((id) => ({ kind: k, id }))]);
      router.replace(`/compare?kind=${k}`, { scroll: false });
    }
  }, [sp, router]);

  const ids = list.filter((x) => x.kind === kind).map((x) => x.id);
  const { heads, rows } = useMemo(() => rowsFor(kind, ids, cat, builds, currency), [kind, ids, cat, builds, currency]);
  const index = useMemo(() => buildIndex(cat), [cat]);
  const suggestions = useMemo(() => {
    if (kind === "build") return builds.filter((b) => !ids.includes(b.id) && b.name.toLowerCase().includes(q.toLowerCase())).map((b) => ({ id: b.id, title: b.name, subtitle: titleCase(b.discipline) }));
    const map = { bike: "bike", brand: "brand", component: "component" } as const;
    if (!q.trim()) {
      const pool = kind === "bike" ? cat.bikes.slice(0, 8).map((b) => ({ id: b.id, title: `${cat.brandById.get(b.brandId)?.name} ${b.name}`, subtitle: String(b.year) })) : kind === "brand" ? cat.brands.slice(0, 8).map((b) => ({ id: b.id, title: b.name, subtitle: b.country })) : cat.components.filter((c) => c.type === "groupset").slice(0, 8).map((c) => ({ id: c.id, title: `${c.manufacturer} ${c.name}`, subtitle: titleCase(c.type) }));
      return pool.filter((p) => !ids.includes(p.id));
    }
    return search(index, q, { kinds: [map[kind]], limit: 10 }).filter((h) => !ids.includes(h.id));
  }, [kind, q, index, cat, builds, ids]);

  const remove = (id: string) => compareStore.set((l) => l.filter((x) => !(x.kind === kind && x.id === id)));
  const add = (id: string) => { compareStore.set((l) => [...l, { kind, id }]); setQ(""); if (ids.length + 1 >= MAX_COMPARE) setAdding(false); };
  const mixedTypes = kind === "component" && new Set(ids.map((i) => cat.componentById.get(i)?.type)).size > 1;

  const visibleRows = rows.filter((r) => !onlyDiff || new Set(r.values.map((v) => v ?? NA)).size > 1);
  const cols = `minmax(140px,200px) repeat(${Math.max(heads.length, 1) + (heads.length < MAX_COMPARE ? 1 : 0)}, minmax(200px,1fr))`;

  return (
    <div className="container-x py-10 md:py-14">
      <div className="flex flex-wrap items-center gap-4 border-b hairline pb-6">
        <Segmented value={kind} onChange={(v) => { setKind(v); setAdding(false); setQ(""); }} options={KINDS.map((k) => ({ value: k.value, label: <span>{k.label} <span className="text-subtle">{hydrated ? list.filter((x) => x.kind === k.value).length : 0}</span></span> }))} />
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="accent-[#C5F36A]" /> Only show differences</label>
        {ids.length > 0 && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => compareStore.set((l) => l.filter((x) => x.kind !== kind))}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>}
      </div>

      {mixedTypes && <p className="mt-4 text-sm text-warn">You are comparing different component types — specification rows may not line up.</p>}

      {!hydrated ? <div className="skeleton mt-8 h-80" /> : heads.length === 0 && !adding ? (
        <div className="mt-8">
          <EmptyState title={`No ${KINDS.find((k) => k.value === kind)?.label.toLowerCase()} to compare yet`} action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add {kind === "build" ? "a build" : `a ${kind}`}</Button>}>
            {kind === "build" ? <>Save builds in <Link href="/build" className="text-lime link-u">Build a Bike</Link>, then add them here.</> : <>Use the compare button on any {kind} page or tile, or add one here.</>}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-4">
          <div className="min-w-max" style={{ display: "grid", gridTemplateColumns: cols }}>
            {/* header row */}
            <div className="sticky left-0 z-10 bg-ink-950" />
            {heads.map((h) => (
              <div key={h.id} className="relative border-l hairline px-4 pb-5">
                <button onClick={() => remove(h.id)} aria-label={`Remove ${h.title}`} className="absolute right-3 top-0 z-10 text-subtle hover:text-bad"><X className="h-4 w-4" /></button>
                <div className="mx-auto max-w-[240px] opacity-90">{h.visual}</div>
                <p className="label-tech mt-3">{h.sub}</p>
                {h.href ? <Link href={h.href} className="mt-1 block text-[17px] font-medium tracking-tight link-u">{h.title}</Link> : <p className="mt-1 text-[17px] font-medium">{h.title}</p>}
              </div>
            ))}
            {heads.length < MAX_COMPARE && (
              <div className="relative border-l border-dashed hairline px-4 pb-5">
                {adding ? (
                  <div>
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${kind}s…`} className="field" aria-label={`Search ${kind}s to add`} />
                    <ul className="mt-2 max-h-64 overflow-y-auto border hairline">
                      {suggestions.length === 0 && <li className="px-3 py-3 text-xs text-muted">No matches.</li>}
                      {suggestions.map((s) => <li key={s.id}><button onClick={() => add(s.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-ink-700"><span className="block truncate">{s.title}</span><span className="block truncate text-[11px] text-muted">{s.subtitle}</span></button></li>)}
                    </ul>
                    <button onClick={() => setAdding(false)} className="mt-2 text-xs text-muted hover:text-fg">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setAdding(true)} className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 text-sm text-muted hover:text-lime"><Plus className="h-5 w-5" /> Add {kind}</button>
                )}
              </div>
            )}
            {/* rows */}
            {visibleRows.map((r, ri) => {
              const shown = r.values.map((v) => (v == null || v === "" ? NA : r.fmt ? r.fmt(v) : String(v)));
              const differs = new Set(shown).size > 1;
              const nums = r.values.map((v) => (typeof v === "number" ? v : null));
              const valid = nums.filter((n): n is number => n != null);
              const bestVal = r.best && valid.length > 1 ? (r.best === "min" ? Math.min(...valid) : Math.max(...valid)) : null;
              return (
                <div key={`${r.label}-${ri}`} className="contents">
                  {r.group && <div className="col-span-full mt-6 border-b hairline pb-2 label-tech" style={{ gridColumn: "1 / -1" }}>{r.group}</div>}
                  <div className="sticky left-0 z-10 border-b hairline bg-ink-950 py-3 pr-4 text-sm text-muted">{r.label}</div>
                  {shown.map((v, i) => (
                    <div key={i} className={cx("border-b border-l hairline px-4 py-3 text-sm tabular", v === NA ? "italic text-subtle" : differs ? "text-fg" : "text-muted", differs && v !== NA && "bg-white/[0.015]")}>
                      {r.label === "Verification" && v !== NA ? <StatusBadge status={v as "unverified"} /> : v}
                      {bestVal != null && nums[i] === bestVal && <span className="ml-2 rounded-sm bg-lime/15 px-1 font-mono text-[10px] uppercase text-lime">Best</span>}
                    </div>
                  ))}
                  {heads.length < MAX_COMPARE && <div className="border-b border-l border-dashed hairline" />}
                </div>
              );
            })}
          </div>
          {onlyDiff && visibleRows.length === 0 && heads.length > 1 && <p className="mt-6 text-sm text-muted">No differences found in the catalogued data.</p>}
          <p className="mt-6 text-xs text-subtle">“Best” marks the lowest price/weight or highest clearance among items with data. Rows with differing values are emphasised. Values are catalogue data — verify before buying.</p>
        </div>
      )}
    </div>
  );
}
