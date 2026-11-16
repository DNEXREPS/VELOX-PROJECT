"use client";
import { useSyncExternalStore } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cx } from "@/lib/format";

type Tone = "success" | "info" | "error";
interface ToastItem { id: number; title: string; body?: string; tone: Tone; action?: { label: string; href: string } }

let items: ToastItem[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(title: string, opts: { body?: string; tone?: Tone; action?: { label: string; href: string } } = {}) {
  const t: ToastItem = { id: ++seq, title, body: opts.body, tone: opts.tone ?? "success", action: opts.action };
  items = [...items.slice(-3), t];
  emit();
  setTimeout(() => dismiss(t.id), 4200);
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const EMPTY: ToastItem[] = [];
export function Toaster() {
  const list = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => items, () => EMPTY);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:items-end">
      {list.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 border border-line-strong bg-ink-800/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur">
          <span className={cx("mt-0.5", t.tone === "success" ? "text-lime" : t.tone === "error" ? "text-bad" : "text-info")}>
            {t.tone === "success" ? <Check className="h-4 w-4" /> : t.tone === "error" ? <TriangleAlert className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
            {t.action && <a href={t.action.href} className="mt-1.5 inline-block text-xs font-medium text-lime link-u">{t.action.label} →</a>}
          </div>
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-subtle hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
