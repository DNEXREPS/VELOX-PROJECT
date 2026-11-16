"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Heart, Info, Warehouse } from "lucide-react";
import { buildsStore, garageStore, useCatalog, wishlistStore } from "@/lib/state";
import { useHydrated, useStore } from "@/lib/store";
import { adviseUpgrades, AREA_LABEL, GOALS, profileFromModel, type BikeProfile, type Goal, type Recommendation, type UpgradeArea } from "@/lib/upgrade";
import { profileFromGarage } from "@/lib/profiles";
import type { BrakeType, CategoryId, Freehub, WheelSize } from "@/lib/types";
import { Button, Chip, CompatBadge, DemoNotice, EmptyState, Field, Segmented, Tag } from "@/components/ui";
import { ComponentGlyph } from "@/components/Glyphs";
import { toast } from "@/components/ui/toast";
import { cx, formatIdrShort, formatMoney, uid } from "@/lib/format";

type Source = "garage" | "catalog" | "manual";
const AREAS = Object.keys(AREA_LABEL) as UpgradeArea[];

interface Manual {
  label: string; category: CategoryId; groupsetId: string; wheelSize: WheelSize | ""; brakeType: BrakeType | ""; rearAxle: string; freehub: Freehub | ""; maxTire: string; seatpost: string; priceJt: string;
}
const EMPTY_MANUAL: Manual = { label: "", category: "road", groupsetId: "", wheelSize: "", brakeType: "", rearAxle: "", freehub: "", maxTire: "", seatpost: "", priceJt: "" };

