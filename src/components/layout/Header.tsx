"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, User, X } from "lucide-react";
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

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const compare = useStore(compareStore);
  const session = useStore(sessionStore);
  const settings = useStore(settingsStore);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) { e.preventDefault(); setSearchOpen(true); }
    };
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className={cx("sticky top-0 z-50 border-b transition-colors duration-300", scrolled || menuOpen ? "border-line bg-ink-950/90 backdrop-blur-md" : "border-transparent bg-ink-950/60 backdrop-blur-sm")}>
        <div className="container-x flex h-16 items-center gap-6">
          <Link href="/" aria-label="VELOX home" className="shrink-0"><VeloxLogo /></Link>
          <nav aria-label="Primary" className="hidden flex-1 items-center justify-center xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cx("relative px-2.5 py-2 text-[13.5px] transition-colors 2xl:px-3", isActive(n.href) ? "text-fg" : "text-muted hover:text-fg")}
              >
                {n.label}
                {n.href === "/compare" && compare.length > 0 && <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 font-mono text-[10px] text-ink-950">{compare.length}</span>}
                {isActive(n.href) && <span className="absolute inset-x-2.5 -bottom-[13px] h-px bg-lime" />}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 xl:ml-0">
            <button onClick={() => setSearchOpen(true)} className="group flex h-9 items-center gap-2 rounded-sm border hairline px-3 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-fg" aria-label="Search (Ctrl+K)">
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded-[2px] border hairline px-1 font-mono text-[10px] text-subtle lg:inline">⌘K</kbd>
            </button>
            <button
              onClick={() => settingsStore.set((s) => ({ ...s, currency: s.currency === "IDR" ? "USD" : "IDR" }))}
              className="hidden h-9 rounded-sm px-2.5 font-mono text-[11px] text-muted hover:text-fg sm:block"
              aria-label={`Currency: ${settings.currency}. Click to switch.`}
              title={settings.currency === "USD" ? "USD shown at a fixed demo rate (1 USD = Rp 16.000)" : "Prices in Indonesian Rupiah"}
            >
              {settings.currency}
            </button>
            <Link href="/account" className="flex h-9 items-center gap-2 rounded-sm px-2.5 text-[13px] text-muted hover:text-fg" aria-label="Account">
              <User className="h-4 w-4" />
              <span className="hidden max-w-24 truncate lg:inline">{session.signedIn ? session.name || "Account" : "Sign in"}</span>
            </Link>
            <button className="flex h-9 w-9 items-center justify-center text-fg xl:hidden" onClick={() => setMenuOpen((m) => !m)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile" className="container-x border-t hairline pb-6 pt-2 xl:hidden">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className={cx("flex items-baseline gap-4 border-b hairline py-3.5 text-2xl font-medium tracking-tight", isActive(n.href) ? "text-fg" : "text-muted")}>
                <span className="font-mono text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
                {isActive(n.href) && <span className="ml-auto h-1.5 w-1.5 self-center rounded-full bg-lime" />}
              </Link>
            ))}
            <div className="mt-4 flex gap-2">
              <button onClick={() => settingsStore.set((s) => ({ ...s, currency: s.currency === "IDR" ? "USD" : "IDR" }))} className="rounded-sm border hairline px-3 py-2 font-mono text-xs text-muted">Currency: {settings.currency}</button>
              {session.role === "admin" && <Link href="/admin" className="rounded-sm border hairline px-3 py-2 text-xs text-muted">Admin</Link>}
            </div>
          </nav>
        )}
      </header>
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
