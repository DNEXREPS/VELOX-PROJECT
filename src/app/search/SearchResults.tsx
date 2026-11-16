"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { useSearchIndex } from "@/components/layout/CommandSearch";
import { search, type SearchKind } from "@/lib/search";
import { Chip, EmptyState } from "@/components/ui";
import { useCatalog } from "@/lib/state";

const KINDS: Array<[SearchKind | "all", string]> = [["all", "All"], ["brand", "Brands"], ["bike", "Bikes"], ["component", "Components"], ["category", "Categories"]];

export function SearchResults() {
  const sp = useSearchParams();
  const router = useRouter();
  const index = useSearchIndex();
  const cat = useCatalog();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [kind, setKind] = useState<SearchKind | "all">((sp.get("kind") as SearchKind) ?? "all");
  const [brand, setBrand] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => router.replace(q ? `/search?q=${encodeURIComponent(q)}${kind !== "all" ? `&kind=${kind}` : ""}` : "/search", { scroll: false }), 250);
    return () => clearTimeout(t);
  }, [q, kind, router]);

  const all = useMemo(() => search(index, q, { limit: 300 }), [index, q]);
  const hits = all.filter((h) => (kind === "all" || h.kind === kind) && (brand === "all" || h.meta?.brand === brand || h.meta?.manufacturer === brand || (h.kind === "brand" && h.id === brand)));
  const counts = Object.fromEntries(KINDS.map(([k]) => [k, k === "all" ? all.length : all.filter((h) => h.kind === k).length]));
  const brandsInHits = Array.from(new Set(all.filter((h) => h.kind === "bike").map((h) => h.meta!.brand))).map((id) => cat.brandById.get(id)).filter(Boolean);

  return (
    <div className="container-x py-12 md:py-16">
      <p className="eyebrow mb-5">Search</p>
      <div className="relative max-w-3xl">
        <Search className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 text-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brands, models, components, categories…" className="w-full border-b border-line-strong bg-transparent py-4 pl-10 text-[clamp(1.5rem,3vw,2.4rem)] font-medium tracking-tight outline-none placeholder:text-subtle focus:border-lime" aria-label="Search" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {KINDS.map(([k, l]) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{l} <span className="text-subtle">{counts[k]}</span></Chip>)}
        {brandsInHits.length > 1 && (
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="field ml-2 h-8 w-auto py-1 text-[13px]" aria-label="Filter by brand">
            <option value="all">Any brand</option>{brandsInHits.map((b) => <option key={b!.id} value={b!.id}>{b!.name}</option>)}
          </select>
        )}
      </div>

      <div className="mt-10 max-w-4xl">
        {!q.trim() ? (
          <p className="text-muted">Type to search across {cat.brands.length} brands, {cat.bikes.length} bike models and {cat.components.length} components. Typos are tolerated — try “polgon” or “ultegar”.</p>
        ) : hits.length === 0 ? (
          <EmptyState title={`No results for “${q}”`}>Check the spelling, try a broader term (e.g. “gravel”, “Shimano”), or <Link href="/submit" className="text-lime link-u">suggest missing data</Link>.</EmptyState>
        ) : (
          <ul className="border-t hairline">
            {hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link href={h.href} className="group flex items-center gap-6 border-b hairline py-4">
                  <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">{h.kind}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[17px] group-hover:text-lime">{h.title}</span><span className="block truncate text-sm text-muted">{h.subtitle}</span></span>
                  <ArrowUpRight className="h-4 w-4 text-subtle group-hover:text-lime" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
