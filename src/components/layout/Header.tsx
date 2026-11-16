"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Gauge, Menu, Search, Sparkles, Stethoscope, User, X } from "lucide-react";
import { VeloxLogo } from "@/components/Glyphs";
import { CommandSearch } from "./CommandSearch";
import { compareStore, sessionStore, settingsStore } from "@/lib/state";
import { useStore } from "@/lib/store";
import { cx } from "@/lib/format";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/bikes", label: "Bike Finder" },
  { href: "/build", label: "Build a Bike" },
  { href: "/upgrade", label: "Upgrade Advisor" },
  { href: "/brands", label: "Brands" },
  { href: "/components", label: "Components" },
  { href: "/compare", label: "Compare" },
  { href: "/garage", label: "My Garage" },
];

export const TOOLS = [
  { href: "/mechanic", label: "AI Mechanic", tagline: "Understand your bike. Diagnose smarter.", icon: Stethoscope },
  { href: "/visualizer", label: "AI Bike Visualizer", tagline: "See your next build.", icon: Sparkles },
  { href: "/simulator", label: "Upgrade Simulator", tagline: "Weight and cost, calculated.", icon: Gauge },
];

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const compare = useStore(compareStore);
  const session = useStore(sessionStore);
  const settings = useStore(settingsStore);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") setToolsOpen(false);
    };
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onClick = (e: MouseEvent) => { if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false); };
    onScroll();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll); document.removeEventListener("mousedown", onClick); };
  }, []);

  useEffect(() => { setMenuOpen(false); setToolsOpen(false); }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const toolsActive = TOOLS.some((t) => isActive(t.href));
  const overHero = pathname === "/" && !scrolled && !menuOpen;

  return (
    <>
      <header className={cx("fixed inset-x-0 top-0 z-50 border-b transition-[background,border-color] duration-500", overHero ? "border-transparent bg-transparent" : "border-line bg-ink-950/85 backdrop-blur-xl")}>
        <div className="container-x flex h-[68px] items-center gap-8">
          <Link href="/" aria-label="VELOX home" className="shrink-0"><VeloxLogo /></Link>
          <nav aria-label="Primary" className="hidden flex-1 items-center gap-0.5 xl:flex">
            {NAV.slice(1).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cx("group relative rounded-full px-3 py-1.5 text-[13px] tracking-[-0.005em] transition-colors", isActive(n.href) ? "text-fg" : "text-fg/60 hover:text-fg")}
              >
                {n.label}
                {n.href === "/compare" && compare.length > 0 && <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 font-mono text-[10px] text-ink-950">{compare.length}</span>}
                <span className={cx("absolute inset-x-3 -bottom-[17px] h-px origin-left bg-lime transition-transform duration-300", isActive(n.href) ? "scale-x-100" : "scale-x-0")} />
              </Link>
            ))}
            <div ref={toolsRef} className="relative">
              <button
                onClick={() => setToolsOpen((v) => !v)}
                aria-expanded={toolsOpen}
                aria-haspopup="true"
                className={cx("flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition-colors", toolsActive || toolsOpen ? "text-fg" : "text-fg/60 hover:text-fg")}
              >
                Tools <span className="rounded-full bg-lime/15 px-1.5 font-mono text-[9px] uppercase tracking-wider text-lime">AI</span>
                <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", toolsOpen && "rotate-180")} />
              </button>
              {toolsOpen && (
                <div role="menu" className="absolute left-1/2 top-[calc(100%+18px)] w-[340px] -translate-x-1/2 animate-fade-up border border-line-strong bg-ink-900/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
                  {TOOLS.map((t) => (
                    <Link key={t.href} role="menuitem" href={t.href} className={cx("flex items-start gap-3 rounded-sm px-3 py-3 transition-colors hover:bg-ink-700", isActive(t.href) && "bg-ink-800")}>
                      <t.icon className="mt-0.5 h-4 w-4 text-lime" />
                      <span><span className="block text-sm">{t.label}</span><span className="block text-xs text-muted">{t.tagline}</span></span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setSearchOpen(true)} className="flex h-9 items-center gap-2.5 rounded-full border border-line-strong/70 bg-white/[0.03] pl-3 pr-2 text-[13px] text-fg/60 transition-colors hover:border-fg/30 hover:text-fg" aria-label="Search (Ctrl+K)">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded-full bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-subtle lg:inline">⌘K</kbd>
            </button>
            <button
              onClick={() => settingsStore.set((s) => ({ ...s, currency: s.currency === "IDR" ? "USD" : "IDR" }))}
              className="hidden h-9 rounded-full px-3 font-mono text-[11px] text-fg/60 hover:text-fg sm:block"
              aria-label={`Currency: ${settings.currency}. Click to switch.`}
              title={settings.currency === "USD" ? "USD shown at a fixed demo rate (1 USD = Rp 16.000)" : "Prices in Indonesian Rupiah"}
            >
              {settings.currency}
            </button>
            <Link href="/account" className="flex h-9 items-center gap-2 rounded-full px-3 text-[13px] text-fg/60 hover:text-fg" aria-label="Account">
              <User className="h-4 w-4" />
              <span className="hidden max-w-24 truncate 2xl:inline">{session.signedIn ? session.name || "Account" : "Sign in"}</span>
            </Link>
            <button className="flex h-9 w-9 items-center justify-center text-fg xl:hidden" onClick={() => setMenuOpen((m) => !m)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile" className="container-x max-h-[calc(100svh-68px)] overflow-y-auto border-t hairline pb-8 pt-2 xl:hidden">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className={cx("flex items-baseline gap-4 border-b hairline py-3.5 text-2xl font-medium tracking-tight", isActive(n.href) ? "text-fg" : "text-muted")}>
                <span className="font-mono text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
                {isActive(n.href) && <span className="ml-auto h-1.5 w-1.5 self-center rounded-full bg-lime" />}
              </Link>
            ))}
            <p className="label-tech mb-1 mt-6">Tools</p>
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className={cx("flex items-center gap-3 border-b hairline py-3.5 text-lg", isActive(t.href) ? "text-fg" : "text-muted")}>
                <t.icon className="h-4 w-4 text-lime" /> {t.label}
              </Link>
            ))}
            <div className="mt-5 flex gap-2">
              <button onClick={() => settingsStore.set((s) => ({ ...s, currency: s.currency === "IDR" ? "USD" : "IDR" }))} className="rounded-full border hairline px-3 py-2 font-mono text-xs text-muted">Currency: {settings.currency}</button>
              {session.role === "admin" && <Link href="/admin" className="rounded-full border hairline px-3 py-2 text-xs text-muted">Admin</Link>}
            </div>
          </nav>
        )}
      </header>
      {/* spacer: header is fixed so the home hero can sit underneath it */}
      {pathname !== "/" && <div aria-hidden className="h-[68px]" />}
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
