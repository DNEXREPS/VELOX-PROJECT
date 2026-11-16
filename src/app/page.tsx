import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { COMPONENTS } from "@/data/components";
import { BikeGraphic } from "@/components/BikeGraphic";
import { BrandMark, ComponentGlyph } from "@/components/Glyphs";
import { ButtonLink, CompatBadge, DemoNotice, Price, SectionHeader } from "@/components/ui";
import { checkBuild, type Selection } from "@/lib/compat";
import { adviseUpgrades, profileFromModel } from "@/lib/upgrade";
import { formatIdrShort, formatWeightG, NA, titleCase } from "@/lib/format";
import type { ComponentType } from "@/lib/types";

const byId = new Map(COMPONENTS.map((c) => [c.id, c]));
const brandById = new Map(BRANDS.map((b) => [b.id, b]));

function demoBuild() {
  const ids = ["frame-giant-tcr-advanced-pro", "fork-giant-tcr", ...Object.values(byId.get("shimano-105-r7100-di2")!.kit!), "wheel-zipp-303-firecrest", "tire-conti-gp5000str-28", "post-giant-contact-sl-dfuse"];
  const sel: Selection = {};
  for (const id of ids) { const c = byId.get(id as string)!; sel[c.type as ComponentType] = c; }
  const parts = Object.values(sel).filter(Boolean);
  return {
    report: checkBuild(sel),
    price: parts.reduce((s, c) => s + (c!.price?.amount ?? 0), 0),
    weight: parts.reduce((s, c) => s + (c!.weightG ?? 0), 0),
    parts: parts.length,
  };
}

