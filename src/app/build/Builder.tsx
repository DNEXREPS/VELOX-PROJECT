"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Copy, Download, FilePlus2, GitCompare, Plus, Printer, Save, Search, Trash2, Warehouse, X } from "lucide-react";
import { buildsStore, garageStore, settingsStore, useCatalog } from "@/lib/state";
import { createStore, useHydrated, useStore } from "@/lib/store";
import { applyKit, buildToText, disciplineMatches, resolveSelection, SLOT_GROUPS, SLOT_LABEL, summarize } from "@/lib/builds";
import { checkBuild, checkCandidate, STATUS_TEXT, worst, type CompatStatus } from "@/lib/compat";
import type { Build, BuildSelection, Component, ComponentType, Discipline } from "@/lib/types";
import { BikeGraphic } from "@/components/BikeGraphic";
import { ComponentGlyph } from "@/components/Glyphs";
import { Button, CompatBadge, compatDot, DemoNotice, Price, Segmented, SpecRows } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { toggleCompare } from "@/components/catalog";
import { cx, formatMoney, formatWeightG, titleCase, uid } from "@/lib/format";
import { download } from "@/lib/csv";

const newBuild = (discipline: Discipline = "road"): Build => ({
  id: uid("build"), name: "Untitled build", discipline, selection: {}, accessories: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
const draftStore = createStore<Build>("builder-draft", newBuild());

const DISCIPLINES: Array<{ value: Discipline; label: string }> = [
  { value: "road", label: "Road" }, { value: "gravel", label: "Gravel" }, { value: "mtb", label: "MTB" }, { value: "urban", label: "Urban" }, { value: "bmx", label: "BMX" },
];
const GRAPHIC: Record<Discipline, Parameters<typeof BikeGraphic>[0]["category"]> = { road: "road", gravel: "gravel", mtb: "mtb", urban: "urban", bmx: "bmx", universal: "road" };

export function Builder() {
  const cat = useCatalog();
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const draft = useStore(draftStore);
  const saved = useStore(buildsStore);
  const { currency } = useStore(settingsStore);
  const [picker, setPicker] = useState<ComponentType | null>(null);
  const [showChecks, setShowChecks] = useState(true);

  // load ?id=<saved build> into the draft
  const loadId = sp.get("id");
  useEffect(() => {
    if (!loadId) return;
    const b = buildsStore.get().find((x) => x.id === loadId);
    if (b) draftStore.set(structuredClone(b));
    router.replace("/build", { scroll: false });
  }, [loadId, router]);

  // add a component from elsewhere (?add=<componentId>)
  const addId = sp.get("add");
  useEffect(() => {
    if (!addId) return;
    const c = cat.componentById.get(addId);
    if (c) {
      draftStore.set((d) => {
        const selection = c.type === "groupset" ? applyKit(d.selection, c) : { ...d.selection, [c.type]: c.id };
        const discipline = (["road", "gravel", "mtb", "urban", "bmx"] as Discipline[]).find((x) => c.discipline.includes(x)) ?? d.discipline;
        return { ...d, selection, discipline: Object.keys(d.selection).length ? d.discipline : discipline, updatedAt: new Date().toISOString() };
      });
      toast(`${c.manufacturer} ${c.name} added to your build`);
    }
    router.replace("/build", { scroll: false });
  }, [addId, cat.componentById, router]);

  const summary = useMemo(() => summarize(draft, cat.componentById), [draft, cat.componentById]);
  const sel = useMemo(() => resolveSelection(draft.selection, cat.componentById), [draft.selection, cat.componentById]);
  const isSaved = saved.some((b) => b.id === draft.id);
  const dirty = isSaved && JSON.stringify(saved.find((b) => b.id === draft.id)) !== JSON.stringify(draft);

  const update = (patch: Partial<Build>) => draftStore.set((d) => ({ ...d, ...patch, updatedAt: new Date().toISOString() }));
  const setSlot = (slot: ComponentType, c: Component | null) => {
    if (!c) {
      const next = { ...draft.selection };
      delete next[slot];
      update({ selection: next });
      return;
    }
    if (slot === "groupset") {
      update({ selection: applyKit(draft.selection, c) });
      const n = Object.keys(c.kit ?? {}).length;
      toast(`${c.manufacturer} ${c.name} applied`, { body: `${n} parts installed from the groupset kit. You can still swap individual parts.` });
    } else update({ selection: { ...draft.selection, [slot]: c.id } });
    setPicker(null);
  };

  const save = () => {
    const b = { ...draft, updatedAt: new Date().toISOString() };
    buildsStore.set((list) => (list.some((x) => x.id === b.id) ? list.map((x) => (x.id === b.id ? b : x)) : [b, ...list]));
    toast(isSaved ? "Build updated" : "Build saved", { body: b.name, action: { label: "View in My Garage", href: "/garage?tab=builds" } });
  };
  const duplicate = () => {
    const b = { ...structuredClone(draft), id: uid("build"), name: `${draft.name} (copy)`, createdAt: new Date().toISOString() };
    draftStore.set(b);
    toast("Duplicated — editing the copy", { tone: "info" });
  };
  const startNew = () => { draftStore.set(newBuild(draft.discipline)); toast("New empty build", { tone: "info" }); };
  const labelFor = (c: Component) => `${c.manufacturer} ${c.name}`;
  const exportText = () => download(`${draft.name.replace(/\s+/g, "-").toLowerCase()}-velox.txt`, buildToText(draft, summary, labelFor, (n) => formatMoney(n, "IDR")));
  const exportJson = () => download(`${draft.name.replace(/\s+/g, "-").toLowerCase()}-velox.json`, JSON.stringify({ ...draft, components: summary.parts.concat(summary.accessories).map((c) => ({ id: c.id, type: c.type, name: labelFor(c), price: c.price, weightG: c.weightG })), compatibility: summary.report }, null, 2), "application/json");
  const addToGarage = () => {
    if (!isSaved) save();
    const id = uid("bike");
    garageStore.set((g) => [...g, { id, nickname: draft.name, buildId: draft.id, log: [], createdAt: new Date().toISOString(), purchasePriceIdr: summary.price || null }]);
    toast("Build added to My Garage", { action: { label: "Open bike profile", href: `/garage/${id}` } });
  };
  const compareBuild = () => {
    if (!isSaved) save();
    toggleCompare("build", draft.id, draft.name);
  };

  const overall: CompatStatus | "empty" = summary.report.overall;
  const filled = SLOT_GROUPS.flatMap((g) => g.slots).filter((s) => draft.selection[s]).length;

  return (
    <div className="print:text-black">
      {/* header */}
      <header className="border-b hairline">
        <div className="container-x flex flex-col gap-6 py-10 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-4 flex items-center gap-3"><span className="inline-block h-px w-6 bg-lime" />Build a Bike</p>
            <label htmlFor="build-name" className="sr-only">Build name</label>
            <input id="build-name" value={draft.name} onChange={(e) => update({ name: e.target.value })} className="display w-full bg-transparent text-[clamp(2rem,4.4vw,3.6rem)] outline-none placeholder:text-subtle focus:text-lime" placeholder="Name your build" />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Segmented value={draft.discipline} onChange={(v) => update({ discipline: v })} options={DISCIPLINES} />
              <span className="text-xs text-subtle">{filled}/17 parts · {isSaved ? (dirty ? "Unsaved changes" : "Saved") : "Draft (auto-kept in this browser)"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}><Save className="h-4 w-4" /> {isSaved ? "Save changes" : "Save build"}</Button>
            <Button variant="secondary" onClick={duplicate}><Copy className="h-4 w-4" /> Duplicate</Button>
            <Button variant="secondary" onClick={startNew}><FilePlus2 className="h-4 w-4" /> New</Button>
          </div>
        </div>
      </header>

      <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_380px] xl:gap-14 [&>*]:min-w-0">
        {/* slots */}
        <div>
          <div className="relative mb-10 overflow-hidden border hairline bg-gradient-to-b from-ink-900 to-ink-950">
            <div className="grid-bg absolute inset-0 opacity-60" />
            <BikeGraphic category={GRAPHIC[draft.discipline]} suspension={draft.discipline === "mtb" ? (sel.frame?.compat.travelMm ? "full" : "front") : undefined} color={draft.discipline === "bmx" ? "#E11D48" : "#E6EAEE"} disc={sel.brakes ? sel.brakes.compat.brakeInterface === "disc" : draft.discipline !== "bmx"} className="relative mx-auto w-full max-w-3xl p-4 md:p-8" />
            <div className="absolute bottom-3 left-4 right-4 flex justify-between label-tech"><span>{sel.frame ? labelFor(sel.frame) : "No frame selected"}</span><span>{summary.weightKnown ? formatWeightG(summary.weightG) : "—"}</span></div>
          </div>

          {SLOT_GROUPS.map((g) => (
            <section key={g.title} className="mb-10">
              <h2 className="label-tech mb-2">{g.title}</h2>
              <ul className="border-t hairline">
                {g.slots.map((slot) => {
                  const c = sel[slot];
                  const status = summary.report.bySlot[slot];
                  const isKit = slot === "groupset";
                  return (
                    <li key={slot} className="border-b hairline">
                      <div className="flex items-center gap-3 py-3 md:gap-4">
                        <button onClick={() => setPicker(slot)} className="group flex min-w-0 flex-1 items-center gap-3 text-left md:gap-4" aria-label={`${c ? "Change" : "Choose"} ${SLOT_LABEL[slot]}`}>
                          <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center border transition-colors", c ? "border-line-strong text-fg" : "border-dashed border-line text-subtle group-hover:text-muted")}>
                            <ComponentGlyph type={slot} className="h-7 w-7" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="label-tech flex items-center gap-2">{SLOT_LABEL[slot]}{status && <span className={cx("h-1.5 w-1.5 rounded-full", compatDot[status])} title={STATUS_TEXT[status]} />}</span>
                            <span className={cx("block truncate text-[15px]", c ? "text-fg" : "text-subtle")}>{c ? labelFor(c) : isKit ? "Choose a groupset to install a full kit" : "Not selected"}</span>
                          </span>
                        </button>
                        {c && !isKit && <span className="hidden w-20 text-right font-mono text-xs text-muted sm:block">{formatWeightG(c.weightG)}</span>}
                        {c && !isKit && <span className="hidden w-32 text-right text-sm md:block"><Price price={c.price} showType={false} /></span>}
                        {isKit && c && <span className="hidden text-xs text-subtle md:block">Kit reference — parts counted below</span>}
                        {c ? (
                          <button onClick={() => setSlot(slot, null)} className="flex h-8 w-8 items-center justify-center text-subtle hover:text-bad" aria-label={`Remove ${SLOT_LABEL[slot]}`}><X className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => setPicker(slot)} className="flex h-8 w-8 items-center justify-center text-subtle hover:text-lime" aria-label={`Add ${SLOT_LABEL[slot]}`}><Plus className="h-4 w-4" /></button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="mb-10">
            <div className="mb-2 flex items-baseline justify-between"><h2 className="label-tech">Additional accessories</h2><button onClick={() => setPicker("accessory")} className="text-xs text-muted hover:text-lime">+ Add accessory</button></div>
            <ul className="border-t hairline">
              {summary.accessories.length === 0 && <li className="border-b hairline py-4 text-sm text-subtle">No accessories — add a computer, lights, pump or bags.</li>}
              {summary.accessories.map((c) => (
                <li key={c.id} className="flex items-center gap-4 border-b hairline py-3">
                  <ComponentGlyph type="accessory" className="h-7 w-7 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm">{labelFor(c)}</span>
                  <span className="text-sm"><Price price={c.price} showType={false} /></span>
                  <button onClick={() => update({ accessories: draft.accessories.filter((x) => x !== c.id) })} aria-label={`Remove ${c.name}`} className="text-subtle hover:text-bad"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="border hairline bg-ink-900">
            <div className="flex items-center justify-between border-b hairline px-5 py-4">
              <p className="label-tech">Build summary</p>
              {overall === "empty" ? <span className="text-xs text-subtle">Add parts to check</span> : <CompatBadge status={overall} />}
            </div>
            <div className="grid grid-cols-2 border-b hairline">
              <div className="border-r hairline px-5 py-5">
                <p className="label-tech">Est. total</p>
                <p className="tabular mt-1 text-xl font-medium tracking-tight">{hydrated ? formatMoney(summary.price, currency) : "—"}</p>
                {summary.unpricedCount > 0 && <p className="mt-1 text-[11px] text-warn">{summary.unpricedCount} without price</p>}
              </div>
              <div className="px-5 py-5">
                <p className="label-tech">Listed weight</p>
                <p className="tabular mt-1 text-xl font-medium tracking-tight">{summary.weightKnown ? formatWeightG(summary.weightG) : "—"}</p>
                {summary.weightMissing > 0 && <p className="mt-1 text-[11px] text-warn">{summary.weightMissing} part(s) without weight data</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 border-b hairline text-center">
              {(["compatible", "potential", "insufficient", "incompatible"] as CompatStatus[]).map((s) => (
                <div key={s} className="border-r hairline px-2 py-3 last:border-r-0">
                  <p className={cx("tabular text-lg font-medium", summary.report.counts[s] ? "" : "text-subtle")}>{summary.report.counts[s]}</p>
                  <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted"><span className={cx("h-1.5 w-1.5 rounded-full", compatDot[s])} />{STATUS_TEXT[s].split(" ")[0]}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowChecks((v) => !v)} className="flex w-full items-center justify-between px-5 py-3 text-sm text-muted hover:text-fg" aria-expanded={showChecks}>
              Compatibility checks ({summary.report.checks.length}) <ChevronDown className={cx("h-4 w-4 transition-transform", showChecks && "rotate-180")} />
            </button>
            {showChecks && (
              <ul className="max-h-[42vh] divide-y divide-line overflow-y-auto border-t hairline">
                {summary.report.checks.length === 0 && <li className="px-5 py-6 text-sm text-subtle">Choose two related parts (e.g. frame + crankset) to see checks.</li>}
                {summary.report.checks.map((c, i) => (
                  <li key={`${c.id}-${i}`} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm">{c.label}</p><CompatBadge status={c.status} short /></div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{c.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-px border-t hairline bg-line">
              <button onClick={exportText} className="flex items-center justify-center gap-2 bg-ink-900 py-3 text-xs text-muted hover:text-fg"><Download className="h-3.5 w-3.5" /> Export .txt</button>
              <button onClick={exportJson} className="flex items-center justify-center gap-2 bg-ink-900 py-3 text-xs text-muted hover:text-fg"><Download className="h-3.5 w-3.5" /> Export .json</button>
              <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-ink-900 py-3 text-xs text-muted hover:text-fg"><Printer className="h-3.5 w-3.5" /> Print</button>
              <button onClick={compareBuild} className="flex items-center justify-center gap-2 bg-ink-900 py-3 text-xs text-muted hover:text-fg"><GitCompare className="h-3.5 w-3.5" /> Compare</button>
              <button onClick={addToGarage} className="col-span-2 flex items-center justify-center gap-2 bg-ink-900 py-3 text-xs text-muted hover:text-fg"><Warehouse className="h-3.5 w-3.5" /> Add to My Garage</button>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-subtle">Compatibility is evaluated from catalogue data. When data is missing VELOX reports “Insufficient Information” — always confirm with the manufacturer or a mechanic.</p>

          {hydrated && saved.length > 0 && (
            <div className="mt-8">
              <p className="label-tech mb-2">Saved builds ({saved.length})</p>
              <ul className="border-t hairline">
                {saved.map((b) => {
                  const s = summarize(b, cat.componentById);
                  return (
                    <li key={b.id} className={cx("flex items-center gap-3 border-b hairline py-2.5", b.id === draft.id && "text-lime")}>
                      <button onClick={() => draftStore.set(structuredClone(b))} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm">{b.name}</span>
                        <span className="block text-[11px] text-muted">{titleCase(b.discipline)} · {formatMoney(s.price, currency)} · {s.report.overall === "empty" ? "no checks" : STATUS_TEXT[s.report.overall as CompatStatus]}</span>
                      </button>
                      <button onClick={() => { buildsStore.set((l) => l.filter((x) => x.id !== b.id)); toast("Build deleted", { tone: "info" }); }} aria-label={`Delete ${b.name}`} className="text-subtle hover:text-bad"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  );
                })}
              </ul>
              {saved.length >= 2 && <Link href="/compare?kind=build" className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">Compare saved builds <ChevronRight className="h-3 w-3" /></Link>}
            </div>
          )}
        </aside>
      </div>
      <div className="container-x"><DemoNotice /></div>

      {picker && (
        <Picker
          slot={picker}
          discipline={draft.discipline}
          selection={draft.selection}
          currentId={picker === "accessory" ? undefined : draft.selection[picker]}
          catalog={cat.components}
          byId={cat.componentById}
          onClose={() => setPicker(null)}
          onPick={(c) => {
            if (picker === "accessory") {
              if (!draft.accessories.includes(c.id)) update({ accessories: [...draft.accessories, c.id] });
              toast("Accessory added", { body: labelFor(c) });
              setPicker(null);
            } else setSlot(picker, c);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------- picker --------------------------------- */

function Picker({ slot, discipline, selection, currentId, catalog, byId, onClose, onPick }: {
  slot: ComponentType; discipline: Discipline; selection: BuildSelection; currentId?: string; catalog: Component[]; byId: Map<string, Component>; onClose: () => void; onPick: (c: Component) => void;
}) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [sort, setSort] = useState<"fit" | "price" | "weight">("fit");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const base = useMemo(() => {
    const s = resolveSelection(selection, byId);
    delete s[slot];
    return s;
  }, [selection, byId, slot]);

  const rows = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = catalog.filter((c) => c.type === slot && (all || disciplineMatches(c, discipline)) && terms.every((t) => `${c.manufacturer} ${c.name} ${c.series ?? ""}`.toLowerCase().includes(t)));
    const rank: Record<CompatStatus | "empty", number> = { empty: 0, compatible: 0, potential: 1, insufficient: 2, incompatible: 3 };
    return list
      .map((c) => {
        if (slot === "groupset") {
          const sel = resolveSelection(applyKit(selection, c), byId);
          const kitSlots = Object.keys(c.kit ?? {});
          const checks = checkBuild(sel).checks.filter((x) => x.slots.some((s) => kitSlots.includes(s)));
          let status: CompatStatus | "empty" = checks.length ? "compatible" : "empty";
          for (const ch of checks) status = status === "empty" ? ch.status : worst(status, ch.status);
          return { c, status, checks };
        }
        if (slot === "accessory") return { c, status: "empty" as const, checks: [] };
        const r = checkCandidate(base, c);
        return { c, status: r.status, checks: r.checks };
      })
      .sort((a, b) => {
        if (sort === "price") return (a.c.price?.amount ?? Infinity) - (b.c.price?.amount ?? Infinity);
        if (sort === "weight") return (a.c.weightG ?? Infinity) - (b.c.weightG ?? Infinity);
        return rank[a.status] - rank[b.status] || (a.c.price?.amount ?? 0) - (b.c.price?.amount ?? 0);
      });
  }, [catalog, slot, all, discipline, q, sort, base, selection, byId]);

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-ink-950/70 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Choose ${SLOT_LABEL[slot]}`} className="flex h-full w-full max-w-2xl animate-fade-up flex-col border-l hairline bg-ink-900" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b hairline px-5 py-5 md:px-7">
          <div className="flex items-center justify-between">
            <div><p className="label-tech">Choose</p><h2 className="mt-1 text-2xl font-medium tracking-tight">{SLOT_LABEL[slot]}</h2></div>
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center text-muted hover:text-fg"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${SLOT_LABEL[slot].toLowerCase()}…`} className="field pl-9" aria-label="Search components" />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field w-auto" aria-label="Sort">
              <option value="fit">Best fit first</option><option value="price">Lowest price</option><option value="weight">Lightest</option>
            </select>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[#C5F36A]" /> Show parts from all disciplines (not only {discipline})
          </label>
          {slot === "groupset" && <p className="mt-3 text-xs text-subtle">Selecting a groupset installs its shifters, derailleurs, crankset, cassette, chain and brakes where available.</p>}
        </div>
        <ul className="flex-1 overflow-y-auto px-5 md:px-7">
          {rows.length === 0 && <li className="py-16 text-center text-sm text-muted">No {SLOT_LABEL[slot].toLowerCase()} match. Try showing all disciplines or clearing the search.</li>}
          {rows.map(({ c, status, checks }) => {
            const expanded = open === c.id;
            const problems = checks.filter((x) => x.status !== "compatible");
            return (
              <li key={c.id} className={cx("border-b hairline", c.id === currentId && "bg-lime/[0.03]")}>
                <div className="flex items-center gap-4 py-4">
                  <ComponentGlyph type={c.type} className="h-9 w-9 shrink-0 text-muted" />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded}>
                    <span className="label-tech">{c.manufacturer} · {titleCase(c.tier)}</span>
                    <span className="block truncate text-[15px]">{c.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <Price price={c.price} showType={false} />
                      <span className="font-mono">{formatWeightG(c.weightG)}</span>
                      {status !== "empty" && <CompatBadge status={status} short />}
                      {problems[0] && <span className="truncate text-subtle">{problems[0].label}</span>}
                    </span>
                  </button>
                  {c.id === currentId ? <span className="label-tech text-lime">Selected</span> : <Button size="sm" variant={status === "incompatible" ? "secondary" : "primary"} onClick={() => onPick(c)}>Select</Button>}
                </div>
                {expanded && (
                  <div className="grid gap-6 pb-5 md:grid-cols-2">
                    <SpecRows rows={[["Material", c.material], ["Weight", formatWeightG(c.weightG)], ...Object.entries(c.specs)]} />
                    <div>
                      <p className="label-tech mb-2">Compatibility with your build</p>
                      {checks.length === 0 ? <p className="text-xs text-subtle">No related parts selected yet.</p> : (
                        <ul className="space-y-2">{checks.map((x, i) => <li key={i} className="text-xs"><span className={cx("mr-2 inline-block h-1.5 w-1.5 rounded-full", compatDot[x.status])} /><span className="text-fg">{x.label}:</span> <span className="text-muted">{x.message}</span></li>)}</ul>
                      )}
                      <Link href={`/components/${c.id}`} target="_blank" className="mt-3 inline-block text-xs text-muted hover:text-fg">Full component page ↗</Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
