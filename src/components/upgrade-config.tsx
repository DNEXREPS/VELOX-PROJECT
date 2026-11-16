"use client";
import { useMemo } from "react";
import Link from "next/link";
import { buildsStore, garageStore, settingsStore, useCatalog } from "@/lib/state";
import { useStore } from "@/lib/store";
import { profileFromModel, virtualSelection, adviseUpgrades, type BikeProfile } from "@/lib/upgrade";
import { profileFromGarage } from "@/lib/profiles";
import { checkCandidate } from "@/lib/compat";
import { simulate, PRACTICAL_NOTES, type SimSwap } from "@/lib/simulator";
import type { BikeModel, Component, ComponentType, Discipline } from "@/lib/types";
import { CompatBadge, Field } from "@/components/ui";
import { cx, formatMoney, formatWeightG, NA, titleCase } from "@/lib/format";

export const UPGRADE_SLOTS: ComponentType[] = ["wheelset", "tires", "groupset", "cassette", "brakes", "handlebar", "stem", "saddle", "seatpost", "pedals"];
export type Picks = Partial<Record<ComponentType, string>>;

/** Resolve "garage:<id>" / "model:<id>" into an advisor profile + optional catalogue model. */
export function useBikeProfile(ref: string): { profile: BikeProfile | null; model: BikeModel | null } {
  const cat = useCatalog();
  const garage = useStore(garageStore);
  const builds = useStore(buildsStore);
  return useMemo(() => {
    if (ref.startsWith("garage:")) {
      const g = garage.find((x) => x.id === ref.slice(7));
      if (!g) return { profile: null, model: null };
      return { profile: profileFromGarage(g, cat, builds), model: g.modelId ? cat.bikeById.get(g.modelId) ?? null : null };
    }
    if (ref.startsWith("model:")) {
      const m = cat.bikeById.get(ref.slice(6)) ?? null;
      return { profile: m ? profileFromModel(m, cat.brandById.get(m.brandId)?.name ?? "") : null, model: m };
    }
    return { profile: null, model: null };
  }, [ref, garage, builds, cat]);
}

export function BikePicker({ value, onChange, id = "bike-pick" }: { value: string; onChange: (v: string) => void; id?: string }) {
  const cat = useCatalog();
  const garage = useStore(garageStore);
  return (
    <Field label="Bike" htmlFor={id}>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a bike…</option>
        {garage.length > 0 && <optgroup label="My Garage">{garage.map((g) => <option key={g.id} value={`garage:${g.id}`}>{g.nickname}</option>)}</optgroup>}
        <optgroup label="Catalogue">{cat.bikes.map((b) => <option key={b.id} value={`model:${b.id}`}>{cat.brandById.get(b.brandId)?.name} {b.name} ({b.year})</option>)}</optgroup>
      </select>
    </Field>
  );
}

const DISC: Record<string, Discipline[]> = { road: ["road", "universal"], gravel: ["gravel", "road", "universal"], mtb: ["mtb", "universal"], urban: ["urban", "universal"], folding: ["urban", "universal"], electric: ["urban", "mtb", "universal"], bmx: ["bmx"], other: ["road", "urban", "gravel", "universal"] };

export function PartPickers({ profile, picks, onChange }: { profile: BikeProfile | null; picks: Picks; onChange: (p: Picks) => void }) {
  const cat = useCatalog();
  const base = useMemo(() => (profile ? virtualSelection(profile) : {}), [profile]);
  const discs = DISC[profile?.category ?? "road"];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {UPGRADE_SLOTS.map((slot) => {
        const options = cat.components.filter((c) => c.type === slot && c.discipline.some((d) => discs.includes(d)));
        const current = picks[slot] ? cat.componentById.get(picks[slot]!) : null;
        const status = current && profile ? checkCandidate(base, current).status : null;
        return (
          <Field key={slot} label={titleCase(slot)} htmlFor={`pick-${slot}`}>
            <select id={`pick-${slot}`} className="field" value={picks[slot] ?? ""} onChange={(e) => onChange({ ...picks, [slot]: e.target.value || undefined })}>
              <option value="">Keep current</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.manufacturer} {c.name}</option>)}
            </select>
            {status && status !== "empty" && <CompatBadge status={status} short className="mt-1 w-fit" />}
          </Field>
        );
      })}
    </div>
  );
}

