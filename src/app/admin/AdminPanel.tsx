"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Check, Download, Lock, Pencil, Plus, RotateCcw, Upload, X } from "lucide-react";
import { canAdmin, catalogWrite, sessionStore, submissionsStore, useCatalog } from "@/lib/state";
import { useHydrated, useStore } from "@/lib/store";
import { importMany, normalizeBrand, normalizeComponent, normalizeModel } from "@/lib/importers";
import { download, parseCsv, toCsv } from "@/lib/csv";
import type { BikeModel, Brand, CategoryId, Component, PriceType, VerificationStatus } from "@/lib/types";
import { Button, ButtonLink, EmptyState, Field, PageHeader, Segmented, Skeleton, StatusBadge } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cx, formatIdrShort, NA, PRICE_TYPE_LABEL, STATUS_LABEL, titleCase } from "@/lib/format";

type Tab = "overview" | "brands" | "models" | "components" | "categories" | "submissions" | "data";
type Entity = "brands" | "models" | "components";
const STATUSES = Object.keys(STATUS_LABEL) as VerificationStatus[];
const PRICE_TYPES = Object.keys(PRICE_TYPE_LABEL) as PriceType[];

const guard = (fn: () => void, ok?: string) => {
  try { fn(); if (ok) toast(ok); } catch (e) { toast((e as Error).message, { tone: "error" }); }
};
const touch = <T extends { provenance: Brand["provenance"] }>(r: T, status?: VerificationStatus): T => ({ ...r, provenance: { ...r.provenance, status: status ?? r.provenance.status, updatedAt: new Date().toISOString(), demo: status === "verified" ? false : r.provenance.demo } });

export function AdminPanel() {
  const session = useStore(sessionStore);
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("overview");

  if (!hydrated) return <div className="container-x py-16"><Skeleton className="h-96" /></div>;
  if (!canAdmin(session)) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Restricted area." />
        <div className="container-x py-12">
          <EmptyState icon={<Lock className="h-7 w-7" strokeWidth={1.25} />} title="Administrator role required" action={<ButtonLink href="/account">Sign in as administrator (demo)</ButtonLink>}>
            Catalogue data can only be modified by administrators. Riders can <Link href="/submit" className="text-lime link-u">submit data for review</Link> instead.
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Admin Panel" title={<>Catalogue<br /><span className="text-muted">operations.</span></>}>
        Manage brands, models, components, categories, prices, verification and imports. In demo mode changes are stored as a local overlay on top of the seed catalogue; with Supabase configured the same operations map to the tables in <code className="font-mono text-sm">supabase/schema.sql</code>.
      </PageHeader>
      <div className="container-x py-10">
        <div className="-mx-4 overflow-x-auto px-4">
          <Segmented value={tab} onChange={setTab} options={[{ value: "overview", label: "Overview" }, { value: "brands", label: "Brands" }, { value: "models", label: "Bike models" }, { value: "components", label: "Components" }, { value: "categories", label: "Categories" }, { value: "submissions", label: "Submissions" }, { value: "data", label: "Import / Export" }]} />
        </div>
        <div className="mt-10">
          {tab === "overview" && <Overview go={setTab} />}
          {tab === "brands" && <EntityTable entity="brands" />}
          {tab === "models" && <EntityTable entity="models" />}
          {tab === "components" && <EntityTable entity="components" />}
          {tab === "categories" && <Categories />}
          {tab === "submissions" && <Submissions />}
          {tab === "data" && <DataTools />}
        </div>
      </div>
    </>
  );
}

/* -------------------------------- overview -------------------------------- */

