"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import HEALTH from "@/data/image-health.json";
import { imageForBike, photoSources, PRODUCT_IMAGES } from "@/data/product-images";
import { catalogWrite, imageReviewStore } from "@/lib/state";
import { useCatalog } from "@/lib/catalog-client";
import { useStore } from "@/lib/store";
import { Button, Field, Segmented } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cx } from "@/lib/format";

type View = "missing" | "issues" | "verified" | "decisions";
interface Probe { url: string; status: number | null; ok: boolean | null; note?: string; checkedAt: string }
interface HealthImage { id: string; subjectKind: string; subjectId: string; status: string; issues: string[]; source: Probe | null; original: Probe | null; gallery: number }
interface Health {
  generatedAt: string;
  summary: { brokenReferences: number; wheelsetsWithImages: number; galleryImages: number; sourcesUnreachable: number; lowResolution: number };
  images: HealthImage[];
  missing: Array<{ subjectId: string; brandId: string; name: string; officialUrl: string | null; reason: string }>;
}
interface Retry { at: string; ok: boolean; detail: string }

/** Loads an image in the browser and reports whether it decodes, with its HTTP status when same-origin. */
async function checkInBrowser(src: string): Promise<{ ok: boolean; detail: string }> {
  let status: number | null = null;
  try { const r = await fetch(src, { method: "HEAD", cache: "no-store" }); status = r.status; } catch { /* cross-origin: rely on decode */ }
  const decoded = await new Promise<{ w: number; h: number } | null>((res) => { const im = new window.Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res(null); im.src = src + (src.includes("?") ? "&" : "?") + "check=" + Date.now(); });
  if (status != null && status >= 400) return { ok: false, detail: `HTTP ${status}` };
  if (!decoded) return { ok: false, detail: status ? `HTTP ${status}, not a decodable image` : "not reachable or not an image (possibly hotlink-protected or CORS)" };
  if (Math.min(decoded.w, decoded.h) < 300) return { ok: false, detail: `too small (${decoded.w}×${decoded.h})` };
  return { ok: true, detail: `${status ? `HTTP ${status} · ` : ""}${decoded.w}×${decoded.h}` };
}

