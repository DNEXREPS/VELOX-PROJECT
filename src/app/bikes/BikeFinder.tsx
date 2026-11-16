"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, RotateCcw, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { useCatalog } from "@/lib/state";
import { findBikes, type FinderCriteria } from "@/lib/finder";
import type { CategoryId, Experience, Usage, WheelSize } from "@/lib/types";
import { BikeTile } from "@/components/catalog";
import { Button, Chip, DemoNotice, EmptyState, Field, Segmented, Skeleton } from "@/components/ui";
import { cx, formatIdrShort } from "@/lib/format";
import { useHydrated } from "@/lib/store";

const BUDGETS: Array<[string, number | null]> = [["Any", null], ["≤ 5 jt", 5e6], ["≤ 10 jt", 1e7], ["≤ 20 jt", 2e7], ["≤ 50 jt", 5e7], ["≤ 100 jt", 1e8]];
const USAGES: Array<[Usage, string]> = [["commuting", "Commuting"], ["fitness", "Fitness"], ["racing", "Racing"], ["trail", "Trail"], ["downhill", "Downhill"], ["touring", "Touring"], ["bikepacking", "Bikepacking"], ["leisure", "Leisure"], ["tricks", "Tricks / Park"], ["cargo", "Cargo"]];
const WHEELS: WheelSize[] = ["700c", "650b", "29", "27.5", "26", "20", "16"];

const DEFAULTS: FinderCriteria = { category: "all", subcategory: "all", region: "all", country: "all", experience: "any", usage: [], material: "all", groupsetBrand: "all", brakes: "all", wheelSize: "all", suspension: "all", includeDiscontinued: false, sort: "match", budgetMax: null, q: "" };

function fromParams(sp: URLSearchParams): FinderCriteria {
  return {
    ...DEFAULTS,
    category: (sp.get("category") as CategoryId) ?? "all",
    subcategory: sp.get("sub") ?? "all",
    region: (sp.get("region") as FinderCriteria["region"]) ?? "all",
    brandIds: sp.get("brand") ? [sp.get("brand")!] : [],
    budgetMax: sp.get("max") ? Number(sp.get("max")) : null,
    experience: (sp.get("exp") as Experience) ?? "any",
    usage: (sp.get("use")?.split(",").filter(Boolean) as Usage[]) ?? [],
    q: sp.get("q") ?? "",
  };
}

