"use client";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Copy, ImageOff, Loader2, Sparkles, X } from "lucide-react";
import { useCatalog } from "@/lib/state";
import { buildConceptPrompt, type Concept, type Scene } from "@/lib/visualizer";
import type { Component, ComponentType } from "@/lib/types";
import { BikePicker, PartPickers, SimulatorPanel, useBikeProfile, usePlanPicks, type Picks } from "@/components/upgrade-config";
import { AIStatusBadge, useAIStatus } from "@/components/AIStatusBadge";
import { Photo } from "@/components/Photo";
import { mediaForCategory } from "@/data/media";
import { Button, Chip, Field, Segmented } from "@/components/ui";
import { toast } from "@/components/ui/toast";

interface Ref { preview: string; base64: string }

async function toJpeg(file: File): Promise<Ref> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const dataUrl = c.toDataURL("image/jpeg", 0.88);
  return { preview: dataUrl, base64: dataUrl.split(",")[1] };
}

const CONCEPTS: Concept[] = ["original", "budget", "balanced", "performance", "custom"];

export function Visualizer() {
  const sp = useSearchParams();
  const cat = useCatalog();
  const status = useAIStatus();
  const [ref, setRef] = useState(sp.get("garage") ? `garage:${sp.get("garage")}` : sp.get("bike") ? `model:${sp.get("bike")}` : "");
  const { profile, model } = useBikeProfile(ref);
  const plans = usePlanPicks(profile);
  const [concept, setConcept] = useState<Concept>("custom");
  const [picks, setPicks] = useState<Picks>({});
  const [frameColor, setFrameColor] = useState("");
  const [scene, setScene] = useState<Scene>("studio-dark");
  const [photo, setPhoto] = useState<Ref | null>(null);
  const [variants, setVariants] = useState(2);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<{ images: Array<{ dataUrl: string }>; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const chooseConcept = (c: Concept) => {
    setConcept(c);
    if (c === "original") setPicks({});
    else if (c !== "custom" && plans) setPicks(plans[c]);
  };

  const parts = useMemo(() => {
    const out: Partial<Record<ComponentType, Component>> = {};
    for (const [slot, id] of Object.entries(picks)) { const c = id ? cat.componentById.get(id) : null; if (c) out[slot as ComponentType] = c; }
    return out;
  }, [picks, cat.componentById]);

  const brief = useMemo(() => (profile ? buildConceptPrompt({ profile, frameMaterial: model?.frameMaterial ?? null, parts, frameColor, scene, concept, hasReferencePhoto: !!photo }) : null), [profile, model, parts, frameColor, scene, concept, photo]);

  const generate = async () => {
    if (!brief) return;
    setLoading(true); setError(null); setOutput(null);
    try {
      const res = await fetch("/api/visualizer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: brief.prompt, negativePrompt: brief.negativePrompt, variants, referenceImage: photo ? { mediaType: "image/jpeg", base64: photo.base64 } : null }) });
      const data = await res.json();
      if (!res.ok) setError(data.message ?? "Generation failed.");
      else setOutput({ images: data.images, label: data.label });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const reference = photo ? null : profile ? mediaForCategory(profile.category, model?.subcategory) : null;

  return (
    <div className="container-x py-10 md:py-14">
      <div className="mb-10"><AIStatusBadge capability="imageGeneration" status={status} /></div>
      <div className="grid gap-12 lg:grid-cols-[440px_1fr] xl:gap-16 [&>*]:min-w-0">
        {/* config */}
        <div className="flex flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
          <BikePicker value={ref} onChange={(v) => { setRef(v); setPicks({}); setOutput(null); }} id="viz-bike" />
          <div>
            <p className="label-tech mb-2">Your bike photo (recommended)</p>
            {photo ? (
              <div className="relative aspect-[4/3] overflow-hidden border hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="Your reference bike" className="h-full w-full object-cover" />
                <button onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-ink-950/80 p-1"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 border border-dashed hairline py-8 text-sm text-muted hover:text-fg"><Camera className="h-4 w-4" /> Upload a side-on photo</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await toJpeg(f)); }} />
            <p className="mt-2 text-xs text-subtle">A side-on photo lets the model keep your exact frame, geometry and proportions. It is sent only to the configured image provider.</p>
          </div>
          <div>
            <p className="label-tech mb-2">Concept</p>
            <div className="flex flex-wrap gap-1.5">{CONCEPTS.map((c) => <Chip key={c} active={concept === c} onClick={() => chooseConcept(c)}>{c[0].toUpperCase() + c.slice(1)}</Chip>)}</div>
            <p className="mt-2 text-xs text-subtle">Budget / Balanced / Performance load the matching Upgrade Advisor plan for this bike.</p>
          </div>
          <PartPickers profile={profile} picks={picks} onChange={(p) => { setPicks(p); setConcept("custom"); }} />
          <Field label="Frame colour concept (optional)" htmlFor="viz-color"><input id="viz-color" className="field" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} placeholder="e.g. satin forest green with gloss black logos-free finish" /></Field>
          <div>
            <p className="label-tech mb-2">Scene</p>
            <Segmented value={scene} onChange={setScene} options={[{ value: "studio-dark", label: "Studio" }, { value: "road", label: "Road" }, { value: "gravel", label: "Gravel" }, { value: "urban", label: "Urban" }]} />
          </div>
          <Field label="Variants" htmlFor="viz-n"><select id="viz-n" className="field" value={variants} onChange={(e) => setVariants(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Button size="lg" className="rounded-full" disabled={!profile || loading} onClick={generate}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate concept</Button>
        </div>

        {/* output */}
        <div className="flex flex-col gap-10">
          {!profile ? (
            <p className="border border-dashed hairline p-10 text-sm text-muted">Choose a bike from My Garage or the catalogue to begin.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.preview} alt="Original" className="h-full w-full object-cover" />
                    ) : reference && <Photo asset={reference} sizes="(min-width: 768px) 30vw, 100vw" className="absolute inset-0 h-full w-full" label="representative" />}
                  </div>
                  <figcaption className="label-tech mt-2">Original {photo ? "· your photo" : "· representative category photo"}</figcaption>
                </figure>
                <figure>
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border border-dashed hairline bg-ink-900">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted" /> : output?.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={output.images[0].dataUrl} alt="AI concept visualisation" className="h-full w-full object-cover" />
                    ) : (
                      <div className="max-w-xs p-6 text-center text-sm text-muted">
                        <ImageOff className="mx-auto mb-3 h-6 w-6 text-subtle" />
                        {error ?? "Your concept will appear here."}
                      </div>
                    )}
                    {output && <span className="absolute left-2 top-2 rounded-full bg-ink-950/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-lime">AI concept</span>}
                  </div>
                  <figcaption className="label-tech mt-2">{output?.label ?? "AI concept visualisation — not an engineering representation"}</figcaption>
                </figure>
              </div>
              {output && output.images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {output.images.slice(1).map((im, i) => <img key={i} src={im.dataUrl} alt={`AI concept variant ${i + 2}`} className="aspect-[4/3] w-full object-cover" />)}
                </div>
              )}
              {error && !status?.imageGeneration.connected && (
                <p className="text-sm text-muted">No image was generated: this server has no image-generation provider configured (<code className="font-mono text-xs">VELOX_IMAGE_API_URL</code>). VELOX does not substitute an illustration — the brief below is exactly what would be sent.</p>
              )}

              {brief && (
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">Concept brief</h2>
                    <button onClick={() => { navigator.clipboard?.writeText(brief.prompt); toast("Brief copied"); }} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"><Copy className="h-3.5 w-3.5" /> Copy</button>
                  </div>
                  {brief.changes.length > 0 ? <ul className="mt-3 space-y-1 text-sm text-fg/85">{brief.changes.map((c) => <li key={c}>+ {c}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Original configuration — no part changes.</p>}
                  <p className="mt-4 border-l border-lime/40 pl-4 text-xs leading-relaxed text-muted">{brief.prompt}</p>
                </section>
              )}

              <section>
                <h2 className="mb-4 text-lg font-medium">Technical impact</h2>
                <SimulatorPanel profile={profile} picks={picks} bikeWeightKg={model?.weightKg ?? null} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
