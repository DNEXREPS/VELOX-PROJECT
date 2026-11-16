import Link from "next/link";
import { VeloxLogo } from "@/components/Glyphs";

const COLS: Array<[string, Array<[string, string]>]> = [
  ["Discover", [["Bike Finder", "/bikes"], ["Brand Explorer", "/brands"], ["Indonesian brands", "/brands?region=Indonesia"], ["Search", "/search"]]],
  ["Tools", [["Build a Bike", "/build"], ["Upgrade Advisor", "/upgrade"], ["AI Mechanic", "/mechanic"], ["AI Bike Visualizer", "/visualizer"], ["Upgrade Simulator", "/simulator"], ["Compare", "/compare"], ["My Garage", "/garage"]]],
  ["Catalogue", [["Components", "/components"], ["Data & image sources", "/sources"], ["Suggest data", "/submit"], ["Admin", "/admin"], ["Account", "/account"]]],
];

export function Footer() {
  return (
    <footer className="mt-24 border-t hairline">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <VeloxLogo />
          <p className="mt-5 text-sm leading-relaxed text-muted">The cycling intelligence platform. Discover, build, compare and improve every kind of bicycle — from your first Indonesian commuter to a WorldTour race machine.</p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-lime">Ride Smarter.</p>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <p className="label-tech mb-4">{title}</p>
            <ul className="space-y-2.5">
              {links.map(([l, h]) => (
                <li key={h}><Link href={h} className="link-u text-sm text-muted hover:text-fg">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t hairline">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-subtle md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} VELOX. Catalogue data is largely unverified and prices are estimates — see <Link href="/sources" className="link-u">Data &amp; image sources</Link>. Photography: Pexels License.</p>
          <p className="font-mono">IDR · Bahasa Indonesia support planned</p>
        </div>
      </div>
    </footer>
  );
}
