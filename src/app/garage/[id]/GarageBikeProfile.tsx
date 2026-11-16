"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hammer, Plus, Sparkles, Trash2 } from "lucide-react";
import { buildsStore, garageStore, settingsStore, useCatalog } from "@/lib/state";
import { useHydrated, useStore } from "@/lib/store";
import { estimateValue } from "@/lib/garage";
import { summarize, SLOT_LABEL } from "@/lib/builds";
import type { GarageLogEntry } from "@/lib/types";
import { Photo } from "@/components/Photo";
import { mediaForCategory } from "@/data/media";
import { Button, ButtonLink, EmptyState, Field, SpecRows, Stat } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cx, formatMoney, titleCase, uid } from "@/lib/format";

const KIND_LABEL: Record<GarageLogEntry["kind"], string> = { modification: "Modification", "component-change": "Component change", maintenance: "Maintenance", note: "Note" };

export function GarageBikeProfile({ id }: { id: string }) {
  const cat = useCatalog();
  const router = useRouter();
  const hydrated = useHydrated();
  const garage = useStore(garageStore);
  const builds = useStore(buildsStore);
  const { currency } = useStore(settingsStore);
  const g = garage.find((x) => x.id === id);
  const [entry, setEntry] = useState({ kind: "maintenance" as GarageLogEntry["kind"], title: "", detail: "", cost: "", date: new Date().toISOString().slice(0, 10) });
  const [filter, setFilter] = useState<GarageLogEntry["kind"] | "all">("all");

  if (!hydrated) return <div className="container-x py-16"><div className="skeleton h-96" /></div>;
  if (!g) return <div className="container-x py-24"><EmptyState title="Bike not found in your garage" action={<ButtonLink href="/garage" variant="secondary">Back to garage</ButtonLink>}>It may have been removed, or your garage is stored in a different browser.</EmptyState></div>;

  const model = g.modelId ? cat.bikeById.get(g.modelId) : null;
  const build = g.buildId ? builds.find((b) => b.id === g.buildId) : null;
  const buildSummary = build ? summarize(build, cat.componentById) : null;
  const brand = model ? cat.brandById.get(model.brandId) : null;
  const category = model?.category ?? g.manual?.category ?? (build?.discipline === "universal" ? "road" : build?.discipline) ?? "road";
  const value = estimateValue(g);
  const patch = (p: Partial<typeof g>) => garageStore.set((list) => list.map((x) => (x.id === g.id ? { ...x, ...p } : x)));

  const specRows: Array<[string, unknown]> = model
    ? [["Catalogue model", `${brand?.name} ${model.name} (${model.year})`], ["Category", `${titleCase(model.category)} · ${titleCase(model.subcategory)}`], ["Frame", model.frameMaterial], ["Groupset", model.groupset], ["Brakes", model.brakes], ["Wheelset", model.wheelset], ["Tyres", model.tires], ["Wheel size", model.wheelSize]]
    : g.manual
      ? [["Brand", g.manual.brand], ["Model", g.manual.model], ["Year", g.manual.year], ["Category", titleCase(g.manual.category)], ["Frame", g.manual.frameMaterial], ["Groupset", g.manual.groupset], ["Wheelset", g.manual.wheelset], ["Brakes", g.manual.brakes], ["Wheel size", g.manual.wheelSize]]
      : build && buildSummary
        ? buildSummary.parts.map((c) => [SLOT_LABEL[c.type], `${c.manufacturer} ${c.name}`] as [string, unknown])
        : [];

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.title.trim()) return toast("Give the entry a title", { tone: "error" });
    const item: GarageLogEntry = { id: uid("log"), date: entry.date, kind: entry.kind, title: entry.title.trim(), detail: entry.detail.trim() || undefined, costIdr: entry.cost ? Number(entry.cost) : null };
    patch({ log: [item, ...g.log].sort((a, b) => b.date.localeCompare(a.date)) });
    setEntry({ ...entry, title: "", detail: "", cost: "" });
    toast(`${KIND_LABEL[item.kind]} recorded`);
  };

  const log = g.log.filter((l) => filter === "all" || l.kind === filter);
  const spend = g.log.reduce((s, l) => s + (l.costIdr ?? 0), 0);

  return (
    <>
      <div className="container-x pt-8"><Link href="/garage" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> My Garage</Link></div>
      <section className="container-x grid gap-10 pb-12 pt-8 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Photo asset={mediaForCategory(category, model?.subcategory)} sizes="(min-width: 1024px) 55vw, 100vw" className="absolute inset-0 h-full w-full" label="representative" />
        </div>
        <div>
          <p className="eyebrow">{model ? "Catalogue bike" : g.manual ? "Unlisted bike" : "Custom build"}</p>
          <label htmlFor="nick" className="sr-only">Nickname</label>
          <input id="nick" value={g.nickname} onChange={(e) => patch({ nickname: e.target.value })} className="display mt-3 w-full bg-transparent text-[clamp(2rem,4vw,3.4rem)] outline-none focus:text-lime" />
          <div className="mt-8 grid grid-cols-2 gap-6 border-y hairline py-6">
            <Stat label="Estimated value" value={value.value ? formatMoney(value.value, currency) : "Not Available"} sub={value.basis} />
            <Stat label="Recorded spend" value={formatMoney(spend, currency)} sub={`${g.log.length} log entries`} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Field label="Purchase year" htmlFor="py"><input id="py" className="field" inputMode="numeric" value={g.purchaseYear ?? ""} onChange={(e) => patch({ purchaseYear: e.target.value ? Number(e.target.value.replace(/\D/g, "").slice(0, 4)) : null })} /></Field>
            <Field label="Purchase price (Rp)" htmlFor="pp"><input id="pp" className="field" inputMode="numeric" value={g.purchasePriceIdr ?? ""} onChange={(e) => patch({ purchasePriceIdr: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></Field>
            <Field label="Odometer (km)" htmlFor="od"><input id="od" className="field" inputMode="numeric" value={g.odometerKm ?? ""} onChange={(e) => patch({ odometerKm: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></Field>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href={`/upgrade?garage=${g.id}`}><Sparkles className="h-4 w-4" /> Upgrade Advisor</ButtonLink>
            <ButtonLink href={`/mechanic`} variant="secondary">AI Mechanic</ButtonLink>
            <ButtonLink href={`/visualizer?garage=${g.id}`} variant="secondary">Visualise</ButtonLink>
            <ButtonLink href={`/simulator?garage=${g.id}`} variant="secondary">Simulate upgrades</ButtonLink>
            {build ? <ButtonLink href={`/build?id=${build.id}`} variant="secondary"><Hammer className="h-4 w-4" /> Edit build</ButtonLink> : <ButtonLink href="/build" variant="secondary"><Hammer className="h-4 w-4" /> Plan a custom build</ButtonLink>}
            {model && <ButtonLink href={`/bikes/${model.slug}`} variant="ghost">Catalogue page</ButtonLink>}
            <Button variant="danger" onClick={() => { if (confirm(`Remove ${g.nickname} from your garage? Its log will be deleted.`)) { garageStore.set((l) => l.filter((x) => x.id !== g.id)); toast("Bike removed", { tone: "info" }); router.push("/garage"); } }}><Trash2 className="h-4 w-4" /> Remove</Button>
          </div>
        </div>
      </section>

      <section className="container-x grid gap-14 border-t hairline pt-12 lg:grid-cols-[1fr_1.3fr] [&>*]:min-w-0">
        <div>
          <h2 className="mb-5 text-2xl font-medium tracking-tight">Specifications</h2>
          {specRows.length ? <SpecRows rows={specRows} /> : <p className="text-sm text-muted">The linked catalogue record or build is no longer available.</p>}
          {buildSummary && <p className="mt-4 text-sm text-muted">Build total {formatMoney(buildSummary.price, currency)} · compatibility: {buildSummary.report.overall}</p>}
        </div>

        <div>
          <h2 className="mb-5 text-2xl font-medium tracking-tight">Modifications & maintenance log</h2>
          <form onSubmit={addEntry} className="grid gap-3 border hairline bg-ink-900 p-5 md:grid-cols-4">
            <Field label="Type" htmlFor="lk"><select id="lk" className="field" value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value as GarageLogEntry["kind"] })}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Title" htmlFor="lt" className="md:col-span-2"><input id="lt" className="field" value={entry.title} onChange={(e) => setEntry({ ...entry, title: e.target.value })} placeholder="e.g. Swapped to GP5000 28 mm" /></Field>
            <Field label="Date" htmlFor="ld"><input id="ld" type="date" className="field" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></Field>
            <Field label="Details" htmlFor="ldt" className="md:col-span-3"><input id="ldt" className="field" value={entry.detail} onChange={(e) => setEntry({ ...entry, detail: e.target.value })} placeholder="Optional notes, part numbers, shop…" /></Field>
            <Field label="Cost (Rp)" htmlFor="lc"><input id="lc" className="field" inputMode="numeric" value={entry.cost} onChange={(e) => setEntry({ ...entry, cost: e.target.value.replace(/\D/g, "") })} /></Field>
            <div className="md:col-span-4"><Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /> Add entry</Button></div>
          </form>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {(["all", "modification", "component-change", "maintenance", "note"] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)} className={cx("rounded-sm px-2.5 py-1 text-xs", filter === k ? "bg-ink-700 text-fg" : "text-muted hover:text-fg")}>{k === "all" ? "All" : KIND_LABEL[k]}</button>
            ))}
          </div>
          {log.length === 0 ? (
            <p className="mt-6 border-t hairline pt-6 text-sm text-muted">No entries yet. Record component changes, services and notes to build a history for this bike.</p>
          ) : (
            <ol className="mt-4 border-t hairline">
              {log.map((l) => (
                <li key={l.id} className="grid grid-cols-[90px_1fr_auto] gap-4 border-b hairline py-4">
                  <span className="tabular font-mono text-xs text-muted">{l.date}</span>
                  <div>
                    <p className="label-tech">{KIND_LABEL[l.kind]}</p>
                    <p className="text-[15px]">{l.title}</p>
                    {l.detail && <p className="mt-0.5 text-sm text-muted">{l.detail}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {l.costIdr ? <span className="tabular text-sm">{formatMoney(l.costIdr, currency)}</span> : null}
                    <button onClick={() => patch({ log: g.log.filter((x) => x.id !== l.id) })} aria-label={`Delete entry ${l.title}`} className="text-subtle hover:text-bad"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}