export default function Home() {
  const build = demoBuild();
  const strattos = BIKES.find((b) => b.id === "polygon-strattos-s4-2024")!;
  const advice = adviseUpgrades({ profile: profileFromModel(strattos, "Polygon"), budget: 8_000_000, goals: ["speed", "comfort"], catalog: COMPONENTS, componentById: byId });
  const local = BRANDS.filter((b) => b.region === "Indonesia");
  const intl = BRANDS.filter((b) => b.region === "International").slice(0, 24);
  const spotlight = ["shimano-105-r7100-di2", "wheel-zipp-303-firecrest", "sram-gx-transmission", "fork-rockshox-pike-ultimate"].map((id) => byId.get(id)!);
  const compareIds = ["polygon-strattos-s5-2024", "specialized-allez-2024", "giant-tcr-advanced-1-2024"];
  const compare = compareIds.map((id) => BIKES.find((b) => b.id === id)!);

  return (
    <>
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative -mt-16 overflow-hidden border-b hairline pt-16">
        <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_45%,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[620px] w-[820px] rounded-full bg-lime/[0.05] blur-[120px]" />
        <div className="container-x relative grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-10">
          <div className="animate-fade-up">
            <p className="eyebrow mb-8 flex items-center gap-3"><span className="inline-block h-px w-8 bg-lime" />Cycling Intelligence Platform</p>
            <h1 className="display text-[clamp(3rem,6.4vw,6.4rem)]">
              Find Your Ride.
              <br />
              <span className="text-muted">Build Your </span>Best.
            </h1>
            <p className="mt-8 max-w-md text-[17px] leading-relaxed text-muted">
              Discover bicycles, explore components, and build the perfect setup with intelligent cycling recommendations.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/bikes" size="lg">Explore Bikes <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/build" size="lg" variant="secondary">Build Your Bike</ButtonLink>
            </div>
          </div>
          <div className="relative">
            <BikeGraphic category="road" subcategory="aero" color="#E6EAEE" className="w-full drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]" title="VELOX technical illustration of an aero road bike" />
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
              {[["Cockpit", "72%", "6%"], ["Frame · Carbon", "30%", "12%"], ["Groupset · 2x12", "38%", "86%"], ["Wheelset · 50 mm", "2%", "92%"]].map(([l, x, y]) => (
                <span key={l} className="absolute flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted" style={{ left: x, top: y }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-lime" />{l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative border-t hairline">
          <div className="container-x grid grid-cols-2 md:grid-cols-4">
            {[[BRANDS.length, "Brands", `${local.length} Indonesian`], [BIKES.length, "Bike models", "Across 8 categories"], [COMPONENTS.length, "Components", "With compatibility data"], [22, "Compatibility rules", "Never assumed"]].map(([v, l, s], i) => (
              <div key={l as string} className={`py-6 ${i % 2 ? "pl-6" : "pr-6"} ${i > 0 ? "md:border-l md:pl-6" : ""} ${i === 2 ? "border-t md:border-t-0" : ""} ${i === 3 ? "border-t border-l md:border-t-0" : ""} ${i === 1 ? "border-l" : ""} hairline`}>
                <p className="tabular text-3xl font-medium tracking-tight">{v}</p>
                <p className="mt-1 text-sm">{l}</p>
                <p className="label-tech mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- A. DISCOVER --------------------------- */}
      <section className="container-x pt-28">
        <SectionHeader eyebrow="01 — Discover Your Ride" title={<>Every way to ride.<br /><span className="text-muted">One place to start.</span></>} action={<Link href="/bikes" className="link-u inline-flex items-center gap-2 text-sm text-muted hover:text-fg">Open Bike Finder <ArrowUpRight className="h-4 w-4" /></Link>} />
        <div className="mt-14 grid grid-cols-2 border-l border-t hairline md:grid-cols-4">
          {CATEGORIES.map((c, i) => {
            const n = BIKES.filter((b) => b.category === c.id).length;
            const label = c.id === "urban" ? "Hybrid / Urban" : c.id === "other" ? "Specialty" : c.name;
            return (
              <Link key={c.id} href={`/bikes?category=${c.id}`} className="group relative flex aspect-[4/5] flex-col justify-between border-b border-r hairline p-5 transition-colors hover:bg-ink-900 md:aspect-[4/4.2] md:p-6">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight className="h-4 w-4 text-subtle transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime" />
                </div>
                <BikeGraphic category={c.id === "other" ? "other" : c.id} subcategory={c.id === "electric" ? "e-urban" : undefined} suspension={c.id === "mtb" ? "full" : undefined} detail={false} className="mx-auto w-[92%] opacity-80 transition-opacity group-hover:opacity-100" />
                <div>
                  <h3 className="text-xl font-medium tracking-tight md:text-2xl">{label}</h3>
                  <p className="mt-1 text-[13px] text-muted">{c.tagline} · {n} models · {c.subcategories.length} types</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------------------------- B. BUILDER --------------------------- */}
      <section className="container-x pt-32">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20 [&>*]:min-w-0">
          <div>
            <SectionHeader eyebrow="02 — Build Your Dream Bike" title={<>Eighteen parts.<br /><span className="text-muted">Zero guesswork.</span></>}>
              Choose every component from frame to pedals. VELOX totals price and weight as you go and checks bottom brackets, axles, freehubs, brake mounts, drivetrain speeds, tyre clearance and more — and tells you when it simply doesn&apos;t have enough data to be sure.
            </SectionHeader>
            <ol className="mt-10 grid grid-cols-2 gap-x-8 text-sm sm:grid-cols-3">
              {["Frame", "Fork", "Groupset", "Shifters", "Front Derailleur", "Rear Derailleur", "Crankset", "Cassette", "Chain", "Brakes", "Wheelset", "Tyres", "Handlebar", "Stem", "Saddle", "Seatpost", "Pedals", "Accessories"].map((s, i) => (
                <li key={s} className="flex items-baseline gap-3 border-b hairline py-2.5 text-muted"><span className="font-mono text-[10px] text-subtle">{String(i + 1).padStart(2, "0")}</span>{s}</li>
              ))}
            </ol>
            <ButtonLink href="/build" className="mt-10" size="lg">Start a build <ArrowRight className="h-4 w-4" /></ButtonLink>
          </div>
          <div className="self-center border hairline bg-ink-900">
            <div className="flex items-center justify-between border-b hairline px-6 py-4">
              <div><p className="label-tech">Example build</p><p className="mt-1 font-medium">Giant TCR · 105 Di2 · Zipp 303</p></div>
              <CompatBadge status={build.report.overall === "empty" ? "insufficient" : build.report.overall} />
            </div>
            <div className="grid grid-cols-3 border-b hairline">
              <div className="border-r hairline px-6 py-5"><p className="label-tech">Est. price</p><p className="tabular mt-1 text-xl font-medium">{formatIdrShort(build.price)}</p></div>
              <div className="border-r hairline px-6 py-5"><p className="label-tech">Listed weight</p><p className="tabular mt-1 text-xl font-medium">{formatWeightG(build.weight)}</p></div>
              <div className="px-6 py-5"><p className="label-tech">Checks</p><p className="tabular mt-1 text-xl font-medium">{build.report.checks.length}</p></div>
            </div>
            <ul className="divide-y divide-line">
              {build.report.checks.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-start gap-4 px-6 py-3.5">
                  <CompatBadge status={c.status} short className="mt-0.5 w-[92px] shrink-0 justify-center" />
                  <div className="min-w-0"><p className="text-sm">{c.label}</p><p className="truncate text-xs text-muted">{c.message}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------- C. UPGRADES -------------------------- */}
      <section className="container-x pt-32">
        <SectionHeader eyebrow="03 — Smart Upgrade Recommendations" title={<>Upgrade what matters.<br /><span className="text-muted">Skip what doesn&apos;t.</span></>} action={<ButtonLink href="/upgrade" variant="secondary">Open Upgrade Advisor</ButtonLink>}>
          Real output for a <span className="text-fg">Polygon Strattos S4 (2024)</span> with an Rp 8 jt budget and speed + comfort goals. Every pick is checked against the bike&apos;s rim brakes, 130 mm QR axle and 10-speed freehub.
        </SectionHeader>
        <div className="mt-14 grid border-t hairline md:grid-cols-3">
          {advice.plans.map((p, i) => (
            <div key={p.id} className={`py-8 md:px-8 ${i > 0 ? "border-t md:border-l md:border-t-0" : "md:pl-0"} hairline`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-medium tracking-tight">{p.title}</h3>
                <span className="tabular font-mono text-xs text-muted">{formatIdrShort(p.total)}</span>
              </div>
              <ul className="mt-6 space-y-4">
                {p.items.slice(0, 3).map((r) => (
                  <li key={r.component.id} className="flex gap-3">
                    <ComponentGlyph type={r.component.type} className="h-8 w-8 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="label-tech">{titleCase(r.area)} · {r.priority} priority</p>
                      <p className="truncate text-sm">{r.component.manufacturer} {r.component.name}</p>
                      <p className="text-xs text-muted">{formatIdrShort(r.price)} · <span className="capitalize">{r.compatibility === "insufficient" ? "verify fit" : r.compatibility}</span></p>
                    </div>
                  </li>
                ))}
                {!p.items.length && <li className="text-sm text-muted">No worthwhile upgrade fits this budget tier.</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------- D. BRANDS --------------------------- */}
      <section className="container-x pt-32">
        <SectionHeader eyebrow="04 — Explore Bicycle Brands" title={<>Local makers.<br /><span className="text-muted">Global icons. Equal footing.</span></>} action={<Link href="/brands" className="link-u inline-flex items-center gap-2 text-sm text-muted hover:text-fg">All {BRANDS.length} brands <ArrowUpRight className="h-4 w-4" /></Link>} />
        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          {[["Indonesia", local], ["International", intl]] .map(([title, list]) => (
            <div key={title as string}>
              <div className="flex items-baseline justify-between border-b hairline pb-3">
                <p className="label-tech">{title as string}</p>
                <Link href={`/brands?region=${title}`} className="text-xs text-muted hover:text-fg">View all →</Link>
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3">
                {(list as typeof BRANDS).slice(0, 12).map((b) => (
                  <li key={b.id}>
                    <Link href={`/brands/${b.slug}`} className="group flex items-center gap-3 border-b hairline py-3.5 pr-3">
                      <BrandMark name={b.name} color={b.mark?.color} size="sm" />
                      <span className="min-w-0"><span className="block truncate text-sm group-hover:text-lime">{b.name}</span><span className="block truncate text-[11px] text-subtle">{b.country}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------- E. COMPONENTS ------------------------ */}
      <section className="container-x pt-32">
        <SectionHeader eyebrow="05 — Component Spotlight" title={<>The parts that<br /><span className="text-muted">make the ride.</span></>} action={<Link href="/components" className="link-u inline-flex items-center gap-2 text-sm text-muted hover:text-fg">Component Explorer <ArrowUpRight className="h-4 w-4" /></Link>} />
        <div className="mt-14 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {spotlight.map((c) => (
            <Link key={c.id} href={`/components/${c.id}`} className="group flex flex-col bg-ink-950 p-6 transition-colors hover:bg-ink-900">
              <ComponentGlyph type={c.type} className="h-14 w-14 text-muted transition-colors group-hover:text-lime" />
              <p className="label-tech mt-10">{c.manufacturer} · {titleCase(c.type)}</p>
              <p className="mt-1 text-lg font-medium tracking-tight">{c.name}</p>
              <p className="mt-2 text-[13px] text-muted">{c.benefits?.[0]}</p>
              <div className="mt-auto flex items-center justify-between pt-8 text-sm">
                <Price price={c.price} showType={false} />
                <span className="font-mono text-xs text-subtle">{formatWeightG(c.weightG)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------- F. COMPARE -------------------------- */}
      <section className="container-x pt-32">
        <SectionHeader eyebrow="06 — Compare Before You Buy" title={<>Side by side.<br /><span className="text-muted">Nothing invented.</span></>} action={<ButtonLink href={`/compare?kind=bike&ids=${compareIds.join(",")}`} variant="secondary">Open this comparison</ButtonLink>}>
          Differences are highlighted. Missing specs stay “{NA}”.
        </SectionHeader>
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b hairline text-left">
                <th className="w-44 py-3 font-normal"><span className="label-tech">Spec</span></th>
                {compare.map((b) => <th key={b.id} className="py-3 pr-4 font-medium">{brandById.get(b.brandId)?.name} {b.name}</th>)}
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
                    <td className="py-3 text-muted">{label}</td>
                    {vals.map((v, i) => <td key={i} className={`py-3 pr-4 tabular ${v === NA ? "italic text-subtle" : differs ? "text-fg" : "text-muted"}`}>{differs && v !== NA && <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-lime" />}{v}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ----------------------------- G. WHY ------------------------------ */}
      <section className="container-x pt-32">
        <SectionHeader eyebrow="07 — Why VELOX" title={<>Intelligence<br /><span className="text-muted">you can check.</span></>} />
        <div className="mt-14 grid border-t hairline md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Honest data", "Every record carries a verification status, sources and an updated date. Estimated prices are always labelled as estimates. Unknown means “Not Available” — never guessed."],
            ["Compatibility first", "A rules engine covering bottom brackets, axles, freehubs, brake mounts, pull ratios, UDH, tyre clearance and more — with explanations for every result."],
            ["Local is first-class", "Polygon, United, Element, Pacific, Wimcycle and more sit alongside Trek and Specialized in search, finder, compare and recommendations. Rupiah by default."],
            ["Value over price", "Recommendations reward suitability and drivetrain value, not price tags. Upgrades are tier-gated so you never pay for a sideways move."],
          ].map(([t, d], i) => (
            <div key={t} className={`py-8 lg:px-6 ${i > 0 ? "lg:border-l" : "lg:pl-0"} ${i % 2 ? "md:border-l md:pl-6" : "md:pr-6"} border-b lg:border-b-0 hairline`}>
              <p className="font-mono text-[11px] text-lime">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-6 text-xl font-medium tracking-tight">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <DemoNotice className="mt-10 max-w-3xl" />
      </section>
    </>
  );
}
