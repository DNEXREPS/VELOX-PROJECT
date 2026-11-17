"use client";
import { useId, useState } from "react";
import { findTerm, type Term as TermT } from "@/lib/glossary";
import { useLang } from "@/lib/i18n";

/**
 * Inline explanation of a cycling term: dotted underline, opens on hover, keyboard focus or tap.
 * Advanced information stays visible; the explanation is opt-in.
 */
export function Term({ term, children }: { term: TermT; children: React.ReactNode }) {
  const lang = useLang();
  const id = useId();
  const [open, setOpen] = useState(false);
  const d = lang === "id" ? term.id_ : term.en;
  return (
    <span className="relative inline-flex">
      <button type="button" aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className="cursor-help border-b border-dotted border-current/60 text-left leading-tight">
        {children}
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[80vw] border border-line-strong bg-ink-800 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-fg shadow-xl shadow-black/50">
          <span className="mb-1 block font-medium text-lime">{d.term}</span>{d.text}
        </span>
      )}
    </span>
  );
}

/** Renders a label, explained when it is a known cycling term. */
export function TermLabel({ label }: { label: string }) {
  const term = findTerm(label);
  return term ? <Term term={term}>{label}</Term> : <>{label}</>;
}
