"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, LayoutGrid, List, Search } from "lucide-react";
import { useCatalog } from "@/lib/catalog-client";
import type { CategoryId } from "@/lib/types";
import { BrandMark } from "@/components/Glyphs";
import { CompareButton } from "@/components/catalog";
import { Chip, EmptyState, Segmented, StatusBadge } from "@/components/ui";
import { editDistance } from "@/lib/search";
import { cx } from "@/lib/format";

type Sort = "az" | "models" | "founded";

export function BrandExplorer() {
  const cat = useCatalog();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [region, setRegion] = useState<"all" | "Indonesia" | "International">((sp.get("region") as "Indonesia") ?? "all");
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState<CategoryId | "all">((sp.get("category") as CategoryId) ?? "all");
  const [sort, setSort] = useState<Sort>("az");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [kind, setKind] = useState<"all" | "bicycles" | "wheels" | "components">((sp.get("kind") as "wheels") ?? "all");

  const modelCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of cat.bikes) m.set(b.brandId, (m.get(b.brandId) ?? 0) + 1);
    return m;
  }, [cat.bikes]);
  const countries = useMemo(() => Array.from(new Set(cat.brands.filter((b) => region === "all" || b.region === region).map((b) => b.country))).sort(), [cat.brands, region]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cat.brands
      .filter((b) => region === "all" || b.region === region)
      .filter((b) => country === "all" || b.country === country)
      .filter((b) => category === "all" || b.categories.includes(category))
      .filter((b) => kind === "all" || (kind === "bicycles" ? b.kinds?.some((k) => k === "bicycles" || k === "frames" || k === "e-bikes") : b.kinds?.includes(kind)))
      .filter((b) => {
        if (!term) return true;
        const n = b.name.toLowerCase();
        return n.includes(term) || b.country.toLowerCase().includes(term) || (term.length >= 4 && editDistance(term, n.slice(0, term.length + 1), 2) <= 1);
      })
      .sort((a, b) => (sort === "models" ? (modelCount.get(b.id) ?? 0) - (modelCount.get(a.id) ?? 0) : sort === "founded" ? (a.founded ?? 9999) - (b.founded ?? 9999) : a.name.localeCompare(b.name)));
  }, [cat.brands, region, country, category, q, sort, modelCount, kind]);

  const local = cat.brands.filter((b) => b.region === "Indonesia").length;

  return (
    <div className="container-x py-10 md:py-14">
      <div className="flex flex-col gap-5 border-b hairline pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands or countries…" className="field pl-9" aria-label="Search brands" />
          </div>
          <Segmented value={region} onChange={(v) => { setRegion(v); setCountry("all"); }} options={[{ value: "all", label: `All (${cat.brands.length})` }, { value: "Indonesia", label: `Indonesian (${local})` }, { value: "International", label: `International (${cat.brands.length - local})` }]} />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="field w-auto" aria-label="Country"><option value="all">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field w-auto" aria-label="Sort"><option value="az">A → Z</option><option value="models">Most models</option><option value="founded">Oldest first</option></select>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"} className={cx("flex h-9 w-9 items-center justify-center rounded-sm", view === "grid" ? "bg-ink-700 text-fg" : "text-muted")}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"} className={cx("flex h-9 w-9 items-center justify-center rounded-sm", view === "list" ? "bg-ink-700 text-fg" : "text-muted")}><List className="h-4 w-4" /></button>
          </div>
        </div>
        <Segmented value={kind} onChange={setKind} options={[{ value: "all", label: "All makers" }, { value: "bicycles", label: "Bicycles & frames" }, { value: "wheels", label: "Wheels" }, { value: "components", label: "Components" }]} className="w-fit" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>All categories</Chip>
          {cat.categories.map((c) => <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Chip>)}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted"><span className="tabular text-fg">{list.length}</span> brands</p>

      {list.length === 0 ? (
        <div className="mt-6"><EmptyState title="No brands match" action={<Link href="/submit?kind=brand" className="text-sm text-lime link-u">Suggest a brand we&apos;re missing</Link>}>Clear a filter or check the spelling.</EmptyState></div>
      ) : view === "grid" ? (
        <ul className="mt-6 grid grid-cols-1 border-l border-t hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((b) => (
            <li key={b.id} className="group relative border-b border-r hairline p-6 transition-colors hover:bg-ink-900">
              <Link href={`/brands/${b.slug}`} className="absolute inset-0" aria-label={b.name} />
              <div className="flex items-start justify-between">
                <BrandMark name={b.name} color={b.mark?.color} />
                <ArrowUpRight className="h-4 w-4 text-subtle transition-colors group-hover:text-lime" />
              </div>
              <h2 className="mt-8 text-xl font-medium tracking-tight">{b.name}</h2>
              <p className="mt-1 text-sm text-muted">{b.country}{b.founded ? ` · Est. ${b.founded}` : ""}</p>
              <p className="mt-1 text-xs text-subtle">{(b.kinds ?? []).filter((k) => !["oem-manufacturer", "private-label", "distributor"].includes(k)).join(" · ")}{b.provenance.sources.some((x) => x.type && x.type !== "editorial-seed") ? " · researched" : ""}</p>
              <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-subtle">{b.description}</p>
              <div className="relative mt-5 flex items-center justify-between">
                <span className="label-tech">{modelCount.get(b.id) ?? 0} models</span>
                <CompareButton kind="brand" id={b.id} label={b.name} compact />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b hairline text-left"><th className="py-3 font-normal label-tech">Brand</th><th className="hidden py-3 font-normal label-tech md:table-cell">Country</th><th className="hidden py-3 font-normal label-tech md:table-cell">Founded</th><th className="hidden py-3 font-normal label-tech lg:table-cell">Categories</th><th className="py-3 text-right font-normal label-tech">Models</th></tr></thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-b hairline hover:bg-ink-900">
                <td className="py-3"><Link href={`/brands/${b.slug}`} className="flex items-center gap-3"><BrandMark name={b.name} color={b.mark?.color} size="sm" /><span>{b.name}</span>{b.region === "Indonesia" && <span className="label-tech text-lime">ID</span>}</Link></td>
                <td className="hidden py-3 text-muted md:table-cell">{b.country}</td>
                <td className="hidden py-3 tabular text-muted md:table-cell">{b.founded ?? "—"}</td>
                <td className="hidden py-3 text-muted lg:table-cell">{b.categories.map((c) => cat.categories.find((x) => x.id === c)?.name).join(", ")}</td>
                <td className="py-3 text-right tabular">{modelCount.get(b.id) ?? 0} <StatusBadge status={b.provenance.status} className="ml-2 hidden sm:inline-flex" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
