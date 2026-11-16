import Link from "next/link";
import { ArrowRight, ArrowUpRight, Gauge, ScanLine, Sparkles, Stethoscope } from "lucide-react";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { COMPONENTS } from "@/data/components";
import { MEDIA } from "@/data/media";
import { Photo } from "@/components/Photo";
import { ComponentGlyph } from "@/components/Glyphs";
import { ButtonLink, CompatBadge, DemoNotice, Price } from "@/components/ui";
import { checkBuild, type Selection } from "@/lib/compat";
import { adviseUpgrades, profileFromModel } from "@/lib/upgrade";
import { formatIdrShort, formatWeightG, isVerified, NA, titleCase } from "@/lib/format";
import type { ComponentType } from "@/lib/types";

const byId = new Map(COMPONENTS.map((c) => [c.id, c]));
const brandById = new Map(BRANDS.map((b) => [b.id, b]));

function demoBuild() {
  const ids = ["frame-giant-tcr-advanced-pro", "fork-giant-tcr", ...Object.values(byId.get("shimano-105-r7100-di2")!.kit!), "wheel-zipp-303-firecrest", "tire-conti-gp5000str-28", "post-giant-contact-sl-dfuse"];
  const sel: Selection = {};
  for (const id of ids) { const c = byId.get(id as string)!; sel[c.type as ComponentType] = c; }
  const parts = Object.values(sel).filter(Boolean);
  return { report: checkBuild(sel), price: parts.reduce((s, c) => s + (c!.price?.amount ?? 0), 0), weight: parts.reduce((s, c) => s + (c!.weightG ?? 0), 0) };
}

/** Group brand countries into display regions — all counts come from the database. */
function regionStats() {
  const groups: Array<[string, (c: string) => boolean]> = [
    ["Indonesia", (c) => c === "Indonesia"],
    ["China & Taiwan", (c) => c === "China" || c === "Taiwan"],
    ["Japan & Korea", (c) => c === "Japan" || c === "South Korea"],
    ["Europe", (c) => ["Germany", "Italy", "Spain", "France", "Switzerland", "United Kingdom", "Belgium", "Netherlands", "Austria", "Denmark", "Sweden", "Andorra", "Iceland"].includes(c)],
    ["North America", (c) => c === "United States" || c === "Canada"],
  ];
  return groups.map(([label, fn]) => ({ label, count: BRANDS.filter((b) => fn(b.country)).length }));
}

const count = (fn: (b: (typeof BIKES)[number]) => boolean) => BIKES.filter(fn).length;
const MOSAIC: Array<{ id: string; label: string; href: string; media: keyof typeof MEDIA; span: string; count: number }> = [
  { id: "road", label: "Road", href: "/bikes?category=road", media: "road", span: "col-span-2 row-span-2", count: count((b) => b.category === "road") },
  { id: "mtb", label: "Mountain", href: "/bikes?category=mtb", media: "mtb", span: "col-span-2 md:col-span-1 row-span-2", count: count((b) => b.category === "mtb") },
  { id: "gravel", label: "Gravel", href: "/bikes?category=gravel", media: "gravel", span: "col-span-2 md:col-span-1", count: count((b) => b.category === "gravel") },
  { id: "electric", label: "Electric", href: "/bikes?category=electric", media: "electric", span: "col-span-1", count: count((b) => b.category === "electric") },
  { id: "urban", label: "Urban", href: "/bikes?category=urban", media: "urban", span: "col-span-1 row-span-2", count: count((b) => b.category === "urban") },
  { id: "hybrid", label: "Hybrid", href: "/bikes?category=urban&sub=hybrid", media: "hybrid", span: "col-span-1 row-span-2", count: count((b) => b.subcategory === "hybrid" || b.subcategory === "fitness") },
  { id: "folding", label: "Folding", href: "/bikes?category=folding", media: "folding", span: "col-span-1 row-span-2", count: count((b) => b.category === "folding") },
  { id: "bmx", label: "BMX", href: "/bikes?category=bmx", media: "bmx", span: "col-span-1", count: count((b) => b.category === "bmx") },
  { id: "touring", label: "Touring", href: "/bikes?category=urban&sub=touring", media: "touring", span: "col-span-1", count: count((b) => b.subcategory === "touring") },
  { id: "track", label: "Track & Fixed", href: "/bikes?category=road&sub=track", media: "track", span: "col-span-2 md:col-span-4", count: count((b) => b.subcategory === "track" || b.subcategory === "fixed-gear") },
];