/** Advisor plans → picks, so Visualizer/Simulator concepts reuse Upgrade Advisor logic. */
export function usePlanPicks(profile: BikeProfile | null): Record<"budget" | "balanced" | "performance", Picks> | null {
  const cat = useCatalog();
  return useMemo(() => {
    if (!profile) return null;
    const res = adviseUpgrades({ profile, budget: Math.max(3_000_000, Math.round((profile.priceIdr ?? 15_000_000) * 0.5)), goals: ["speed", "comfort"], catalog: cat.components, componentById: cat.componentById });
    const out = { budget: {}, balanced: {}, performance: {} } as Record<"budget" | "balanced" | "performance", Picks>;
    for (const p of res.plans) for (const r of p.items) out[p.id][r.component.type] = r.component.id;
    return out;
  }, [profile, cat]);
}

export function buildSwaps(profile: BikeProfile, picks: Picks, byId: Map<string, Component>): SimSwap[] {
  const swaps: SimSwap[] = [];
  for (const slot of UPGRADE_SLOTS) {
    const id = picks[slot];
    if (!id) continue;
    const replacement = byId.get(id);
    if (!replacement) continue;
    const installed = profile.installed?.[slot];
    const area = slot === "handlebar" ? "cockpit" : slot === "cassette" ? "drivetrain" : slot;
    const currentName = (profile.current as Record<string, string | null | undefined>)[area] ?? installed?.name ?? "Stock part";
    swaps.push({ slot, original: { name: installed ? `${installed.manufacturer} ${installed.name}` : currentName || "Stock part", weightG: installed?.weightG ?? null, source: installed ? "catalogue" : "unknown" }, replacement });
  }
  return swaps;
}

export function SimulatorPanel({ profile, picks, bikeWeightKg }: { profile: BikeProfile; picks: Picks; bikeWeightKg: number | null }) {
  const cat = useCatalog();
  const { currency } = useStore(settingsStore);
  const swaps = useMemo(() => buildSwaps(profile, picks, cat.componentById), [profile, picks, cat.componentById]);
  const r = useMemo(() => simulate(swaps, bikeWeightKg), [swaps, bikeWeightKg]);
  const delta = (g: number | null) => (g == null ? NA : `${g > 0 ? "+" : ""}${g} g`);
  if (!swaps.length) return <p className="border border-dashed hairline p-6 text-sm text-muted">Choose at least one replacement part to see weight and cost changes.</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
        {[
          ["Known weight change", r.deltasKnown ? delta(r.knownDeltaG) : NA, `${r.deltasKnown} of ${r.lines.length} parts with both weights`],
          ["Bike weight before → after", r.bikeWeightBeforeKg != null && r.bikeWeightAfterKg != null ? `${r.bikeWeightBeforeKg} → ${r.bikeWeightAfterKg} kg` : NA, r.bikeWeightNote],
          ["Upgrade cost", formatMoney(r.totalCost, currency), r.estimatedPrices ? "VELOX estimates, excludes labour" : r.unpriced ? `${r.unpriced} part(s) without price` : "Catalogue prices"],
          ["Parts changed", String(r.lines.length), r.deltasUnknown ? `${r.deltasUnknown} weight difference(s) unknown` : "All weight differences known"],
        ].map(([l, v, s]) => (
          <div key={l} className="bg-ink-950 p-5"><p className="label-tech">{l}</p><p className="tabular mt-1 text-xl font-medium tracking-tight">{v}</p><p className="mt-1 text-[11px] leading-snug text-subtle">{s}</p></div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b hairline text-left">{["Part", "Original", "Replacement", "Weight Δ", "Cost", "Practical effect"].map((h) => <th key={h} className="py-2 pr-3 font-normal label-tech">{h}</th>)}</tr></thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={l.slot} className="border-b hairline align-top">
                <td className="py-3 pr-3">{titleCase(l.slot)}</td>
                <td className="py-3 pr-3 text-muted">{l.originalName}<span className="block font-mono text-[11px] text-subtle">{formatWeightG(l.originalWeightG)}</span></td>
                <td className="py-3 pr-3"><Link href={`/components/${cat.componentById.get(picks[l.slot]!)?.id}`} className="link-u">{l.replacementName}</Link><span className="block font-mono text-[11px] text-subtle">{formatWeightG(l.replacementWeightG)}</span></td>
                <td className={cx("tabular py-3 pr-3", l.deltaG == null ? "italic text-subtle" : l.deltaG < 0 ? "text-lime" : "text-warn")} title={l.weightBasis}>{delta(l.deltaG)}</td>
                <td className="tabular py-3 pr-3">{l.price != null ? formatMoney(l.price, currency) : NA}</td>
                <td className="py-3 text-xs text-muted">{PRACTICAL_NOTES[l.slot] ?? l.benefits[0] ?? NA}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mt-5 text-sm">
        <summary className="cursor-pointer text-muted hover:text-fg">How these numbers are calculated</summary>
        <ul className="mt-3 space-y-1.5 text-xs text-muted">{r.method.map((m) => <li key={m}>— {m}</li>)}</ul>
      </details>
    </div>
  );
}
