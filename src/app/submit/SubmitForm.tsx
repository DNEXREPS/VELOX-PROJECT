"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { sessionStore, submissionsStore } from "@/lib/state";
import { useCatalog } from "@/lib/catalog-client";
import { useStore } from "@/lib/store";
import type { Submission } from "@/lib/types";
import { Button, Field, Segmented } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { uid } from "@/lib/format";

type Kind = Submission["kind"];
const FIELDS: Record<Kind, Array<[key: string, label: string, placeholder?: string, required?: boolean]>> = {
  brand: [["name", "Brand name", "e.g. Kreuz", true], ["country", "Country of origin", "Indonesia", true], ["website", "Official website", "https://"], ["categories", "Categories (separate with |)", "folding|urban"], ["description", "Short description"]],
  bike: [["brand", "Brand", "e.g. Polygon", true], ["name", "Model name", "e.g. Strattos S3", true], ["year", "Model year", "2025", true], ["category", "Category id", "road | mtb | gravel | urban | electric | folding | bmx | other", true], ["subcategory", "Subcategory id", "endurance"], ["frameMaterial", "Frame material"], ["groupset", "Groupset"], ["brakes", "Brakes"], ["wheelSize", "Wheel size", "700c"], ["priceIdr", "Price (IDR)"], ["priceType", "Price type", "msrp | distributor | retailer | estimated"]],
  component: [["manufacturer", "Manufacturer", "e.g. Shimano", true], ["name", "Product name", undefined, true], ["type", "Component type", "groupset | wheelset | tires | …", true], ["weightG", "Weight (g)"], ["priceIdr", "Price (IDR)"], ["material", "Material"]],
  correction: [["ref", "Record id or URL", "e.g. polygon-strattos-s4-2024", true], ["field", "Field to correct", "e.g. tireClearanceMm", true], ["value", "Correct value", undefined, true]],
};

export function SubmitForm() {
  const sp = useSearchParams();
  const cat = useCatalog();
  const session = useStore(sessionStore);
  const [kind, setKind] = useState<Kind>((sp.get("kind") as Kind) ?? "bike");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (sp.get("ref")) init.ref = sp.get("ref")!;
    if (sp.get("brand")) init.brand = cat.brandById.get(sp.get("brand")!)?.name ?? "";
    return init;
  });
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = FIELDS[kind].filter(([k, , , req]) => req && !values[k]?.trim()).map(([, l]) => l);
    if (missing.length) return toast("Please complete required fields", { body: missing.join(", "), tone: "error" });
    const payload = Object.fromEntries(FIELDS[kind].map(([k]) => [k, values[k]?.trim() || null]));
    submissionsStore.set((l) => [{ id: uid("sub"), kind, payload: { ...payload, source: source || null }, note, submittedBy: session.signedIn ? session.name : "Anonymous", submittedAt: new Date().toISOString(), state: "pending" }, ...l]);
    setValues({});
    setSource("");
    setNote("");
    toast("Submission received", { body: "An administrator will review it before it appears in the catalogue." });
  };

  return (
    <div className="container-x grid gap-14 py-12 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
      <form onSubmit={submit} className="max-w-2xl">
        <Segmented value={kind} onChange={(k) => { setKind(k); setValues({}); }} options={[{ value: "bike", label: "Bicycle" }, { value: "brand", label: "Brand" }, { value: "component", label: "Component" }, { value: "correction", label: "Correction" }]} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FIELDS[kind].map(([k, label, ph, req]) => (
            <Field key={k} label={`${label}${req ? " *" : ""}`} htmlFor={`s-${k}`}>
              <input id={`s-${k}`} className="field" value={values[k] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} placeholder={ph} required={req} />
            </Field>
          ))}
          <Field label="Source (official page, catalogue, dealer)" htmlFor="s-src" className="sm:col-span-2" hint="Submissions with an official source are verified faster."><input id="s-src" className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://" /></Field>
          <Field label="Notes for the reviewer" htmlFor="s-note" className="sm:col-span-2"><textarea id="s-note" rows={3} className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <Button type="submit" size="lg" className="mt-6"><Send className="h-4 w-4" /> Submit for review</Button>
        {!session.signedIn && <p className="mt-3 text-xs text-subtle">Submitting anonymously. <Link href="/account" className="link-u">Sign in</Link> to track your submissions.</p>}
      </form>
      <aside className="text-sm text-muted">
        <h2 className="mb-4 text-lg font-medium text-fg">How verification works</h2>
        <ol className="space-y-4">
          {[["Community Submitted", "Your entry is reviewed and, if accepted, published with this label."], ["Verified", "An administrator confirms it against an official manufacturer or distributor source."], ["Discontinued / Archived", "Models no longer sold stay discoverable as historical records."]].map(([t, d], i) => (
            <li key={t} className="flex gap-4 border-t hairline pt-4"><span className="font-mono text-xs text-lime">{String(i + 1).padStart(2, "0")}</span><span><span className="block text-fg">{t}</span>{d}</span></li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-subtle">Regular users cannot edit verified manufacturer data directly — every change goes through review.</p>
      </aside>
    </div>
  );
}
