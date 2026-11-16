"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCatalog } from "@/lib/state";
import type { ComponentType, Discipline, Tier } from "@/lib/types";
import { ComponentRow } from "@/components/catalog";
import { Chip, DemoNotice, EmptyState } from "@/components/ui";
import { search as runSearch, buildIndex } from "@/lib/search";

const GROUPS: Array<{ id: string; label: string; types: ComponentType[] }> = [
  { id: "all", label: "All", types: [] },
  { id: "groupsets", label: "Groupsets", types: ["groupset"] },
  { id: "drivetrain", label: "Drivetrain parts", types: ["shifters", "front-derailleur", "rear-derailleur", "crankset", "cassette", "chain"] },
  { id: "wheels", label: "Wheels & rims", types: ["wheelset", "rim"] },
  { id: "tires", label: "Tyres", types: ["tires"] },
  { id: "brakes", label: "Brakes", types: ["brakes"] },
  { id: "frames", label: "Frames & forks", types: ["frame", "fork"] },
  { id: "cockpit", label: "Cockpit & contact", types: ["handlebar", "stem", "saddle", "seatpost", "pedals"] },
  { id: "hubs", label: "Hubs & bearings", types: ["hub", "bearing"] },
  { id: "accessories", label: "Accessories", types: ["accessory"] },
];
const TIERS: Tier[] = ["entry", "mid", "performance", "pro"];
const DISCS: Discipline[] = ["road", "gravel", "mtb", "urban", "bmx"];

export function ComponentExplorer() {
  const cat = useCatalog();
  const sp = useSearchParams();
  const [group, setGroup] = useState(sp.get("group") ?? "all");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [mfr, setMfr] = useState(sp.get("mfr") ?? "all");
  const [disc, setDisc] = useState<Discipline | "all">("all");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [sort, setSort] = useState<"relevance" | "price-asc" | "price-desc" | "weight">("relevance");

  const index = useMemo(() => buildIndex({ ...cat, brands: [], bikes: [], categories: [] }), [cat]);
  const types = GROUPS.find((g) => g.id === group)?.types ?? [];
  const manufacturers = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cat.components) if (!types.length || types.includes(c.type)) m.set(c.manufacturerSlug, c.manufacturer);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [cat.components, types]);

  const list = useMemo(() => {
    let items = cat.components;
    if (q.trim()) {
      const rank = new Map(runSearch(index, q, { kinds: ["component"], limit: 500 }).map((h, i) => [h.id, i]));
      items = items.filter((c) => rank.has(c.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }
    items = items.filter((c) => (!types.length || types.includes(c.type)) && (mfr === "all" || c.manufacturerSlug === mfr) && (disc === "all" || c.discipline.includes(disc) || c.discipline.includes("universal")) && (tier === "all" || c.tier === tier));
    if (sort === "price-asc") items = [...items].sort((a, b) => (a.price?.amount || Infinity) - (b.price?.amount || Infinity));
    if (sort === "price-desc") items = [...items].sort((a, b) => (b.price?.amount ?? -1) - (a.price?.amount ?? -1));
    if (sort === "weight") items = [...items].sort((a, b) => (a.weightG ?? Infinity) - (b.weightG ?? Infinity));
    return items;
  }, [cat.components, index, q, types, mfr, disc, tier, sort]);

  return (
    <div className="container-x py-10 md:py-14">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div role="tablist" aria-label="Component type" className="flex min-w-max gap-6 border-b hairline">
          {GROUPS.map((g) => (
            <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => { setGroup(g.id); setMfr("all"); }} className={`relative pb-3 text-sm transition-colors ${group === g.id ? "text-fg" : "text-muted hover:text-fg"}`}>
              {g.label}
              {group === g.id && <span className="absolute inset-x-0 -bottom-px h-px bg-lime" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. “105 Di2”, “tubeless 40”, “XD”…" className="field pl-9" aria-label="Search components" />
        </div>
        <select value={mfr} onChange={(e) => setMfr(e.target.value)} className="field w-auto" aria-label="Manufacturer"><option value="all">All manufacturers</option>{manufacturers.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field w-auto" aria-label="Sort"><option value="relevance">Relevance</option><option value="price-asc">Price ↑</option><option value="price-desc">Price ↓</option><option value="weight">Lightest</option></select>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5"><span className="label-tech mr-1">Discipline</span><Chip active={disc === "all"} onClick={() => setDisc("all")}>Any</Chip>{DISCS.map((d) => <Chip key={d} active={disc === d} onClick={() => setDisc(d)}>{d === "mtb" || d === "bmx" ? d.toUpperCase() : d[0].toUpperCase() + d.slice(1)}</Chip>)}</div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="label-tech mr-1">Tier</span><Chip active={tier === "all"} onClick={() => setTier("all")}>Any</Chip>{TIERS.map((t) => <Chip key={t} active={tier === t} onClick={() => setTier(t)}>{t[0].toUpperCase() + t.slice(1)}</Chip>)}</div>
      </div>

      <div className="mt-8 flex items-center justify-between border-b hairline pb-3 text-sm">
        <span className="text-muted"><span className="tabular text-fg">{list.length}</span> components</span>
        <span className="hidden gap-16 label-tech md:flex"><span>Weight</span><span className="w-40 text-right">Price</span><span className="w-10" /></span>
      </div>
      {list.length === 0 ? (
        <div className="mt-8"><EmptyState title="No components match">Try another manufacturer, tier or search term.</EmptyState></div>
      ) : (
        <div>{list.slice(0, 200).map((c) => <ComponentRow key={c.id} c={c} />)}</div>
      )}
      {list.length > 200 && <p className="mt-4 text-sm text-muted">Showing first 200 — refine your search to see more.</p>}
      <DemoNotice className="mt-12" />
    </div>
  );
}