export function BikeFinder() {
  const cat = useCatalog();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [c, setC] = useState<FinderCriteria>(() => fromParams(new URLSearchParams(sp.toString())));
  const [filtersOpen, setFiltersOpen] = useState(false);

  // keep shareable URL in sync with the main criteria
  useEffect(() => {
    const p = new URLSearchParams();
    if (c.category && c.category !== "all") p.set("category", c.category);
    if (c.subcategory && c.subcategory !== "all") p.set("sub", c.subcategory);
    if (c.region && c.region !== "all") p.set("region", c.region);
    if (c.brandIds?.[0]) p.set("brand", c.brandIds[0]);
    if (c.budgetMax) p.set("max", String(c.budgetMax));
    if (c.experience && c.experience !== "any") p.set("exp", c.experience);
    if (c.usage?.length) p.set("use", c.usage.join(","));
    if (c.q) p.set("q", c.q);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [c.category, c.subcategory, c.region, c.brandIds, c.budgetMax, c.experience, c.usage, c.q, pathname, router]);

  const set = <K extends keyof FinderCriteria>(k: K, v: FinderCriteria[K]) => setC((p) => ({ ...p, [k]: v }));
  const results = useMemo(() => findBikes(cat.bikes, cat.brandById, c), [cat, c]);
  const category = cat.categories.find((x) => x.id === c.category);
  const countries = useMemo(() => Array.from(new Set(cat.brands.map((b) => b.country))).sort(), [cat.brands]);
  const brandsForFilter = useMemo(() => cat.brands.filter((b) => (c.region === "all" || b.region === c.region) && cat.bikes.some((m) => m.brandId === b.id)), [cat, c.region]);
  const activeCount = [c.category !== "all", c.subcategory !== "all", c.region !== "all", c.country !== "all", !!c.brandIds?.length, c.budgetMax != null, c.experience !== "any", !!c.usage?.length, c.material !== "all", c.groupsetBrand !== "all", c.brakes !== "all", c.wheelSize !== "all", c.suspension !== "all", !!c.includeDiscontinued, !!c.q].filter(Boolean).length;

  const filters = (
    <div className="flex flex-col gap-7">
      <Field label="Category">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={c.category === "all"} onClick={() => setC((p) => ({ ...p, category: "all", subcategory: "all" }))}>All</Chip>
          {cat.categories.map((k) => <Chip key={k.id} active={c.category === k.id} onClick={() => setC((p) => ({ ...p, category: k.id, subcategory: "all" }))}>{k.name}</Chip>)}
        </div>
      </Field>
      {category && (
        <Field label={`${category.name} type`} htmlFor="f-sub">
          <select id="f-sub" className="field" value={c.subcategory} onChange={(e) => set("subcategory", e.target.value)}>
            <option value="all">All {category.name.toLowerCase()} types</option>
            {category.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Brand origin">
        <Segmented value={c.region ?? "all"} onChange={(v) => setC((p) => ({ ...p, region: v, brandIds: [] }))} options={[{ value: "all", label: "All" }, { value: "Indonesia", label: "Indonesian" }, { value: "International", label: "International" }]} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand" htmlFor="f-brand">
          <select id="f-brand" className="field" value={c.brandIds?.[0] ?? ""} onChange={(e) => set("brandIds", e.target.value ? [e.target.value] : [])}>
            <option value="">All brands</option>
            {brandsForFilter.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Country" htmlFor="f-country">
          <select id="f-country" className="field" value={c.country} onChange={(e) => set("country", e.target.value)}>
            <option value="all">Any</option>
            {countries.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frame material" htmlFor="f-mat">
          <select id="f-mat" className="field" value={c.material} onChange={(e) => set("material", e.target.value as FinderCriteria["material"])}>
            <option value="all">Any</option><option value="aluminium">Aluminium</option><option value="carbon">Carbon</option><option value="steel">Steel</option><option value="titanium">Titanium</option>
          </select>
        </Field>
        <Field label="Groupset" htmlFor="f-gs">
          <select id="f-gs" className="field" value={c.groupsetBrand} onChange={(e) => set("groupsetBrand", e.target.value as FinderCriteria["groupsetBrand"])}>
            <option value="all">Any</option><option value="shimano">Shimano</option><option value="sram">SRAM</option><option value="campagnolo">Campagnolo</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="Brakes" htmlFor="f-brake">
          <select id="f-brake" className="field" value={c.brakes} onChange={(e) => set("brakes", e.target.value as FinderCriteria["brakes"])}>
            <option value="all">Any</option><option value="disc">Disc (any)</option><option value="hydraulic">Hydraulic disc</option><option value="rim">Rim</option>
          </select>
        </Field>
        <Field label="Wheel size" htmlFor="f-wheel">
          <select id="f-wheel" className="field" value={c.wheelSize} onChange={(e) => set("wheelSize", e.target.value as FinderCriteria["wheelSize"])}>
            <option value="all">Any</option>{WHEELS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Suspension">
        <Segmented value={c.suspension ?? "all"} onChange={(v) => set("suspension", v)} options={[{ value: "all", label: "Any" }, { value: "rigid", label: "Rigid" }, { value: "front", label: "Hardtail" }, { value: "full", label: "Full" }]} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-muted">
        <input type="checkbox" checked={!!c.includeDiscontinued} onChange={(e) => set("includeDiscontinued", e.target.checked)} className="h-4 w-4 accent-[#C5F36A]" />
        Include discontinued & historical models
      </label>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setC(DEFAULTS)}><RotateCcw className="h-3.5 w-3.5" /> Reset all filters</Button>
    </div>
  );

  return (
    <div className="container-x py-10 md:py-14">
      {/* primary intent row */}
      <section aria-label="Your riding profile" className="grid gap-8 border-b hairline pb-10 lg:grid-cols-[1.1fr_1fr_1.4fr] [&>*]:min-w-0">
        <Field label="Budget (IDR)">
          <div className="flex flex-wrap gap-1.5">
            {BUDGETS.map(([l, v]) => <Chip key={l} active={c.budgetMax === v} onClick={() => set("budgetMax", v)}>{l}</Chip>)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted">Rp</span>
            <input type="number" inputMode="numeric" min={0} step={500000} placeholder="Custom maximum" aria-label="Custom maximum budget in Rupiah" className="field tabular" value={c.budgetMax ?? ""} onChange={(e) => set("budgetMax", e.target.value ? Number(e.target.value) : null)} />
          </div>
        </Field>
        <Field label="Experience">
          <Segmented value={c.experience ?? "any"} onChange={(v) => set("experience", v)} options={[{ value: "any", label: "Any" }, { value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]} className="flex-wrap" />
        </Field>
        <Field label="How you'll ride">
          <div className="flex flex-wrap gap-1.5">
            {USAGES.map(([u, l]) => <Chip key={u} active={c.usage?.includes(u)} onClick={() => set("usage", c.usage?.includes(u) ? c.usage.filter((x) => x !== u) : [...(c.usage ?? []), u])}>{l}</Chip>)}
          </div>
        </Field>
      </section>

      <div className="grid gap-10 pt-10 lg:grid-cols-[280px_1fr] [&>*]:min-w-0">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filters}</div>
        </aside>

        <section aria-label="Results" aria-live="polite">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted"><span className="tabular text-fg">{results.length}</span> {results.length === 1 ? "bike" : "bikes"} {c.budgetMax ? `under ${formatIdrShort(c.budgetMax)}` : ""}</p>
            <input type="search" placeholder="Filter by name…" value={c.q} onChange={(e) => set("q", e.target.value)} className="field h-9 max-w-52 py-1.5" aria-label="Filter results by name" />
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setFiltersOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-sm border hairline px-3 text-[13px] text-muted lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters{activeCount ? ` (${activeCount})` : ""}
              </button>
              <label htmlFor="f-sort" className="label-tech hidden sm:block">Sort</label>
              <select id="f-sort" className="field h-9 w-auto py-1.5" value={c.sort} onChange={(e) => set("sort", e.target.value as FinderCriteria["sort"])}>
                <option value="match">Best match</option>
                <option value="value">Best value</option>
                <option value="price-asc">Price: low → high</option>
                <option value="price-desc">Price: high → low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {!hydrated ? (
            <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[5/4]" />)}</div>
          ) : results.length === 0 ? (
            <EmptyState title="No bikes match every filter" action={<Button variant="secondary" onClick={() => setC(DEFAULTS)}>Reset filters</Button>}>
              Try a higher budget, a different category or fewer specification filters. Brands without catalogued models can still be explored in the Brand Explorer.
            </EmptyState>
          ) : (
            <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 2xl:grid-cols-3">
              {results.map((r, i) => (
                <BikeTile key={r.bike.id} bike={r.bike} brand={r.brand}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="label-tech w-16">{c.sort === "match" && i < 3 ? `#${i + 1} match` : "Match"}</span>
                      <div className="h-px flex-1 bg-line"><div className="h-px bg-lime" style={{ width: `${r.score}%` }} /></div>
                      <span className="tabular font-mono text-[11px] text-muted">{r.score}</span>
                    </div>
                    <ul className="space-y-1.5 text-[13px]">
                      {r.reasons.slice(0, 2).map((x) => <li key={x} className="flex gap-2 text-muted"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" />{x}</li>)}
                      {r.cautions.slice(0, 1).map((x) => <li key={x} className="flex gap-2 text-subtle"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn/80" />{x}</li>)}
                    </ul>
                  </div>
                </BikeTile>
              ))}
            </div>
          )}
          <DemoNotice className="mt-14" />
        </section>
      </div>

      {/* mobile filters drawer */}
      <div className={cx("fixed inset-0 z-[80] lg:hidden", filtersOpen ? "" : "pointer-events-none")} aria-hidden={!filtersOpen}>
        <div className={cx("absolute inset-0 bg-ink-950/70 transition-opacity", filtersOpen ? "opacity-100" : "opacity-0")} onClick={() => setFiltersOpen(false)} />
        <div role="dialog" aria-label="Filters" className={cx("absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l hairline bg-ink-900 p-6 transition-transform duration-300", filtersOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="mb-6 flex items-center justify-between"><p className="text-lg font-medium">Filters</p><button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X className="h-5 w-5" /></button></div>
          {filters}
          <Button className="mt-8 w-full" onClick={() => setFiltersOpen(false)}>Show {results.length} bikes</Button>
        </div>
      </div>
    </div>
  );
}
