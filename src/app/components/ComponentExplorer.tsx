"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { Discipline, Tier } from "@/lib/types";
import type { ComponentPage, ComponentSummary } from "@/lib/catalog/types";
import { COMPONENT_GROUPS as GROUPS } from "@/lib/catalog/groups";
import { overlayStore } from "@/lib/state";
import { useStore } from "@/lib/store";
import { ComponentRow } from "@/components/catalog";
import { Button, Chip, DemoNotice, EmptyState } from "@/components/ui";

const TIERS: Tier[] = ["entry", "mid", "performance", "pro"];
const DISCS: Discipline[] = ["road", "gravel", "mtb", "urban", "bmx"];
const PAGE_SIZE = 50;
type Sort = "relevance" | "price-asc" | "price-desc" | "weight";

/**
 * Component explorer. Results come page by page from /api/catalog/components (static catalogue or
 * database, decided on the server), so the page never loads the whole catalogue into the browser.
 */
export function ComponentExplorer() {
  const sp = useSearchParams();
  const [group, setGroup] = useState(sp.get("group") ?? "all");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [mfr, setMfr] = useState(sp.get("mfr") ?? "all");
  const [disc, setDisc] = useState<Discipline | "all">("all");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [sort, setSort] = useState<Sort>("relevance");
  const [items, setItems] = useState<ComponentSummary[]>([]);
  const [meta, setMeta] = useState<Pick<ComponentPage, "total" | "manufacturers"> | null>(null);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const overlay = useStore(overlayStore); // administrator edits made on this device (demo mode)
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 250); return () => clearTimeout(t); }, [q]);
  // any filter change starts again at page 1
  useEffect(() => { setPage(1); }, [group, debouncedQ, mfr, disc, tier, sort]);

  useEffect(() => {
    inflight.current?.abort();
    const ctrl = new AbortController(); inflight.current = ctrl;
    const params = new URLSearchParams({ group, sort, page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (mfr !== "all") params.set("brand", mfr);
    if (disc !== "all") params.set("disc", disc);
    if (tier !== "all") params.set("tier", tier);
    setState("loading");
    fetch(`/api/catalog/components?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() as Promise<ComponentPage> : Promise.reject(new Error(String(r.status)))))
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setMeta({ total: res.total, manufacturers: res.manufacturers });
        setState("ready");
      })
      .catch((e) => { if ((e as Error).name !== "AbortError") setState("error"); });
    return () => ctrl.abort();
  }, [group, debouncedQ, mfr, disc, tier, sort, page, reload]);

  // an administrator's unpublished edits on this device replace the published record in the list
  const shown = items.map((c) => (overlay.components[c.id] as ComponentSummary | undefined) ?? c);
  const total = meta?.total ?? 0;

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
        <select value={mfr} onChange={(e) => setMfr(e.target.value)} className="field w-auto" aria-label="Manufacturer"><option value="all">All manufacturers</option>{(meta?.manufacturers ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field w-auto" aria-label="Sort"><option value="relevance">Relevance</option><option value="price-asc">Price ↑</option><option value="price-desc">Price ↓</option><option value="weight">Lightest</option></select>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5"><span className="label-tech mr-1">Discipline</span><Chip active={disc === "all"} onClick={() => setDisc("all")}>Any</Chip>{DISCS.map((d) => <Chip key={d} active={disc === d} onClick={() => setDisc(d)}>{d === "mtb" || d === "bmx" ? d.toUpperCase() : d[0].toUpperCase() + d.slice(1)}</Chip>)}</div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="label-tech mr-1">Tier</span><Chip active={tier === "all"} onClick={() => setTier("all")}>Any</Chip>{TIERS.map((t) => <Chip key={t} active={tier === t} onClick={() => setTier(t)}>{t[0].toUpperCase() + t.slice(1)}</Chip>)}</div>
      </div>

      <div className="mt-8 flex items-center justify-between border-b hairline pb-3 text-sm">
        <span className="text-muted" aria-live="polite">
          {state === "loading" && page === 1 ? <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Searching…</span> : <><span className="tabular text-fg" data-testid="component-total">{total}</span> components</>}
        </span>
        <span className="hidden gap-16 label-tech md:flex"><span>Weight</span><span className="w-40 text-right">Price</span><span className="w-10" /></span>
      </div>
      {state === "error" ? (
        <div className="mt-8"><EmptyState title="The catalogue could not be loaded">Please try again in a moment. <button className="text-lime underline-offset-4 hover:underline" onClick={() => setReload((n) => n + 1)}>Retry</button></EmptyState></div>
      ) : state === "ready" && shown.length === 0 ? (
        <div className="mt-8"><EmptyState title="No components match">Try another manufacturer, tier or search term.</EmptyState></div>
      ) : (
        <div aria-busy={state === "loading"} className={state === "loading" && page === 1 ? "opacity-60" : undefined}>{shown.map((c) => <ComponentRow key={c.id} c={c} />)}</div>
      )}
      {state !== "error" && shown.length < total && (
        <div className="mt-6 flex items-center gap-4">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={state === "loading"}>
            {state === "loading" && page > 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Load more
          </Button>
          <span className="text-sm text-muted">Showing {shown.length} of {total}</span>
        </div>
      )}
      <DemoNotice className="mt-12" />
    </div>
  );
}