export default function Home() {
  const build = demoBuild();
  const strattos = BIKES.find((b) => b.id === "polygon-strattos-s4-2024")!;
  const advice = adviseUpgrades({ profile: profileFromModel(strattos, "Polygon"), budget: 8_000_000, goals: ["speed", "comfort"], catalog: COMPONENTS, componentById: byId });
  const local = BRANDS.filter((b) => b.region === "Indonesia");
  const bikeBrands = BRANDS.filter((b) => b.kinds?.some((k) => k === "bicycles" || k === "frames" || k === "e-bikes"));
  const wheelBrands = BRANDS.filter((b) => b.kinds?.includes("wheels"));
  const researched = BRANDS.filter((b) => b.provenance.sources.some((s) => s.type && s.type !== "editorial-seed")).length;
  const verified = [...BRANDS, ...BIKES, ...COMPONENTS].filter((r) => isVerified(r.provenance.status)).length;
  const total = BRANDS.length + BIKES.length + COMPONENTS.length;
  const wheelsets = COMPONENTS.filter((c) => c.type === "wheelset").length;
  const spotlight = ["shimano-105-r7100-di2", "wheel-zipp-303-firecrest", "sram-gx-transmission", "fork-rockshox-pike-ultimate"].map((id) => byId.get(id)!);
  const compareIds = ["polygon-strattos-s5-2024", "specialized-allez-2024", "giant-tcr-advanced-1-2024"];
  const compare = compareIds.map((id) => BIKES.find((b) => b.id === id)!);
  const regions = regionStats();
  const marquee = [...local, ...BRANDS.filter((b) => b.region !== "Indonesia" && b.kinds?.includes("bicycles"))].map((b) => b.name);

  return (
    <>
      {/* =============================== 1. HERO =============================== */}
      <section className="relative isolate h-[100svh] min-h-[640px] overflow-hidden">
        <Photo asset={MEDIA.hero} priority sizes="100vw" className="absolute inset-0 -z-10 h-full w-full" imgClassName="animate-hero-zoom" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/75 to-ink-950/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
        <div className="container-x flex h-full flex-col justify-end pb-36 md:pb-40">
          <div className="max-w-[64rem] animate-fade-up">
            <p className="eyebrow mb-7 flex items-center gap-3 text-fg/70"><span className="inline-block h-px w-10 bg-lime" />Cycling Intelligence Platform</p>
            <h1 className="display text-[clamp(3rem,7.4vw,7rem)] leading-[0.92]">
              Find Your Ride.
              <br />
              <span className="text-fg/45">Build Your</span> Best.
            </h1>
            <p className="mt-8 max-w-lg text-[17px] leading-relaxed text-fg/70 md:text-lg">
              Discover bicycles, explore components, and build the perfect setup with intelligent cycling recommendations.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/bikes" size="lg" className="rounded-full px-7">Explore Bikes <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/build" size="lg" variant="secondary" className="rounded-full border-fg/25 bg-ink-950/30 px-7 backdrop-blur-md">Build Your Bike</ButtonLink>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-ink-950/40 backdrop-blur-md">
          <div className="container-x grid grid-cols-2 md:grid-cols-4">
            {[[BIKES.length, "Bike models & model years"], [bikeBrands.length, "Bicycle & frame brands"], [wheelsets, `Wheelsets · ${wheelBrands.length} wheel makers`], [local.length, "Indonesian brands"]].map(([v, l], i) => (
              <div key={l as string} className={`py-4 md:py-5 ${i ? "md:border-l md:pl-6" : ""} ${i % 2 ? "border-l pl-4 md:pl-6" : ""} ${i > 1 ? "border-t md:border-t-0" : ""} border-white/10`}>
                <p className="tabular text-xl font-medium tracking-tight md:text-2xl">{v}</p>
                <p className="label-tech mt-0.5 text-fg/50">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <a href={MEDIA.hero.sourceUrl} target="_blank" rel="noreferrer" className="absolute bottom-28 right-4 hidden font-mono text-[9px] uppercase tracking-[0.12em] text-fg/35 hover:text-fg/70 md:block md:right-8">Photo · {MEDIA.hero.photographer} · Pexels</a>
      </section>

      {/* ========================= 2. DISCOVER YOUR RIDE ========================= */}
      <section className="container-x pt-28 md:pt-36">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-5">01 — Discover Your Ride</p>
            <h2 className="display max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)]">Every way to ride.<span className="text-fg/40"> One place to start.</span></h2>
          </div>
          <Link href="/bikes" className="group inline-flex items-center gap-2 text-sm text-muted hover:text-fg">Open Bike Finder <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
        </div>
        <div className="mt-14 grid auto-rows-[160px] grid-cols-2 gap-2 md:auto-rows-[200px] md:grid-cols-4 lg:auto-rows-[230px]">
          {MOSAIC.map((m) => (
            <Link key={m.id} href={m.href} className={`group relative overflow-hidden ${m.span}`}>
              <Photo asset={MEDIA[m.media]} sizes="(min-width: 768px) 50vw, 100vw" className="absolute inset-0 h-full w-full" imgClassName="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 md:p-5">
                <div>
                  <h3 className="text-xl font-medium tracking-tight md:text-2xl">{m.label}</h3>
                  <p className="label-tech mt-1 text-fg/60">{m.count} {m.count === 1 ? "model" : "models"}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-fg/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime" />
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-subtle">Category photography is representative (Pexels License) — never a specific catalogue product. {CATEGORIES.reduce((s, c) => s + c.subcategories.length, 0)} subcategories across {CATEGORIES.length} families, including tandem, recumbent, kids, balance, adaptive and cargo.</p>
      </section>

      {/* ========================= 3. EXPLORE GLOBAL BRANDS ========================= */}
      <section className="mt-32 overflow-hidden border-y hairline bg-ink-900/60 py-24 md:mt-40 md:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
          <div>
            <p className="eyebrow mb-5">02 — Explore Global Brands</p>
            <h2 className="display text-[clamp(2.4rem,5vw,4.5rem)]">From Sidoarjo<span className="text-fg/40"> to Shenzhen to California.</span></h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
              {BRANDS.length} manufacturers in the database — complete-bike makers, frame specialists, wheel builders and component makers, each labelled by what they actually do. {researched} brand records carry sources from the 2026 research pass; the rest are labelled as unverified seed data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/brands" variant="secondary" className="rounded-full">Brand Explorer</ButtonLink>
              <ButtonLink href="/brands?region=Indonesia" variant="ghost" className="rounded-full">Indonesian brands →</ButtonLink>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px self-end bg-line sm:grid-cols-3">
            {regions.map((r) => (
              <div key={r.label} className="bg-ink-950 p-6">
                <p className="tabular text-4xl font-medium tracking-tight md:text-5xl">{r.count}</p>
                <p className="label-tech mt-2">{r.label}</p>
              </div>
            ))}
            <div className="bg-ink-950 p-6">
              <p className="tabular text-4xl font-medium tracking-tight text-lime md:text-5xl">{wheelBrands.length}</p>
              <p className="label-tech mt-2">Wheel makers</p>
            </div>
          </div>
        </div>
        <div className="relative mt-20 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap text-[clamp(1.6rem,3vw,2.6rem)] font-medium tracking-tight text-fg/25">
            {[...marquee, ...marquee].map((n, i) => <span key={i} className={i % marquee.length < local.length ? "text-fg/70" : ""}>{n}</span>)}
          </div>
        </div>
      </section>

      {/* ========================= 4. BUILD YOUR DREAM BIKE ========================= */}
      <section className="container-x pt-32 md:pt-40">
        <div className="grid items-stretch gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-0 [&>*]:min-w-0">
          <div className="relative min-h-[420px] overflow-hidden lg:min-h-[640px]">
            <Photo asset={MEDIA.drivetrain} sizes="(min-width: 1024px) 55vw, 100vw" className="absolute inset-0 h-full w-full" label="credit" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-ink-950" />
            <div className="absolute bottom-8 left-8 max-w-sm lg:hidden">
              <p className="eyebrow mb-3">03 — Build Your Dream Bike</p>
              <h2 className="display text-4xl">Eighteen parts. <span className="text-fg/50">Zero guesswork.</span></h2>
            </div>
          </div>
          <div className="relative flex flex-col justify-center lg:-ml-24 lg:py-16">
            <div className="hidden lg:block">
              <p className="eyebrow mb-5">03 — Build Your Dream Bike</p>
              <h2 className="display text-[clamp(2.4rem,4.4vw,4rem)]">Eighteen parts.<br /><span className="text-fg/40">Zero guesswork.</span></h2>
            </div>
            <div className="mt-10 border border-line-strong bg-ink-900/90 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b hairline px-6 py-4">
                <div><p className="label-tech">Live example</p><p className="mt-1 font-medium">Giant TCR · 105 Di2 · Zipp 303</p></div>
                <CompatBadge status={build.report.overall === "empty" ? "insufficient" : build.report.overall} />
              </div>
              <div className="grid grid-cols-3 border-b hairline">
                {[["Est. price", formatIdrShort(build.price)], ["Listed weight", formatWeightG(build.weight)], ["Checks run", String(build.report.checks.length)]].map(([l, v], i) => (
                  <div key={l} className={`px-5 py-5 ${i ? "border-l hairline" : ""}`}><p className="label-tech">{l}</p><p className="tabular mt-1 text-xl font-medium">{v}</p></div>
                ))}
              </div>
              <ul className="divide-y divide-line">
                {build.report.checks.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-start gap-4 px-6 py-3">
                    <CompatBadge status={c.status} short className="mt-0.5 w-[92px] shrink-0 justify-center" />
                    <div className="min-w-0"><p className="text-sm">{c.label}</p><p className="truncate text-xs text-muted">{c.message}</p></div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">22 compatibility rules — bottom brackets, axles, freehubs, brake mounts, pull ratios, UDH, clearance — and an honest “Insufficient Information” whenever data is missing.</p>
            <ButtonLink href="/build" className="mt-8 w-fit rounded-full px-7" size="lg">Start a build <ArrowRight className="h-4 w-4" /></ButtonLink>
          </div>
        </div>
      </section>

      {/* ========================= 5. SMART UPGRADES ========================= */}
      <section className="container-x pt-32 md:pt-40">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-5">04 — Smart Upgrade Recommendations</p>
            <h2 className="display max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)]">Upgrade what matters.<span className="text-fg/40"> Skip what doesn&apos;t.</span></h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">Real output for a <span className="text-fg">Polygon Strattos S4 (2024)</span>, Rp 8 jt budget, speed + comfort goals — every pick checked against its rim brakes, 130 mm QR axle and freehub.</p>
          </div>
          <ButtonLink href="/upgrade" variant="secondary" className="rounded-full">Open Upgrade Advisor</ButtonLink>
        </div>
        <div className="mt-14 grid gap-px bg-line md:grid-cols-3">
          {advice.plans.map((p, i) => (
            <div key={p.id} className="bg-ink-950 p-7 md:p-8">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] text-lime">0{i + 1}</span>
                <span className="tabular font-mono text-xs text-muted">{formatIdrShort(p.total)}</span>
              </div>
              <h3 className="mt-6 text-2xl font-medium tracking-tight">{p.title}</h3>
              <ul className="mt-6 space-y-4">
                {p.items.slice(0, 3).map((r) => (
                  <li key={r.component.id} className="flex gap-3">
                    <ComponentGlyph type={r.component.type} className="h-8 w-8 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="label-tech">{titleCase(r.area)} · {r.priority}</p>
                      <p className="truncate text-sm">{r.component.manufacturer} {r.component.name}</p>
                    </div>
                  </li>
                ))}
                {!p.items.length && <li className="text-sm text-muted">No worthwhile upgrade fits this tier.</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ========================= 6. AI MECHANIC ========================= */}
      <section className="relative mt-32 overflow-hidden md:mt-40">
        <Photo asset={MEDIA.mechanic} sizes="100vw" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
        <div className="container-x relative grid gap-12 py-28 md:py-40 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow mb-5 flex items-center gap-2 text-fg/70"><Stethoscope className="h-3.5 w-3.5 text-lime" />05 — Meet VELOX AI Mechanic</p>
            <h2 className="display text-[clamp(2.4rem,5vw,4.5rem)]">Understand your bike.<br /><span className="text-fg/45">Diagnose smarter.</span></h2>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-fg/70">Describe a creak, click or grind in plain words. AI Mechanic maps it to the right system, asks the checks a mechanic would, separates likely from possible causes, and flags anything that affects braking, steering or the frame. Its bearing identifier works from measurements and markings — never from a photo alone.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["My bottom bracket clicks when pedalling", "Rear hub grinds when coasting", "Headset clunks when braking", "Derailleur skips gears"].map((q) => (
                <Link key={q} href={`/mechanic?q=${encodeURIComponent(q)}`} className="rounded-full border border-white/15 bg-ink-950/40 px-3.5 py-1.5 text-[13px] text-fg/75 backdrop-blur-md transition-colors hover:border-lime/50 hover:text-fg">“{q}”</Link>
              ))}
            </div>
            <ButtonLink href="/mechanic" className="mt-10 rounded-full px-7" size="lg">Open AI Mechanic <ArrowRight className="h-4 w-4" /></ButtonLink>
          </div>
          <div className="self-end lg:justify-self-end">
            <div className="grid max-w-sm grid-cols-2 gap-px bg-white/10 backdrop-blur-md">
              {[["19", "Diagnostic systems"], [String(COMPONENTS.filter((c) => c.type === "bearing").length), "Reference bearings"], ["9", "BB standards"], ["SHIS", "Headset decoding"]].map(([v, l]) => (
                <div key={l} className="bg-ink-950/70 p-5"><p className="tabular text-3xl font-medium tracking-tight">{v}</p><p className="label-tech mt-1">{l}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= 7. VISUALIZER ========================= */}
      <section className="container-x pt-32 md:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] [&>*]:min-w-0">
          <div className="order-2 lg:order-1">
            <p className="eyebrow mb-5 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-lime" />06 — Visualize Your Next Build</p>
            <h2 className="display text-[clamp(2.4rem,5vw,4.5rem)]">See your<br /><span className="text-fg/40">next build.</span></h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">Start from a bike in your garage or a photo of your own. Pick wheels, tyres, cockpit and colour from real catalogue parts and VELOX writes a precise, geometry-preserving brief for an image model — with the weight and cost impact calculated alongside.</p>
            <ul className="mt-8 space-y-3 text-sm">
              <li className="flex items-center gap-3 text-fg/80"><Sparkles className="h-4 w-4 text-lime" />Original · Budget · Balanced · Performance · Custom concepts</li>
              <li className="flex items-center gap-3 text-fg/80"><ScanLine className="h-4 w-4 text-lime" />Preserves frame silhouette, wheelbase and fork shape</li>
              <li className="flex items-center gap-3 text-fg/80"><Gauge className="h-4 w-4 text-lime" />Catalogued weights kept separate from estimates</li>
            </ul>
            <p className="mt-6 text-xs text-subtle">Generated images are labelled AI concept visualisations and require an image provider configured on the server.</p>
            <ButtonLink href="/visualizer" variant="secondary" className="mt-8 rounded-full px-7" size="lg">Open Visualizer</ButtonLink>
          </div>
          <div className="relative order-1 aspect-[4/3] lg:order-2">
            <Photo asset={MEDIA.visualizer} sizes="(min-width: 1024px) 55vw, 100vw" className="absolute inset-0 h-full w-full" imgClassName="grayscale" label="credit" />
            <div className="absolute left-5 top-5 rounded-full bg-ink-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg/80 backdrop-blur-md">Reference photo · original</div>
            <div className="absolute -bottom-6 right-4 w-64 border border-line-strong bg-ink-900/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl md:right-8">
              <p className="label-tech">Concept brief (example)</p>
              <ul className="mt-2 space-y-1.5 text-xs text-fg/80">
                <li>+ Wheelset → Zipp 303 Firecrest</li>
                <li>+ Tyres → GP5000 S TR 28 mm</li>
                <li>+ Saddle → Specialized Power Expert</li>
                <li className="text-muted">= Keep frame, fork, geometry</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================= 8. COMPONENT SPOTLIGHT ========================= */}
      <section className="container-x pt-36 md:pt-44">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] [&>*]:min-w-0">
          <div className="relative min-h-[460px] overflow-hidden">
            <Photo asset={MEDIA.wheelDetail} sizes="(min-width: 1024px) 40vw, 100vw" className="absolute inset-0 h-full w-full" overlay="bottom" />
            <div className="absolute bottom-8 left-8 right-8">
              <p className="eyebrow mb-3 text-fg/70">07 — Component Spotlight</p>
              <h2 className="display text-[clamp(2.2rem,4vw,3.6rem)]">The parts that<br />make the ride.</h2>
            </div>
          </div>
          <div className="flex flex-col">
            <ul className="divide-y divide-line border-y hairline">
              {spotlight.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/components/${c.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-6">
                    <span className="font-mono text-xs text-subtle">0{i + 1}</span>
                    <div className="min-w-0">
                      <p className="label-tech">{c.manufacturer} · {titleCase(c.type)}</p>
                      <p className="mt-1 truncate text-xl font-medium tracking-tight transition-colors group-hover:text-lime md:text-2xl">{c.name}</p>
                      <p className="mt-1 truncate text-sm text-muted">{c.benefits?.[0]}</p>
                    </div>
                    <div className="text-right">
                      <Price price={c.price} showType={false} className="text-sm" />
                      <p className="mt-1 font-mono text-xs text-subtle">{formatWeightG(c.weightG)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid grid-cols-3 gap-px bg-line">
              {[[COMPONENTS.length, "Components"], [wheelsets, "Wheelsets"], [COMPONENTS.filter((c) => c.type === "hub").length, "Hubs"]].map(([v, l]) => (
                <div key={l as string} className="bg-ink-950 py-5 pr-4"><p className="tabular text-3xl font-medium tracking-tight">{v}</p><p className="label-tech mt-1">{l}</p></div>
              ))}
            </div>
            <Link href="/components" className="group mt-8 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">Component Explorer <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          </div>
        </div>
      </section>

      {/* ========================= 9. COMPARE ========================= */}
      <section className="container-x pt-32 md:pt-40">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-5">08 — Compare Before You Buy</p>
            <h2 className="display text-[clamp(2.4rem,5vw,4.5rem)]">Side by side.<span className="text-fg/40"> Nothing invented.</span></h2>
          </div>
          <ButtonLink href={`/compare?kind=bike&ids=${compareIds.join(",")}`} variant="secondary" className="rounded-full">Open this comparison</ButtonLink>
        </div>
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b hairline text-left">
                <th className="w-44 py-4 font-normal"><span className="label-tech">Spec</span></th>
                {compare.map((b) => <th key={b.id} className="py-4 pr-4 text-base font-medium tracking-tight">{brandById.get(b.brandId)?.name} {b.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {([
                ["Price", (b: typeof BIKES[number]) => formatIdrShort(b.price?.amount)],
                ["Frame", (b: typeof BIKES[number]) => b.frameMaterial ?? NA],
                ["Groupset", (b: typeof BIKES[number]) => b.groupset ?? NA],
                ["Brakes", (b: typeof BIKES[number]) => b.brakes ?? NA],
                ["Tyre clearance", (b: typeof BIKES[number]) => (b.tireClearanceMm ? `${b.tireClearanceMm} mm` : NA)],
                ["Weight", (b: typeof BIKES[number]) => (b.weightKg ? `${b.weightKg} kg` : NA)],
                ["Origin", (b: typeof BIKES[number]) => brandById.get(b.brandId)?.country ?? NA],
              ] as const).map(([label, fn]) => {
                const vals = compare.map(fn);
                const differs = new Set(vals).size > 1;
                return (
                  <tr key={label} className="border-b hairline">
                    <td className="py-3.5 text-muted">{label}</td>
                    {vals.map((v, i) => <td key={i} className={`py-3.5 pr-4 tabular ${v === NA ? "italic text-subtle" : differs ? "text-fg" : "text-muted"}`}>{differs && v !== NA && <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-lime" />}{v}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================= 10. WHY VELOX ========================= */}
      <section className="container-x pt-32 md:pt-40">
        <p className="eyebrow mb-5">09 — Why VELOX</p>
        <h2 className="display max-w-3xl text-[clamp(2.4rem,5vw,4.5rem)]">Intelligence<span className="text-fg/40"> you can check.</span></h2>
        <div className="mt-14 grid border-t hairline md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Honest data", `Every record shows its verification status, sources, confidence and update date. ${verified} of ${total} records are currently verified — the rest say so. Unknown means “Not Available”.`],
            ["Compatibility first", "A rules engine for bottom brackets, axles, freehubs, brake mounts, pull ratios, UDH, clearance and more — with an explanation for every result."],
            ["Local is first-class", "Polygon, United, Pacific, Element, Wimcycle and Thrill sit alongside Trek, Pardus and Winspace in search, finder, compare and recommendations. Rupiah by default."],
            ["Value over price", "Recommendations reward suitability and value, not price tags. Upgrades are tier-gated, and simulated changes are arithmetic — never invented performance claims."],
          ].map(([t, d], i) => (
            <div key={t} className={`border-b py-8 lg:border-b-0 lg:px-6 ${i > 0 ? "lg:border-l" : "lg:pl-0"} ${i % 2 ? "md:border-l md:pl-6" : "md:pr-6"} hairline`}>
              <p className="font-mono text-[11px] text-lime">0{i + 1}</p>
              <h3 className="mt-6 text-xl font-medium tracking-tight">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <DemoNotice className="mt-10 max-w-3xl" />
      </section>

      {/* closing band */}
      <section className="relative mt-32 h-[70vh] min-h-[460px] overflow-hidden">
        <Photo asset={MEDIA.trailSunset} sizes="100vw" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/70" />
        <div className="container-x relative flex h-full flex-col items-start justify-end pb-20">
          <h2 className="display text-[clamp(2.8rem,7vw,6.5rem)]">Ride Smarter.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/bikes" size="lg" className="rounded-full px-7">Find your bike</ButtonLink>
            <ButtonLink href="/garage" size="lg" variant="secondary" className="rounded-full border-fg/25 bg-ink-950/30 px-7 backdrop-blur-md">Open My Garage</ButtonLink>
          </div>
        </div>
        <a href={MEDIA.trailSunset.sourceUrl} target="_blank" rel="noreferrer" className="absolute bottom-6 right-4 font-mono text-[9px] uppercase tracking-[0.12em] text-fg/35 hover:text-fg/70 md:right-8">Photo · {MEDIA.trailSunset.photographer} · Pexels</a>
      </section>
    </>
  );
}
