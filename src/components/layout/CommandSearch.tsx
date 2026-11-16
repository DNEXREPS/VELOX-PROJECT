"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import { useCatalog } from "@/lib/state";
import { buildIndex, search, type SearchHit, type SearchKind } from "@/lib/search";
import { cx } from "@/lib/format";

const KIND_LABEL: Record<SearchKind, string> = { brand: "Brand", bike: "Bike", component: "Component", category: "Category" };
const SUGGESTIONS = ["Polygon Strattos", "Shimano 105 Di2", "Gravel", "Indonesia", "29 x 2.4", "Brompton", "Zipp 303"];

export function useSearchIndex() {
  const cat = useCatalog();
  return useMemo(() => buildIndex(cat), [cat]);
}

export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const index = useSearchIndex();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits: SearchHit[] = useMemo(() => search(index, q, { limit: 12 }), [index, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const go = (href: string) => { onClose(); router.push(href); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[active]) go(hits[active].href);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink-950/80 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Search VELOX" className="w-full max-w-2xl animate-fade-up border border-line-strong bg-ink-900 shadow-2xl shadow-black/60" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b hairline px-4">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKey}
            placeholder="Search brands, bikes, components, categories…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            aria-label="Search query"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="cmd-results"
          />
          <button onClick={onClose} aria-label="Close search" className="text-subtle hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
        <div id="cmd-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {!q && (
            <div className="p-3">
              <p className="label-tech mb-3">Try</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="rounded-sm border hairline px-2.5 py-1 text-[13px] text-muted hover:border-line-strong hover:text-fg">{s}</button>
                ))}
              </div>
            </div>
          )}
          {q && hits.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted">
              No matches for “{q}”. Check the spelling or try a brand, model or component type.
            </div>
          )}
          {hits.map((h, i) => (
            <button
              key={`${h.kind}-${h.id}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h.href)}
              className={cx("flex w-full items-center gap-4 rounded-sm px-3 py-2.5 text-left", i === active ? "bg-ink-700" : "")}
            >
              <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">{KIND_LABEL[h.kind]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{h.title}</span>
                <span className="block truncate text-xs text-muted">{h.subtitle}</span>
              </span>
              {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
            </button>
          ))}
          {q && (
            <button
              onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
              onMouseEnter={() => setActive(hits.length)}
              className={cx("mt-1 flex w-full items-center justify-between rounded-sm border-t hairline px-3 py-3 text-left text-sm text-muted", active === hits.length && "bg-ink-700 text-fg")}
            >
              See all results for “{q}” <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 border-t hairline px-4 py-2 text-[11px] text-subtle">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