function Overview({ go }: { go: (t: Tab) => void }) {
  const cat = useCatalog();
  const subs = useStore(submissionsStore);
  const sets: Array<[string, Array<{ provenance: Brand["provenance"] }>, Tab]> = [["Brands", cat.all.brands, "brands"], ["Bike models", cat.all.bikes, "models"], ["Components", cat.all.components, "components"]];
  const missingBike = cat.bikes.filter((b) => [b.groupset, b.frameMaterial, b.weightKg, b.wheelset, b.tires].some((v) => v == null)).length;
  const missingComp = cat.components.filter((c) => c.weightG == null || c.price == null).length;
  const pending = subs.filter((s) => s.state === "pending").length;
  return (
    <div className="grid gap-12">
      <div className="grid gap-px bg-line md:grid-cols-3">
        {sets.map(([label, list, t]) => (
          <button key={label} onClick={() => go(t)} className="bg-ink-950 p-6 text-left hover:bg-ink-900">
            <p className="label-tech">{label}</p>
            <p className="tabular mt-2 text-4xl font-medium tracking-tight">{list.length}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {STATUSES.map((s) => { const n = list.filter((x) => x.provenance.status === s).length; return n ? <span key={s}>{STATUS_LABEL[s]} <span className="tabular text-fg">{n}</span></span> : null; })}
            </div>
          </button>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="border hairline p-6"><p className="label-tech">Pending submissions</p><p className="tabular mt-2 text-3xl">{pending}</p><Button size="sm" variant="secondary" className="mt-4" onClick={() => go("submissions")}>Review</Button></div>
        <div className="border hairline p-6"><p className="label-tech">Bike models with missing fields</p><p className="tabular mt-2 text-3xl">{missingBike}</p><p className="mt-2 text-xs text-muted">Groupset, material, weight, wheelset or tyres not available.</p></div>
        <div className="border hairline p-6"><p className="label-tech">Components missing weight/price</p><p className="tabular mt-2 text-3xl">{missingComp}</p><p className="mt-2 text-xs text-muted">Shown as “{NA}” to users.</p></div>
      </div>
    </div>
  );
}

/* ------------------------------ entity tables ------------------------------ */

function EntityTable({ entity }: { entity: Entity }) {
  const cat = useCatalog();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<VerificationStatus | "all">("all");
  const [editing, setEditing] = useState<Brand | BikeModel | Component | "new" | null>(null);
  const rows = (entity === "brands" ? cat.all.brands : entity === "models" ? cat.all.bikes : cat.all.components) as Array<Brand | BikeModel | Component>;
  const label = (r: Brand | BikeModel | Component) => ("country" in r ? r.name : "brandId" in r ? `${cat.brandById.get(r.brandId)?.name ?? r.brandId} ${r.name} (${r.year})` : `${r.manufacturer} ${r.name}`);
  const filtered = rows.filter((r) => (status === "all" || r.provenance.status === status) && label(r).toLowerCase().includes(q.toLowerCase()));

  const setRecordStatus = (r: Brand | BikeModel | Component, s: VerificationStatus) => guard(() => {
    if (entity === "brands") catalogWrite.upsertBrand(touch(r as Brand, s));
    else if (entity === "models") catalogWrite.upsertModel(touch(r as BikeModel, s));
    else catalogWrite.upsertComponent(touch(r as Component, s));
  }, `${label(r)} → ${STATUS_LABEL[s]}`);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${entity}…`} className="field max-w-xs" aria-label={`Search ${entity}`} />
        <select value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus)} className="field w-auto" aria-label="Status"><option value="all">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <span className="text-sm text-muted">{filtered.length} records</span>
        <Button className="ml-auto" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add {entity === "models" ? "bike model" : entity.slice(0, -1)}</Button>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b hairline text-left"><th className="py-2 font-normal label-tech">Record</th><th className="py-2 font-normal label-tech">Price</th><th className="py-2 font-normal label-tech">Status</th><th className="py-2 font-normal label-tech">Updated</th><th className="py-2 text-right font-normal label-tech">Actions</th></tr></thead>
          <tbody>
            {filtered.slice(0, 150).map((r) => (
              <tr key={r.id} className="border-b hairline">
                <td className="py-2.5"><span className="block">{label(r)}</span><span className="font-mono text-[11px] text-subtle">{r.id}</span></td>
                <td className="py-2.5 tabular text-muted">{"price" in r && r.price ? `${formatIdrShort(r.price.amount)} · ${PRICE_TYPE_LABEL[r.price.type]}` : "—"}</td>
                <td className="py-2.5">
                  <select value={r.provenance.status} onChange={(e) => setRecordStatus(r, e.target.value as VerificationStatus)} className="rounded-sm border hairline bg-transparent px-1.5 py-1 text-xs" aria-label={`Status of ${label(r)}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="py-2.5 font-mono text-xs text-muted">{r.provenance.updatedAt.slice(0, 10)}</td>
                <td className="py-2.5 text-right">
                  <button onClick={() => setEditing(r)} className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-fg" aria-label={`Edit ${label(r)}`}><Pencil className="h-3.5 w-3.5" /></button>
                  {r.provenance.status !== "archived" ? (
                    <button onClick={() => setRecordStatus(r, "archived")} className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-warn" aria-label={`Archive ${label(r)}`}><Archive className="h-3.5 w-3.5" /></button>
                  ) : (
                    <button onClick={() => setRecordStatus(r, "unverified")} className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-lime" aria-label={`Restore ${label(r)}`}><RotateCcw className="h-3.5 w-3.5" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 150 && <p className="mt-3 text-xs text-muted">Showing first 150 — refine the search.</p>}
      </div>
      {editing && <Editor entity={entity} record={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---------------------------------- editor --------------------------------- */

type FieldDef = { key: string; label: string; kind?: "text" | "number" | "select" | "list" | "json" | "textarea"; options?: string[]; span?: boolean };

const BRAND_FIELDS: FieldDef[] = [
  { key: "name", label: "Name" }, { key: "country", label: "Country" }, { key: "region", label: "Region", kind: "select", options: ["Indonesia", "International"] }, { key: "founded", label: "Founded", kind: "number" },
  { key: "website", label: "Official website" }, { key: "categories", label: "Categories (comma-separated)", kind: "list" }, { key: "description", label: "Description", kind: "textarea", span: true }, { key: "history", label: "Brand history (verified only)", kind: "textarea", span: true },
];
const MODEL_FIELDS: FieldDef[] = [
  { key: "brandId", label: "Brand id" }, { key: "name", label: "Model name" }, { key: "family", label: "Family" }, { key: "year", label: "Model year", kind: "number" }, { key: "generation", label: "Generation" },
  { key: "category", label: "Category", kind: "select", options: ["road", "mtb", "gravel", "urban", "electric", "folding", "bmx", "other"] }, { key: "subcategory", label: "Subcategory id" },
  { key: "frameMaterial", label: "Frame material" }, { key: "groupset", label: "Groupset" }, { key: "drivetrain", label: "Drivetrain" }, { key: "brakes", label: "Brakes" },
  { key: "brakeType", label: "Brake type", kind: "select", options: ["", "hydraulic-disc", "mechanical-disc", "rim-caliper", "v-brake", "coaster", "none"] }, { key: "wheelset", label: "Wheelset" }, { key: "tires", label: "Tyres" },
  { key: "wheelSize", label: "Wheel size", kind: "select", options: ["", "700c", "650b", "29", "27.5", "26", "24", "20", "16", "451", "12"] }, { key: "tireClearanceMm", label: "Tyre clearance (mm)", kind: "number" },
  { key: "suspension", label: "Suspension", kind: "select", options: ["rigid", "front", "full"] }, { key: "travel", label: "Travel" }, { key: "weightKg", label: "Weight (kg)", kind: "number" },
  { key: "sizes", label: "Sizes (comma-separated)", kind: "list" }, { key: "usage", label: "Usage (comma-separated)", kind: "list" }, { key: "experience", label: "Experience (comma-separated)", kind: "list" },
  { key: "ridingStyle", label: "Riding style", span: true }, { key: "highlights", label: "Advantages (comma-separated)", kind: "list", span: true }, { key: "drawbacks", label: "Disadvantages (comma-separated)", kind: "list", span: true },
  { key: "officialUrl", label: "Official product URL", span: true }, { key: "compat", label: "Compatibility attributes (JSON)", kind: "json", span: true },
];
const COMPONENT_FIELDS: FieldDef[] = [
  { key: "manufacturer", label: "Manufacturer" }, { key: "name", label: "Product name" },
  { key: "type", label: "Type", kind: "select", options: ["frame", "fork", "groupset", "shifters", "front-derailleur", "rear-derailleur", "crankset", "cassette", "chain", "brakes", "wheelset", "tires", "handlebar", "stem", "saddle", "seatpost", "pedals", "accessory"] },
  { key: "tier", label: "Tier", kind: "select", options: ["entry", "mid", "performance", "pro"] }, { key: "discipline", label: "Disciplines (comma-separated)", kind: "list" }, { key: "series", label: "Series" },
  { key: "weightG", label: "Weight (g)", kind: "number" }, { key: "material", label: "Material" }, { key: "officialUrl", label: "Official product URL", span: true },
  { key: "benefits", label: "Benefits (comma-separated)", kind: "list", span: true }, { key: "specs", label: "Specifications (JSON)", kind: "json", span: true }, { key: "compat", label: "Compatibility attributes (JSON)", kind: "json", span: true },
];

function Editor({ entity, record, onClose }: { entity: Entity; record: Brand | BikeModel | Component | null; onClose: () => void }) {
  const fields = entity === "brands" ? BRAND_FIELDS : entity === "models" ? MODEL_FIELDS : COMPONENT_FIELDS;
  const rec = record as unknown as Record<string, unknown> | null;
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => {
    const v = rec?.[f.key];
    return [f.key, v == null ? "" : f.kind === "json" ? JSON.stringify(v, null, 2) : Array.isArray(v) ? v.join(", ") : String(v)];
  })));
  const price = (rec?.price as Component["price"]) ?? null;
  const [priceAmount, setPriceAmount] = useState(price ? String(price.amount) : "");
  const [priceType, setPriceType] = useState<PriceType>(price?.type ?? "estimated");
  const [priceSource, setPriceSource] = useState(price?.source ?? "");
  const [status, setStatus] = useState<VerificationStatus>(record?.provenance.status ?? "unverified");
  const [source, setSource] = useState(record?.provenance.sources[0]?.url ?? record?.provenance.sources[0]?.label ?? "");
  const [image, setImage] = useState<string | null>(("imageUrl" in (record ?? {}) ? (record as Component).imageUrl : null) ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast("Choose an image file", { tone: "error" });
    if (f.size > 400_000) return toast("Image too large for demo storage (max 400 KB)", { tone: "error" });
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(f);
  };

  const save = () => {
    try {
      const raw: Record<string, unknown> = { ...(rec ?? {}) };
      for (const f of fields) {
        const v = form[f.key]?.trim() ?? "";
        if (f.kind === "json") raw[f.key] = v ? JSON.parse(v) : {};
        else if (f.kind === "list") raw[f.key] = v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
        else if (f.kind === "number") raw[f.key] = v === "" ? null : Number(v);
        else raw[f.key] = v === "" ? null : v;
      }
      if (entity !== "brands") raw.price = priceAmount ? { amount: Number(priceAmount), currency: "IDR", type: priceType, source: priceSource || null, date: new Date().toISOString().slice(0, 10) } : null;
      raw.status = status;
      raw.source = source;
      if (entity === "brands") {
        const b = normalizeBrand(raw, status);
        catalogWrite.upsertBrand({ ...(record as Brand | null ?? {}), ...b, id: (record as Brand | null)?.id ?? b.id, categories: (raw.categories as CategoryId[]) ?? [], provenance: { ...b.provenance, sources: source ? b.provenance.sources : record?.provenance.sources ?? [] } });
      } else if (entity === "models") {
        const m = normalizeModel(raw, status);
        catalogWrite.upsertModel({ ...m, id: (record as BikeModel | null)?.id ?? m.id, slug: (record as BikeModel | null)?.slug ?? m.slug, frameColor: (record as BikeModel | null)?.frameColor, imageUrl: image, compat: (raw.compat as BikeModel["compat"]) ?? {}, priceHistory: (record as BikeModel | null)?.priceHistory ?? [], provenance: { ...m.provenance, sources: source ? m.provenance.sources : record?.provenance.sources ?? [] } });
      } else {
        const c = normalizeComponent(raw, status);
        catalogWrite.upsertComponent({ ...c, id: (record as Component | null)?.id ?? c.id, kit: (record as Component | null)?.kit ?? null, imageUrl: image, specs: (raw.specs as Component["specs"]) ?? {}, compat: (raw.compat as Component["compat"]) ?? {}, provenance: { ...c.provenance, sources: source ? c.provenance.sources : record?.provenance.sources ?? [] } });
      }
      toast(record ? "Record updated" : "Record created");
      onClose();
    } catch (e) {
      toast("Could not save", { body: (e as Error).message, tone: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-ink-950/70" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Edit record" className="h-full w-full max-w-3xl overflow-y-auto border-l hairline bg-ink-900 p-6 md:p-8" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-medium tracking-tight">{record ? "Edit" : "New"} {entity === "models" ? "bike model" : entity.slice(0, -1)}</h2><button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-muted" /></button></div>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`e-${f.key}`} className={cx((f.span || f.kind === "json" || f.kind === "textarea") && "md:col-span-2")}>
              {f.kind === "select" ? (
                <select id={`e-${f.key}`} className="field" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>
              ) : f.kind === "json" || f.kind === "textarea" ? (
                <textarea id={`e-${f.key}`} rows={f.kind === "json" ? 6 : 3} className={cx("field", f.kind === "json" && "font-mono text-xs")} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input id={`e-${f.key}`} className="field" inputMode={f.kind === "number" ? "decimal" : undefined} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
        {entity !== "brands" && (
          <div className="mt-8 border-t hairline pt-6">
            <h3 className="label-tech mb-3">Price</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Amount (IDR)" htmlFor="e-pa"><input id="e-pa" className="field" inputMode="numeric" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Price type" htmlFor="e-pt"><select id="e-pt" className="field" value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)}>{PRICE_TYPES.map((p) => <option key={p} value={p}>{PRICE_TYPE_LABEL[p]}</option>)}</select></Field>
              <Field label="Price source" htmlFor="e-ps"><input id="e-ps" className="field" value={priceSource} onChange={(e) => setPriceSource(e.target.value)} placeholder="Distributor / retailer / URL" /></Field>
            </div>
            <p className="mt-2 text-xs text-subtle">Only label a price MSRP / distributor when it comes from that source. Otherwise keep “Estimated”.</p>
            <div className="mt-6">
              <h3 className="label-tech mb-3">Product image</h3>
              <div className="flex items-center gap-4">
                {image ? <img src={image} alt="" className="h-20 w-28 border hairline object-contain" /> : <div className="flex h-20 w-28 items-center justify-center border border-dashed hairline text-xs text-subtle">No image</div>}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button>
                {image && <Button variant="ghost" size="sm" onClick={() => setImage(null)}>Remove</Button>}
              </div>
            </div>
          </div>
        )}
        <div className="mt-8 grid gap-4 border-t hairline pt-6 md:grid-cols-2">
          <Field label="Verification status" htmlFor="e-st"><select id="e-st" className="field" value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus)}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Source reference" htmlFor="e-src" hint="Required before marking a record Verified."><input id="e-src" className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://manufacturer.example/product" /></Field>
        </div>
        <div className="mt-8 flex gap-2">
          <Button onClick={() => { if (status === "verified" && !source.trim()) return toast("Add a source reference before verifying", { tone: "error" }); save(); }}><Check className="h-4 w-4" /> Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- categories ------------------------------- */

function Categories() {
  const cat = useCatalog();
  const [target, setTarget] = useState<CategoryId>("road");
  const [name, setName] = useState("");
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
      <div className="grid gap-8 md:grid-cols-2">
        {cat.categories.map((c) => (
          <div key={c.id}>
            <p className="text-lg font-medium">{c.name} <span className="font-mono text-xs text-subtle">{c.id}</span></p>
            <p className="mt-1 text-xs text-muted">{c.subcategories.map((s) => s.name).join(" · ")}</p>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; guard(() => catalogWrite.addSubcategory(target, { id: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: name.trim() }), "Subcategory added"); setName(""); }} className="border hairline p-6">
        <h3 className="text-lg font-medium">Add subcategory</h3>
        <Field label="Parent category" htmlFor="c-p" className="mt-4"><select id="c-p" className="field" value={target} onChange={(e) => setTarget(e.target.value as CategoryId)}>{cat.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Name" htmlFor="c-n" className="mt-3"><input id="c-n" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ultra-endurance" /></Field>
        <Button type="submit" className="mt-4"><Plus className="h-4 w-4" /> Add</Button>
      </form>
    </div>
  );
}

/* ------------------------------- submissions ------------------------------- */

function Submissions() {
  const subs = useStore(submissionsStore);
  const [show, setShow] = useState<"pending" | "all">("pending");
  const list = subs.filter((s) => show === "all" || s.state === "pending");
  const approve = (id: string) => {
    const s = subs.find((x) => x.id === id)!;
    guard(() => {
      const p = s.payload as Record<string, unknown>;
      if (s.kind === "brand") catalogWrite.upsertBrand(normalizeBrand(p, "community"));
      else if (s.kind === "bike") catalogWrite.upsertModel(normalizeModel(p, "community"));
      else if (s.kind === "component") catalogWrite.upsertComponent(normalizeComponent(p, "community"));
      // corrections are applied manually by the admin after review
      submissionsStore.set((l) => l.map((x) => (x.id === id ? { ...x, state: "approved" } : x)));
    }, s.kind === "correction" ? "Correction accepted — apply it in the record editor" : "Published as Community Submitted");
  };
  return (
    <div>
      <Segmented value={show} onChange={setShow} options={[{ value: "pending", label: `Pending (${subs.filter((s) => s.state === "pending").length})` }, { value: "all", label: `All (${subs.length})` }]} />
      {list.length === 0 ? <div className="mt-8"><EmptyState title="Nothing to review">Community submissions from <Link href="/submit" className="text-lime link-u">/submit</Link> appear here.</EmptyState></div> : (
        <ul className="mt-6 border-t hairline">
          {list.map((s) => (
            <li key={s.id} className="grid gap-4 border-b hairline py-5 md:grid-cols-[1fr_auto]">
              <div>
                <p className="label-tech">{titleCase(s.kind)} · by {s.submittedBy} · {new Date(s.submittedAt).toLocaleString("en-GB")} · {s.state}</p>
                <dl className="mt-2 grid grid-cols-[140px_1fr] gap-x-4 gap-y-1 text-sm">
                  {Object.entries(s.payload).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className={v == null ? "italic text-subtle" : ""}>{v == null ? NA : String(v)}</dd></div>)}
                </dl>
                {s.note && <p className="mt-2 text-sm text-muted">Note: {s.note}</p>}
              </div>
              {s.state === "pending" && (
                <div className="flex gap-2 md:flex-col">
                  <Button size="sm" onClick={() => approve(s.id)}><Check className="h-3.5 w-3.5" /> Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => { submissionsStore.set((l) => l.map((x) => (x.id === s.id ? { ...x, state: "rejected" } : x))); toast("Submission rejected", { tone: "info" }); }}><X className="h-3.5 w-3.5" /> Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ import / export ---------------------------- */

const SAMPLE: Record<Entity, string> = {
  brands: "name,country,founded,website,categories,description\nKreuz,Indonesia,,,bmx|folding,Indonesian brand (example row)",
  models: "brand,name,year,category,subcategory,frameMaterial,groupset,brakes,brakeType,wheelSize,priceIdr,priceType,usage,experience\nPolygon,Strattos S3,2025,road,endurance,Aluminium,Shimano Sora,Rim caliper,rim-caliper,700c,10500000,estimated,fitness|commuting,beginner",
  components: "manufacturer,name,type,tier,discipline,weightG,priceIdr,specs,compat\nShimano,CS-HG700 11-34,cassette,mid,road|gravel,,800000,\"{\"\"Range\"\":\"\"11-34\"\"}\",\"{\"\"speeds\"\":11,\"\"freehub\"\":\"\"HG-road\"\",\"\"maxCog\"\":34}\"",
};

function DataTools() {
  const cat = useCatalog();
  const [entity, setEntity] = useState<Entity>("models");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [status, setStatus] = useState<VerificationStatus>("unverified");
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const rows = format === "json" ? (JSON.parse(text) as Record<string, unknown>[]) : parseCsv(text);
      if (!Array.isArray(rows)) return { ok: [], errors: ["JSON must be an array of records"] };
      const fn = entity === "brands" ? (r: Record<string, unknown>) => normalizeBrand(r, status) : entity === "models" ? (r: Record<string, unknown>) => normalizeModel(r, status) : (r: Record<string, unknown>) => normalizeComponent(r, status);
      return importMany(rows, fn as (r: Record<string, unknown>) => Brand | BikeModel | Component);
    } catch (e) {
      return { ok: [], errors: [(e as Error).message] };
    }
  }, [text, format, entity, status]);

  const runImport = () => {
    if (!preview?.ok.length) return;
    guard(() => catalogWrite.bulk({ [entity === "models" ? "models" : entity]: preview.ok } as never), `Imported ${preview.ok.length} ${entity}`);
    setText("");
  };

  const exportData = (kind: "json" | "csv") => {
    const rows = (entity === "brands" ? cat.all.brands : entity === "models" ? cat.all.bikes : cat.all.components) as unknown as Record<string, unknown>[];
    if (kind === "json") download(`velox-${entity}.json`, JSON.stringify(rows, null, 2), "application/json");
    else download(`velox-${entity}.csv`, toCsv(rows.map((r) => ({ ...r, provenance: undefined, status: (r.provenance as Brand["provenance"]).status }))), "text/csv");
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented value={entity} onChange={setEntity} options={[{ value: "brands", label: "Brands" }, { value: "models", label: "Bike models" }, { value: "components", label: "Components" }]} />
          <Segmented value={format} onChange={setFormat} options={[{ value: "csv", label: "CSV" }, { value: "json", label: "JSON" }]} />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="field mt-4 font-mono text-xs" placeholder={format === "csv" ? SAMPLE[entity] : "[ { \"name\": \"…\" } ]"} aria-label="Import data" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setFormat(f.name.endsWith(".json") ? "json" : "csv"); f.text().then(setText); }} />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Load file</Button>
          <Button variant="ghost" size="sm" onClick={() => { setFormat("csv"); setText(SAMPLE[entity]); }}>Insert sample</Button>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">Import as
            <select value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus)} className="field h-8 w-auto py-1 text-xs">{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          </label>
        </div>
        {preview && (
          <div className="mt-5 border hairline p-4 text-sm">
            <p><span className="tabular text-lime">{preview.ok.length}</span> valid records · <span className={cx("tabular", preview.errors.length > 0 && "text-bad")}>{preview.errors.length}</span> errors</p>
            {preview.errors.slice(0, 6).map((e) => <p key={e} className="mt-1 text-xs text-bad">{e}</p>)}
            {preview.ok.slice(0, 5).map((r) => <p key={r.id} className="mt-1 font-mono text-xs text-muted">+ {r.id} <StatusBadge status={r.provenance.status} className="ml-2" /></p>)}
            <Button className="mt-4" size="sm" disabled={!preview.ok.length} onClick={runImport}>Import {preview.ok.length} records</Button>
          </div>
        )}
        <p className="mt-4 text-xs text-subtle">Missing values import as empty and display as “{NA}”. Lists use “|” in CSV. Existing ids are updated, new ids are created.</p>
      </div>
      <div className="space-y-8">
        <div className="border hairline p-6">
          <h3 className="text-lg font-medium">Export {entity}</h3>
          <p className="mt-1 text-sm text-muted">Includes seed data, admin edits and archived records.</p>
          <div className="mt-4 flex gap-2"><Button variant="secondary" size="sm" onClick={() => exportData("json")}><Download className="h-3.5 w-3.5" /> JSON</Button><Button variant="secondary" size="sm" onClick={() => exportData("csv")}><Download className="h-3.5 w-3.5" /> CSV</Button></div>
        </div>
        <div className="border border-bad/30 p-6">
          <h3 className="text-lg font-medium">Reset local overlay</h3>
          <p className="mt-1 text-sm text-muted">Discards every admin edit, import and approved submission in this browser and restores the seed catalogue.</p>
          <Button variant="danger" size="sm" className="mt-4" onClick={() => { if (confirm("Discard all local catalogue changes?")) guard(() => catalogWrite.resetOverlay(), "Catalogue reset to seed data"); }}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>
        </div>
      </div>
    </div>
  );
}