export function ImagesAdmin() {
  const cat = useCatalog();
  const reviews = useStore(imageReviewStore);
  const [view, setView] = useState<View>("missing");
  const [q, setQ] = useState("");
  const [retries, setRetries] = useState<Record<string, Retry>>({});
  const [replace, setReplace] = useState<{ bikeId: string; url: string } | null>(null);
  const health = HEALTH as unknown as Health;
  const byImg = useMemo(() => new Map(health.images.map((h: HealthImage) => [h.id, h])), [health]);

  const coverage = useMemo(() => {
    let verified = 0, unverified = 0, missing = 0, rejected = 0;
    for (const b of cat.bikes) {
      const img = imageForBike(b.id);
      if (img && reviews[img.id] === "rejected") rejected++;
      if (img && reviews[img.id] !== "rejected") verified++;
      else if (b.imageUrl) unverified++;
      else missing++;
    }
    return { verified, unverified, missing, rejected, total: cat.bikes.length };
  }, [cat.bikes, reviews]);

  const retry = async (key: string, src: string) => {
    const r = await checkInBrowser(src);
    setRetries((x) => ({ ...x, [key]: { at: new Date().toLocaleTimeString(), ...r } }));
    toast(r.ok ? "Image loads" : "Image failed", { body: r.detail, tone: r.ok ? "success" : "error" });
  };

  const decide = (imageId: string, d: "verified" | "rejected" | null) => {
    try { catalogWrite.reviewImage(imageId, d); toast(d === "rejected" ? "Association withdrawn — the product now shows the missing-image state" : d ? "Association confirmed" : "Decision cleared"); }
    catch (e) { toast("Not allowed", { body: (e as Error).message, tone: "error" }); }
  };

  const saveReplacement = async () => {
    if (!replace) return;
    const bike = cat.bikeById.get(replace.bikeId); if (!bike) return;
    if (!/^https:\/\//.test(replace.url)) { toast("Use an https:// image URL", { tone: "error" }); return; }
    const r = await checkInBrowser(replace.url);
    if (!r.ok) { toast("Image source rejected", { body: r.detail, tone: "error" }); return; }
    try {
      catalogWrite.upsertModel({ ...bike, imageUrl: replace.url, provenance: { ...bike.provenance, reviewerNotes: `${bike.provenance.reviewerNotes ?? ""} Image source set by admin ${new Date().toISOString().slice(0, 10)} (${r.detail}); pending licence and model verification.`.trim() } });
      toast("Image source saved as unverified", { body: "Shown with an “Admin image · not yet verified” label until reviewed." }); setReplace(null);
    } catch (e) { toast("Not allowed", { body: (e as Error).message, tone: "error" }); }
  };

  const ql = q.toLowerCase();
  const name = (id: string) => { const b = cat.bikeById.get(id); return b ? `${cat.brandById.get(b.brandId)?.name ?? b.brandId} ${b.name}` : cat.componentById.get(id)?.name ?? id; };
  const missing = health.missing.filter((m) => cat.bikeById.has(m.subjectId) && !cat.bikeById.get(m.subjectId)!.imageUrl).filter((m) => !ql || name(m.subjectId).toLowerCase().includes(ql) || m.reason.toLowerCase().includes(ql));
  const reasons = Object.entries(missing.reduce<Record<string, number>>((a, m) => ((a[m.reason] = (a[m.reason] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const issues = health.images.filter((h) => h.issues.length || h.status !== "verified");
  const verifiedList = PRODUCT_IMAGES.filter((i) => !ql || name(i.subjectId).toLowerCase().includes(ql)).slice(0, 120);

  return (
    <div>
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-5">
        {[["Bicycle models", coverage.total], ["Verified images", coverage.verified], ["Unverified (admin)", coverage.unverified], ["Missing", coverage.missing], ["Broken references", health.summary.brokenReferences]].map(([l, v]) => (
          <div key={l} className="bg-ink-950 p-5"><p className="tabular text-3xl font-medium tracking-tight">{v}</p><p className="label-tech mt-1">{l}</p></div>
        ))}
      </div>
      <p className="mt-3 text-xs text-subtle">
        Placeholders are never counted as images. Health report generated {new Date(health.generatedAt).toLocaleString("en-GB")} by <code className="font-mono">npm run images:health</code> ·
        wheelsets with images {health.summary.wheelsetsWithImages} · gallery photos {health.summary.galleryImages} · sources unreachable {health.summary.sourcesUnreachable} · low resolution {health.summary.lowResolution}
        {coverage.rejected ? ` · ${coverage.rejected} withdrawn by review` : ""}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Segmented value={view} onChange={setView} options={[
          { value: "missing", label: `Missing (${missing.length})` }, { value: "issues", label: `Failed / issues (${issues.length})` },
          { value: "verified", label: "Review associations" }, { value: "decisions", label: `Decisions (${Object.keys(reviews).length})` },
        ]} />
        <input className="field h-9 max-w-64 py-1.5" placeholder="Filter by product or reason…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter images" />
      </div>

      {view === "missing" && (
        <div className="mt-6">
          <h3 className="label-tech mb-2">Why images are missing</h3>
          <ul className="mb-6 space-y-1 text-sm">{reasons.map(([r, n]) => <li key={r}><span className="tabular text-fg">{n}</span> <span className="text-muted">— {r}</span></li>)}</ul>
          <ul className="border-t hairline">
            {missing.slice(0, 200).map((m) => (
              <li key={m.subjectId} className="flex flex-wrap items-center gap-3 border-b hairline py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{name(m.subjectId)}<span className="block truncate text-xs text-subtle">{m.reason}</span></span>
                {m.officialUrl && <a href={m.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">Official page <ExternalLink className="h-3 w-3" /></a>}
                <Button size="sm" variant="secondary" onClick={() => setReplace({ bikeId: m.subjectId, url: "" })}>Set image source</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === "issues" && (
        <ul className="mt-6 border-t hairline">
          {issues.length === 0 && <li className="py-6 text-sm text-muted">No failed images and no open issues in the latest health report.</li>}
          {issues.map((h) => (
            <li key={h.id} className="border-b hairline py-3 text-sm">
              <span className="font-medium">{name(h.subjectId)}</span> <span className="label-tech ml-2">{h.status}</span>
              <ul className="mt-1 text-xs text-warn">{h.issues.map((x) => <li key={x}>· {x}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}

      {view === "verified" && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {verifiedList.map((img) => {
            const h = byImg.get(img.id) as HealthImage | undefined; const src = photoSources(img)[0].src; const rt = retries[img.id]; const d = reviews[img.id];
            return (
              <li key={img.id} className="border hairline p-3">
                <div className="relative aspect-[4/3] bg-ink-900"><Image src={src} alt={img.alt} fill sizes="320px" className="object-contain p-2" /></div>
                <p className="mt-2 truncate text-sm font-medium">{name(img.subjectId)}</p>
                <p className="text-[11px] text-subtle">{img.license} · {img.author ?? "—"} · {img.image_model_match} match · {img.width}×{img.height}</p>
                <a href={img.image_source_url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-muted hover:text-fg">{img.image_source_url}</a>
                <p className="mt-1 text-[11px] text-muted">Last verified {img.last_image_verified_at}{h?.source ? ` · source ${h.source.status ?? h.source.note ?? "?"}` : ""}{rt ? ` · retry ${rt.at}: ${rt.detail}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => retry(img.id, src)}><RefreshCw className="h-3.5 w-3.5" /> Retry validation</Button>
                  <Button size="sm" variant={d === "verified" ? "primary" : "secondary"} onClick={() => decide(img.id, d === "verified" ? null : "verified")}><CheckCircle2 className="h-3.5 w-3.5" /> Correct product</Button>
                  <Button size="sm" variant={d === "rejected" ? "primary" : "secondary"} onClick={() => decide(img.id, d === "rejected" ? null : "rejected")}><XCircle className="h-3.5 w-3.5" /> Wrong product</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {view === "decisions" && (
        <ul className="mt-6 border-t hairline">
          {Object.entries(reviews).length === 0 && <li className="py-6 text-sm text-muted">No review decisions yet.</li>}
          {Object.entries(reviews).map(([id, d]) => (
            <li key={id} className="flex items-center gap-3 border-b hairline py-3 text-sm">
              <span className="flex-1">{name(PRODUCT_IMAGES.find((i) => i.id === id)?.subjectId ?? id)}</span>
              <span className={cx("label-tech", d === "rejected" ? "text-bad" : "text-lime")}>{d}</span>
              <Button size="sm" variant="ghost" onClick={() => decide(id, null)}>Undo</Button>
            </li>
          ))}
        </ul>
      )}

      {replace && (
        <div role="dialog" aria-modal="true" aria-label="Set image source" className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4">
          <div className="w-full max-w-lg border hairline bg-ink-900 p-6">
            <h3 className="text-lg font-medium">Set image source — {name(replace.bikeId)}</h3>
            <p className="mt-2 text-xs text-muted">Use an image you are licensed to display (manufacturer press kit, distributor feed or your own photo). It is checked in the browser, saved as <em>unverified</em> and labelled until reviewed.</p>
            <Field label="Image URL (https)" htmlFor="img-src"><input id="img-src" className="field" value={replace.url} onChange={(e) => setReplace({ ...replace, url: e.target.value })} placeholder="https://…" /></Field>
            <div className="mt-4 flex gap-2"><Button onClick={saveReplacement}>Check & save</Button><Button variant="ghost" onClick={() => setReplace(null)}>Cancel</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
