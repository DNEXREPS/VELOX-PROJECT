"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Hammer, Plus, Trash2, X } from "lucide-react";
import { buildsStore, garageStore, settingsStore, useCatalog, wishlistStore } from "@/lib/state";
import { useHydrated, useStore } from "@/lib/store";
import { summarize } from "@/lib/builds";
import { estimateValue } from "@/lib/garage";
import { STATUS_TEXT, type CompatStatus } from "@/lib/compat";
import type { BrakeType, CategoryId, GarageBike, WheelSize } from "@/lib/types";
import { Photo } from "@/components/Photo";
import { mediaForCategory } from "@/data/media";
import { BikeImage, MissingBikeImage } from "@/components/BikeImage";
import { ComponentGlyph } from "@/components/Glyphs";
import { Button, ButtonLink, EmptyState, Field, PageHeader, Price, Segmented, Skeleton } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cx, formatMoney, titleCase, uid } from "@/lib/format";

type Tab = "bikes" | "builds" | "wishlist";

export function Garage() {
  const cat = useCatalog();
  const sp = useSearchParams();
  const hydrated = useHydrated();
  const garage = useStore(garageStore);
  const builds = useStore(buildsStore);
  const wishlist = useStore(wishlistStore);
  const { currency } = useStore(settingsStore);
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) ?? "bikes");
  const [adding, setAdding] = useState(false);

  const totalValue = garage.reduce((s, g) => s + (estimateValue(g).value ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="My Garage" title={<>Your bikes.<br /><span className="text-muted">Your history.</span></>} action={<Button size="lg" onClick={() => { setTab("bikes"); setAdding(true); }}><Plus className="h-4 w-4" /> Add a bike</Button>}>
        Register the bikes you own, track modifications, component changes and maintenance, keep your saved builds and wishlist — and jump straight to upgrade advice for any bike. Stored privately in this browser in demo mode.
      </PageHeader>
      <div className="container-x py-10">
        <div className="mb-8 grid grid-cols-2 gap-6 border-b hairline pb-8 md:grid-cols-4">
          {[["Bikes", hydrated ? garage.length : "—"], ["Saved builds", hydrated ? builds.length : "—"], ["Wishlist", hydrated ? wishlist.length : "—"], ["Est. garage value", hydrated ? formatMoney(totalValue || null, currency) : "—"]].map(([l, v]) => (
            <div key={l as string}><p className="label-tech">{l}</p><p className="tabular mt-1 text-2xl font-medium tracking-tight">{v}</p></div>
          ))}
        </div>
        <Segmented value={tab} onChange={setTab} options={[{ value: "bikes", label: "Bikes" }, { value: "builds", label: "Saved builds" }, { value: "wishlist", label: "Wishlist" }]} />

        <div className="mt-8">
          {!hydrated ? <Skeleton className="h-64" /> : tab === "bikes" ? (
            <>
              {adding && <AddBike onDone={() => setAdding(false)} />}
              {garage.length === 0 && !adding ? (
                <EmptyState title="Your garage is empty" action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add your first bike</Button>}>Add a bike from the catalogue, enter an unlisted bike manually, or save a custom build.</EmptyState>
              ) : (
                <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
                  {garage.map((g) => <GarageTile key={g.id} g={g} />)}
                </ul>
              )}
            </>
          ) : tab === "builds" ? (
            builds.length === 0 ? (
              <EmptyState title="No saved builds" action={<ButtonLink href="/build"><Hammer className="h-4 w-4" /> Start a build</ButtonLink>}>Configure a bike part-by-part in Build a Bike and save it here.</EmptyState>
            ) : (
              <ul className="border-t hairline">
                {builds.map((b) => {
                  const s = summarize(b, cat.componentById);
                  return (
                    <li key={b.id} className="flex flex-wrap items-center gap-4 border-b hairline py-4">
                      <Photo asset={mediaForCategory(b.discipline === "universal" ? "road" : b.discipline === "urban" ? "urban" : b.discipline)} sizes="112px" className="h-16 w-28 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium">{b.name}</p>
                        <p className="text-xs text-muted">{titleCase(b.discipline)} · {s.parts.length} parts · updated {new Date(b.updatedAt).toLocaleDateString("en-GB")}</p>
                      </div>
                      <span className="tabular text-sm">{formatMoney(s.price, currency)}</span>
                      <span className="w-44 text-xs text-muted">{s.report.overall === "empty" ? "No checks yet" : STATUS_TEXT[s.report.overall as CompatStatus]}</span>
                      <ButtonLink href={`/build?id=${b.id}`} variant="secondary" size="sm">Open</ButtonLink>
                      <button onClick={() => { buildsStore.set((l) => l.filter((x) => x.id !== b.id)); toast("Build deleted", { tone: "info" }); }} className="text-subtle hover:text-bad" aria-label={`Delete ${b.name}`}><Trash2 className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : wishlist.length === 0 ? (
            <EmptyState title="Wishlist is empty">Tap the heart on any bike or component to save it here.</EmptyState>
          ) : (
            <ul className="border-t hairline">
              {wishlist.map((w) => {
                const bike = w.kind === "bike" ? cat.bikeById.get(w.refId) : null;
                const comp = w.kind === "component" ? cat.componentById.get(w.refId) : null;
                if (!bike && !comp) return null;
                const title = bike ? `${cat.brandById.get(bike.brandId)?.name} ${bike.name} (${bike.year})` : `${comp!.manufacturer} ${comp!.name}`;
                return (
                  <li key={w.id} className="flex items-center gap-4 border-b hairline py-4">
                    {bike ? <BikeImage bike={bike} variant="thumb" sizes="96px" className="h-14 w-24 shrink-0" /> : <ComponentGlyph type={comp!.type} className="h-10 w-10 text-muted" />}
                    <Link href={bike ? `/bikes/${bike.slug}` : `/components/${comp!.id}`} className="min-w-0 flex-1 truncate text-[15px] link-u">{title}</Link>
                    <Price price={bike ? bike.price : comp!.price} className="hidden text-sm sm:inline-flex" />
                    <button onClick={() => wishlistStore.set((l) => l.filter((x) => x.id !== w.id))} className="text-subtle hover:text-bad" aria-label={`Remove ${title} from wishlist`}><X className="h-4 w-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function GarageTile({ g }: { g: GarageBike }) {
  const cat = useCatalog();
  const { currency } = useStore(settingsStore);
  const model = g.modelId ? cat.bikeById.get(g.modelId) : null;
  const category: CategoryId = model?.category ?? g.manual?.category ?? "road";
  const v = estimateValue(g);
  const sub = model ? `${cat.brandById.get(model.brandId)?.name} ${model.name} · ${model.year}` : g.manual ? `${g.manual.brand} ${g.manual.model}${g.manual.year ? ` · ${g.manual.year}` : ""} · Unlisted` : g.buildId ? "Custom build" : "";
  return (
    <li className="group relative border-t hairline pt-5">
      <Link href={`/garage/${g.id}`} className="absolute inset-0 z-10" aria-label={`Open ${g.nickname}`} />
      <div className="relative aspect-[4/3] overflow-hidden">
        {model ? <BikeImage bike={model} brandName={cat.brandById.get(model.brandId)?.name} sizes="(min-width: 768px) 33vw, 100vw" className="absolute inset-0 h-full w-full" /> : <MissingBikeImage className="absolute inset-0" brandName={g.manual?.brand ?? "Custom build"} name={g.manual?.model ?? g.nickname} year={g.manual?.year ?? undefined} />}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="label-tech truncate">{sub}</p><h3 className="mt-1 truncate text-lg font-medium tracking-tight">{g.nickname}</h3></div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle group-hover:text-lime" />
      </div>
      <div className="mt-3 flex justify-between text-sm"><span className="text-muted">{g.log.length} log entries</span><span className="tabular">{v.value ? `≈ ${formatMoney(v.value, currency)}` : "Value n/a"}</span></div>
    </li>
  );
}

function AddBike({ onDone }: { onDone: () => void }) {
  const cat = useCatalog();
  const builds = useStore(buildsStore);
  const [mode, setMode] = useState<"catalog" | "manual" | "build">("catalog");
  const [brandId, setBrandId] = useState("polygon");
  const models = useMemo(() => cat.all.bikes.filter((b) => b.brandId === brandId && b.provenance.status !== "archived"), [cat, brandId]);
  const [modelId, setModelId] = useState("");
  const [buildId, setBuildId] = useState("");
  const [nick, setNick] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [man, setMan] = useState({ brand: "", model: "", year: "", category: "road" as CategoryId, frameMaterial: "", groupset: "", wheelset: "", brakes: "", brakeType: "" as BrakeType | "", wheelSize: "" as WheelSize | "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = uid("bike");
    const base = { id, log: [], createdAt: new Date().toISOString(), purchaseYear: year ? Number(year) : null, purchasePriceIdr: price ? Number(price) : null, odometerKm: 0 };
    let bike: GarageBike;
    if (mode === "catalog") {
      const m = cat.bikeById.get(modelId || models[0]?.id);
      if (!m) return toast("Choose a model", { tone: "error" });
      bike = { ...base, nickname: nick || `${cat.brandById.get(m.brandId)?.name} ${m.name}`, modelId: m.id, purchaseYear: base.purchaseYear ?? m.year, purchasePriceIdr: base.purchasePriceIdr ?? m.price?.amount ?? null };
    } else if (mode === "build") {
      const b = builds.find((x) => x.id === (buildId || builds[0]?.id));
      if (!b) return toast("No saved build selected", { tone: "error" });
      bike = { ...base, nickname: nick || b.name, buildId: b.id, purchasePriceIdr: base.purchasePriceIdr ?? (summarize(b, cat.componentById).price || null) };
    } else {
      if (!man.brand.trim() || !man.model.trim()) return toast("Brand and model are required", { tone: "error" });
      bike = {
        ...base, nickname: nick || `${man.brand} ${man.model}`,
        manual: { brand: man.brand, model: man.model, year: man.year ? Number(man.year) : null, category: man.category, frameMaterial: man.frameMaterial || null, groupset: man.groupset || null, wheelset: man.wheelset || null, brakes: man.brakes || null, brakeType: (man.brakeType || null) as BrakeType | null, wheelSize: (man.wheelSize || null) as WheelSize | null },
      };
    }
    garageStore.set((g) => [...g, bike]);
    toast("Bike added to your garage", { body: bike.nickname, action: { label: "Open profile", href: `/garage/${id}` } });
    onDone();
  };

  return (
    <form onSubmit={submit} className="mb-12 border hairline bg-ink-900 p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-medium tracking-tight">Add a bike</h2><button type="button" onClick={onDone} aria-label="Cancel"><X className="h-5 w-5 text-muted" /></button></div>
      <Segmented value={mode} onChange={setMode} options={[{ value: "catalog", label: "From catalogue" }, { value: "manual", label: "Unlisted bike" }, { value: "build", label: "From a saved build" }]} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {mode === "catalog" && (
          <>
            <Field label="Brand" htmlFor="g-brand"><select id="g-brand" className="field" value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(""); }}>{cat.brands.filter((b) => cat.all.bikes.some((m) => m.brandId === b.id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="Model & year" htmlFor="g-model" className="md:col-span-2"><select id="g-model" className="field" value={modelId || models[0]?.id || ""} onChange={(e) => setModelId(e.target.value)}>{models.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.year}{m.provenance.status === "discontinued" ? " (discontinued)" : ""}</option>)}</select></Field>
          </>
        )}
        {mode === "build" && (
          builds.length ? <Field label="Saved build" htmlFor="g-build" className="md:col-span-3"><select id="g-build" className="field" value={buildId || builds[0].id} onChange={(e) => setBuildId(e.target.value)}>{builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            : <p className="text-sm text-muted md:col-span-3">No saved builds yet. <Link href="/build" className="text-lime link-u">Create one</Link>.</p>
        )}
        {mode === "manual" && (
          <>
            <Field label="Brand *" htmlFor="g-mb"><input id="g-mb" required className="field" value={man.brand} onChange={(e) => setMan({ ...man, brand: e.target.value })} placeholder="e.g. Exotic" /></Field>
            <Field label="Model *" htmlFor="g-mm"><input id="g-mm" required className="field" value={man.model} onChange={(e) => setMan({ ...man, model: e.target.value })} placeholder="e.g. 2611 MTB" /></Field>
            <Field label="Model year" htmlFor="g-my"><input id="g-my" className="field" inputMode="numeric" value={man.year} onChange={(e) => setMan({ ...man, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
            <Field label="Category" htmlFor="g-mc"><select id="g-mc" className="field" value={man.category} onChange={(e) => setMan({ ...man, category: e.target.value as CategoryId })}>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Frame material" htmlFor="g-mf"><input id="g-mf" className="field" value={man.frameMaterial} onChange={(e) => setMan({ ...man, frameMaterial: e.target.value })} /></Field>
            <Field label="Groupset" htmlFor="g-mg"><input id="g-mg" className="field" value={man.groupset} onChange={(e) => setMan({ ...man, groupset: e.target.value })} placeholder="e.g. Shimano Altus" /></Field>
            <Field label="Wheelset" htmlFor="g-mw"><input id="g-mw" className="field" value={man.wheelset} onChange={(e) => setMan({ ...man, wheelset: e.target.value })} /></Field>
            <Field label="Brakes" htmlFor="g-mbt"><select id="g-mbt" className="field" value={man.brakeType} onChange={(e) => setMan({ ...man, brakeType: e.target.value as BrakeType, brakes: e.target.selectedOptions[0].text })}><option value="">Unknown</option><option value="rim-caliper">Rim caliper</option><option value="v-brake">V-brake</option><option value="mechanical-disc">Mechanical disc</option><option value="hydraulic-disc">Hydraulic disc</option></select></Field>
            <Field label="Wheel size" htmlFor="g-mws"><select id="g-mws" className="field" value={man.wheelSize} onChange={(e) => setMan({ ...man, wheelSize: e.target.value as WheelSize })}><option value="">Unknown</option>{["700c", "650b", "29", "27.5", "26", "24", "20", "16"].map((w) => <option key={w}>{w}</option>)}</select></Field>
          </>
        )}
        <Field label="Nickname (optional)" htmlFor="g-nick"><input id="g-nick" className="field" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="e.g. Weekend climber" /></Field>
        <Field label="Purchase year" htmlFor="g-py"><input id="g-py" className="field" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Defaults to model year" /></Field>
        <Field label="Purchase price (Rp)" htmlFor="g-pp"><input id="g-pp" className="field" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="Defaults to estimate" /></Field>
      </div>
      <div className="mt-6 flex gap-2"><Button type="submit"><Plus className="h-4 w-4" /> Add to garage</Button><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button></div>
      <p className={cx("mt-4 text-xs text-subtle")}>Unlisted bikes stay private to your garage. Want it in the public catalogue? <Link href="/submit?kind=bike" className="link-u">Submit it for review</Link>.</p>
    </form>
  );
}
