"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { authConfigured } from "@/lib/supabase/client";
import { getAuth } from "@/lib/auth";
import { createMemoryStore, useStore } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";

type Thing = "garage" | "build" | "wishlist" | "plan" | "history";
interface PromptState { open: boolean; thing: Thing; onLocal: (() => void) | null }
const promptStore = createMemoryStore<PromptState>({ open: false, thing: "garage", onLocal: null });

/**
 * Wrap a "save" action. Browsing never prompts. A guest who saves something gets a friendly choice:
 * sign in / create an account (synced everywhere) or keep it on this device. Without an auth
 * provider configured the action simply runs (device storage), exactly as before.
 */
export function requireAccount(thing: Thing, action: () => void) {
  if (!authConfigured || getAuth().status === "signed-in") return action();
  promptStore.set({ open: true, thing, onLocal: action });
}

export function AccountPrompt() {
  const t = useT();
  const s = useStore(promptStore);
  const path = usePathname();
  const first = useRef<HTMLAnchorElement>(null);
  const close = () => promptStore.set({ ...promptStore.get(), open: false, onLocal: null });
  useEffect(() => {
    if (!s.open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.open]);
  if (!s.open) return null;
  const next = encodeURIComponent(path);
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink-950/75 p-4 backdrop-blur-sm sm:items-center" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="acct-prompt-title" className="relative w-full max-w-md border hairline bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} className="absolute right-3 top-3 p-1.5 text-subtle hover:text-fg" aria-label={t("prompt.close")}><X className="h-4 w-4" /></button>
        <h2 id="acct-prompt-title" className="text-xl font-medium tracking-tight">{t("prompt.title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("prompt.body", { thing: t(`thing.${s.thing}` as TKey) })}</p>
        <div className="mt-6 grid gap-2">
          <Link ref={first} href={`/signup?next=${next}`} onClick={close} className="inline-flex h-11 items-center justify-center bg-lime font-medium text-ink-950 hover:opacity-90">{t("prompt.signUp")}</Link>
          <Link href={`/login?next=${next}`} onClick={close} className="inline-flex h-11 items-center justify-center border border-line-strong hover:border-fg/40">{t("prompt.signIn")}</Link>
          <button onClick={() => { const a = s.onLocal; close(); a?.(); }} className="h-10 text-sm text-muted hover:text-fg">{t("prompt.local")}</button>
        </div>
      </div>
    </div>
  );
}