export function Advisor() {
  const cat = useCatalog();
  const sp = useSearchParams();
  const hydrated = useHydrated();
  const garage = useStore(garageStore);
  const builds = useStore(buildsStore);

  const initialBike = sp.get("bike");
  const initialGarage = sp.get("garage");
  const [source, setSource] = useState<Source>(initialGarage ? "garage" : initialBike ? "catalog" : "catalog");
  const [garageId, setGarageId] = useState(initialGarage ?? "");
  const [brandId, setBrandId] = useState(initialBike ? cat.bikeById.get(initialBike)?.brandId ?? "polygon" : "polygon");
  const [modelId, setModelId] = useState(initialBike ?? "polygon-strattos-s4-2024");
  const [manual, setManual] = useState<Manual>(EMPTY_MANUAL);
  const [budget, setBudget] = useState(8_000_000);
  const [goals, setGoals] = useState<Goal[]>(["speed", "comfort"]);
  const [areas, setAreas] = useState<UpgradeArea[]>([]);

  const groupsets = useMemo(() => cat.components.filter((c) => c.type === "groupset"), [cat.components]);
  const brandModels = useMemo(() => cat.bikes.filter((b) => b.brandId === brandId).sort((a, b) => a.name.localeCompare(b.name) || b.year - a.year), [cat.bikes, brandId]);
  const brandsWithModels = useMemo(() => cat.brands.filter((b) => cat.bikes.some((m) => m.brandId === b.id)), [cat]);

  const profile: BikeProfile | null = useMemo(() => {
    if (source === "garage") {
      const g = garage.find((x) => x.id === garageId);
      return g ? profileFromGarage(g, cat, builds) : null;
    }
    if (source === "catalog") {
      const m = cat.bikeById.get(modelId);
      return m ? profileFromModel(m, cat.brandById.get(m.brandId)?.name ?? "") : null;
    }
    if (!manual.label.trim()) return null;
    const gs = cat.componentById.get(manual.groupsetId);
    const disc = manual.brakeType.includes("disc");
    return {
      label: manual.label,
      category: manual.category,
      groupset: gs ? `${gs.manufacturer} ${gs.name}` : null,
      priceIdr: manual.priceJt ? Number(manual.priceJt) * 1e6 : null,
      compat: {
        wheelSize: manual.wheelSize || null,
        wheelSizes: manual.wheelSize ? [manual.wheelSize] : null,
        brakeType: (manual.brakeType || null) as BrakeType | null,
        brakeInterface: manual.brakeType ? (disc ? "disc" : "rim") : null,
        brakeMount: manual.brakeType === "rim-caliper" ? "rim-caliper" : manual.brakeType === "v-brake" ? "v-brake" : null,
        rearAxle: manual.rearAxle || null,
        frontAxle: manual.rearAxle === "130QR" || manual.rearAxle === "135QR" ? "100QR" : manual.rearAxle === "12x142" ? "12x100" : manual.rearAxle === "12x148" ? "15x110" : null,
        freehub: (manual.freehub || gs?.compat.freehub || null) as Freehub | null,
        speeds: gs?.compat.speeds ?? null,
        protocol: gs?.compat.protocol ?? null,
        chainrings: gs?.compat.chainrings ?? null,
        maxTireMm: manual.maxTire ? Number(manual.maxTire) : null,
        seatpostDiameter: manual.seatpost || null,
      },
      current: { groupset: gs ? `${gs.manufacturer} ${gs.name}` : null },
    };
  }, [source, garage, garageId, cat, builds, modelId, manual]);

  const profileRef = source === "garage" && garageId ? `garage=${garageId}` : source === "catalog" && modelId ? `bike=${modelId}` : null;
  const result = useMemo(() => (profile ? adviseUpgrades({ profile, budget, goals, areas, catalog: cat.components, componentById: cat.componentById }) : null), [profile, budget, goals, areas, cat]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const m = (k: keyof Manual, v: string) => setManual((p) => ({ ...p, [k]: v }));

  return (
    <div className="container-x py-10 md:py-14">
      <div className="grid gap-12 lg:grid-cols-[400px_1fr] xl:gap-16 [&>*]:min-w-0">
        {/* --------------------------- input column --------------------------- */}
        <div className="flex flex-col gap-10 lg:sticky lg:top-20 lg:self-start">
          <section aria-labelledby="s1">
            <h2 id="s1" className="mb-4 flex items-baseline gap-3 text-lg font-medium"><span className="font-mono text-xs text-lime">01</span>Your bike</h2>
            <Segmented value={source} onChange={setSource} options={[{ value: "catalog", label: "From catalogue" }, { value: "garage", label: "My Garage" }, { value: "manual", label: "Enter manually" }]} className="mb-5" />
            {source === "catalog" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand" htmlFor="u-brand">
                  <select id="u-brand" className="field" value={brandId} onChange={(e) => { setBrandId(e.target.value); const first = cat.bikes.find((b) => b.brandId === e.target.value); setModelId(first?.id ?? ""); }}>
                    {brandsWithModels.map((b) => <option key={b.id} value={b.id}>{b.name}{b.region === "Indonesia" ? " (ID)" : ""}</option>)}
                  </select>
                </Field>
                <Field label="Model & year" htmlFor="u-model">
                  <select id="u-model" className="field" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    {brandModels.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.year}</option>)}
                  </select>
                </Field>
              </div>
            )}
            {source === "garage" && (
              hydrated && garage.length === 0 ? (
                <div className="border border-dashed hairline p-5 text-sm text-muted">Your garage is empty. <Link href="/garage" className="text-lime link-u">Add a bike</Link> or pick one from the catalogue.</div>
              ) : (
                <Field label="Garage bike" htmlFor="u-garage">
                  <select id="u-garage" className="field" value={garageId} onChange={(e) => setGarageId(e.target.value)}>
                    <option value="">Select a bike…</option>
                    {garage.map((g) => <option key={g.id} value={g.id}>{g.nickname}</option>)}
                  </select>
                </Field>
              )
            )}
            {source === "manual" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bike name" className="col-span-2" htmlFor="m-name"><input id="m-name" className="field" placeholder="e.g. Pacific Invert 2.0 (2021)" value={manual.label} onChange={(e) => m("label", e.target.value)} /></Field>
                <Field label="Category" htmlFor="m-cat"><select id="m-cat" className="field" value={manual.category} onChange={(e) => m("category", e.target.value)}>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
                <Field label="Groupset" htmlFor="m-gs"><select id="m-gs" className="field" value={manual.groupsetId} onChange={(e) => m("groupsetId", e.target.value)}><option value="">Unknown / other</option>{groupsets.map((g) => <option key={g.id} value={g.id}>{g.manufacturer} {g.name}</option>)}</select></Field>
                <Field label="Wheel size" htmlFor="m-ws"><select id="m-ws" className="field" value={manual.wheelSize} onChange={(e) => m("wheelSize", e.target.value)}><option value="">Unknown</option>{["700c", "650b", "29", "27.5", "26", "20", "16"].map((w) => <option key={w}>{w}</option>)}</select></Field>
                <Field label="Brakes" htmlFor="m-br"><select id="m-br" className="field" value={manual.brakeType} onChange={(e) => m("brakeType", e.target.value)}><option value="">Unknown</option><option value="rim-caliper">Rim caliper</option><option value="v-brake">V-brake</option><option value="mechanical-disc">Mechanical disc</option><option value="hydraulic-disc">Hydraulic disc</option></select></Field>
                <Field label="Rear axle" htmlFor="m-ax"><select id="m-ax" className="field" value={manual.rearAxle} onChange={(e) => m("rearAxle", e.target.value)}><option value="">Unknown</option><option value="130QR">130 mm QR (road)</option><option value="135QR">135 mm QR</option><option value="12x142">12 × 142 thru-axle</option><option value="12x148">12 × 148 Boost</option></select></Field>
                <Field label="Freehub" htmlFor="m-fh"><select id="m-fh" className="field" value={manual.freehub} onChange={(e) => m("freehub", e.target.value)}><option value="">Unknown</option>{["HG-road", "HG-MTB", "MicroSpline", "XD", "XDR", "Campagnolo", "Freewheel"].map((f) => <option key={f}>{f}</option>)}</select></Field>
                <Field label="Max tyre (mm)" htmlFor="m-mt"><input id="m-mt" className="field" inputMode="numeric" placeholder="Unknown" value={manual.maxTire} onChange={(e) => m("maxTire", e.target.value.replace(/\D/g, ""))} /></Field>
                <Field label="Seatpost Ø" htmlFor="m-sp"><select id="m-sp" className="field" value={manual.seatpost} onChange={(e) => m("seatpost", e.target.value)}><option value="">Unknown</option>{["25.4", "27.2", "30.9", "31.6", "34.9"].map((d) => <option key={d}>{d}</option>)}</select></Field>
                <Field label="Bike value (jt)" htmlFor="m-pr"><input id="m-pr" className="field" inputMode="decimal" placeholder="e.g. 12" value={manual.priceJt} onChange={(e) => m("priceJt", e.target.value)} /></Field>
                <p className="col-span-2 text-xs text-subtle">Unknown fields are fine — affected upgrades will be marked “Insufficient Information” instead of being guessed.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="s2">
            <h2 id="s2" className="mb-4 flex items-baseline gap-3 text-lg font-medium"><span className="font-mono text-xs text-lime">02</span>Budget</h2>
            <div className="flex items-baseline justify-between"><span className="tabular text-3xl font-medium tracking-tight">{formatMoney(budget)}</span></div>
            <input type="range" min={500_000} max={60_000_000} step={500_000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-4 w-full accent-[#C5F36A]" aria-label="Upgrade budget" />
            <div className="mt-2 flex flex-wrap gap-1.5">{[2e6, 5e6, 8e6, 15e6, 30e6].map((v) => <Chip key={v} active={budget === v} onClick={() => setBudget(v)}>{formatIdrShort(v)}</Chip>)}</div>
          </section>

          <section aria-labelledby="s3">
            <h2 id="s3" className="mb-4 flex items-baseline gap-3 text-lg font-medium"><span className="font-mono text-xs text-lime">03</span>Riding goals</h2>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button key={g.id} onClick={() => setGoals(toggle(goals, g.id))} aria-pressed={goals.includes(g.id)} className={cx("border px-3 py-2.5 text-left transition-colors", goals.includes(g.id) ? "border-lime/60 bg-lime/[0.06]" : "border-line hover:border-line-strong")}>
                  <span className={cx("block text-sm", goals.includes(g.id) && "text-lime")}>{g.label}</span>
                  <span className="block text-[11px] text-muted">{g.hint}</span>
                </button>
              ))}
            </div>
            <p className="label-tech mb-2 mt-6">Limit to areas (optional)</p>
            <div className="flex flex-wrap gap-1.5">{AREAS.map((a) => <Chip key={a} active={areas.includes(a)} onClick={() => setAreas(toggle(areas, a))}>{AREA_LABEL[a]}</Chip>)}</div>
          </section>
        </div>

        {/* ------------------------------ results ------------------------------ */}
        <div aria-live="polite">
          {!profile || !result ? (
            <EmptyState title="Tell us about your bike" icon={<Info className="h-7 w-7" strokeWidth={1.25} />}>Choose a catalogue model, a bike from your garage, or enter one manually to generate recommendations.</EmptyState>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b hairline pb-6">
                <div>
                  <p className="label-tech">Recommendations for</p>
                  <p className="mt-1 text-2xl font-medium tracking-tight">{profile.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>{profile.groupset ?? "Groupset unknown"}</Tag>
                    <Tag>{profile.compat.wheelSize ?? "Wheel size unknown"}</Tag>
                    <Tag>{profile.compat.brakeType ?? "Brakes unknown"}</Tag>
                    <Tag>{profile.compat.rearAxle ?? "Axle unknown"}</Tag>
                  </div>
                </div>
                <p className="max-w-xs text-xs text-subtle">{result.evaluated} candidate parts evaluated · {result.excludedIncompatible} excluded as incompatible with this bike.</p>
              </div>

              <div className="grid gap-12">
                {result.plans.map((plan) => (
                  <section key={plan.id} aria-label={plan.title}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b hairline pb-3">
                      <div>
                        <h3 className="text-xl font-medium tracking-tight">{plan.title}</h3>
                        <p className="text-sm text-muted">{plan.description} Cap {formatIdrShort(plan.cap)}.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {plan.items.length > 0 && profileRef && <Link href={`/simulator?${profileRef}`} className="text-xs text-muted link-u hover:text-fg">Simulate</Link>}
                        {plan.items.length > 0 && profileRef && <Link href={`/visualizer?${profileRef}`} className="text-xs text-muted link-u hover:text-fg">Visualise</Link>}
                        <p className="tabular text-lg">{formatMoney(plan.total)} <span className="text-xs text-subtle">est.</span></p>
                      </div>
                    </div>
                    {plan.items.length === 0 ? (
                      <p className="py-6 text-sm text-muted">No worthwhile upgrade fits within this tier&apos;s budget. Increase the budget or adjust goals.</p>
                    ) : (
                      <ul>{plan.items.map((r) => <RecRow key={r.component.id} r={r} />)}</ul>
                    )}
                  </section>
                ))}
              </div>

              {result.skipped.length > 0 && (
                <section className="mt-14">
                  <h3 className="label-tech mb-3">Not recommended right now</h3>
                  <ul className="divide-y divide-line border-y hairline text-sm">
                    {result.skipped.map((s) => <li key={s.area} className="flex gap-4 py-3"><span className="w-40 shrink-0">{AREA_LABEL[s.area]}</span><span className="text-muted">{s.reason}</span></li>)}
                  </ul>
                </section>
              )}
              {source === "catalog" && cat.bikeById.get(modelId) && (
                <div className="mt-10 flex flex-wrap items-center gap-3 border hairline p-5">
                  <Warehouse className="h-5 w-5 text-muted" />
                  <p className="flex-1 text-sm text-muted">Own this bike? Save it to My Garage to track upgrades and maintenance.</p>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const mdl = cat.bikeById.get(modelId)!;
                    const id = uid("bike");
                    garageStore.set((g) => [...g, { id, nickname: `${cat.brandById.get(mdl.brandId)?.name} ${mdl.name}`, modelId: mdl.id, purchaseYear: mdl.year, purchasePriceIdr: mdl.price?.amount ?? null, log: [], createdAt: new Date().toISOString() }]);
                    toast("Added to My Garage", { action: { label: "Open bike profile", href: `/garage/${id}` } });
                  }}>Add to garage <ArrowRight className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              <DemoNotice className="mt-10" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RecRow({ r }: { r: Recommendation }) {
  const [open, setOpen] = useState(false);
  const wish = useStore(wishlistStore);
  const wished = wish.some((w) => w.refId === r.component.id);
  return (
    <li className="border-b hairline py-5">
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
        <ComponentGlyph type={r.component.type} className="h-10 w-10 text-muted" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-tech">{AREA_LABEL[r.area]}</span>
            <span className={cx("rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase", r.priority === "High" ? "bg-lime/15 text-lime" : r.priority === "Medium" ? "bg-white/5 text-fg" : "bg-white/[0.03] text-muted")}>{r.priority} priority</span>
            <CompatBadge status={r.compatibility} />
          </div>
          <p className="mt-2 text-[17px] font-medium tracking-tight"><Link href={`/components/${r.component.id}`} className="link-u">{r.component.manufacturer} {r.component.name}</Link></p>
          <p className="mt-1 text-sm text-muted">Replaces: <span className="text-fg/80">{r.current || "Stock component"}</span></p>
          <p className="mt-2 text-sm">{r.benefits.slice(0, 2).join(" · ")}</p>
          <button onClick={() => setOpen((v) => !v)} className="mt-2 text-xs text-muted hover:text-fg" aria-expanded={open}>{open ? "Hide details" : "Why this, and what to check"}</button>
          {open && (
            <div className="mt-3 grid gap-4 border-l border-lime/40 pl-4 text-sm md:grid-cols-2">
              <div><p className="label-tech mb-1">Performance implications</p><p className="text-muted">{r.implication}</p></div>
              <div>
                <p className="label-tech mb-1">Weight difference</p>
                <p className="text-muted">{r.weightDeltaG == null ? "Not Available — current part weight unknown" : `${r.weightDeltaG > 0 ? "+" : ""}${r.weightDeltaG} g`}</p>
                <p className="label-tech mb-1 mt-3">Compatibility notes</p>
                {r.compatNotes.length ? <ul className="space-y-1 text-xs text-muted">{r.compatNotes.map((c, i) => <li key={i}><span className="text-fg">{c.label}:</span> {c.message}</li>)}</ul> : <p className="text-xs text-muted">All checks passed against your bike&apos;s known data.</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 md:flex-col md:items-end">
          <span className="tabular text-lg font-medium">{formatMoney(r.price)}</span>
          <button
            onClick={() => {
              if (wished) return;
              wishlistStore.set((l) => [...l, { id: uid("wish"), kind: "component", refId: r.component.id, addedAt: new Date().toISOString() }]);
              toast("Saved to wishlist", { body: `${r.component.manufacturer} ${r.component.name}` });
            }}
            className={cx("inline-flex items-center gap-1.5 text-xs", wished ? "text-lime" : "text-muted hover:text-fg")}
          >
            <Heart className={cx("h-3.5 w-3.5", wished && "fill-current")} /> {wished ? "In wishlist" : "Wishlist"}
          </button>
        </div>
      </div>
    </li>
  );
}
