"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertOctagon, Camera, CheckCircle2, CircleHelp, Loader2, Mic, MicOff, ScanLine, Sparkles, Stethoscope, TriangleAlert, Wrench, X } from "lucide-react";
import { buildsStore, garageStore, mechanicHistoryStore } from "@/lib/state";
import { useCatalog } from "@/lib/catalog-client";
import { useHydrated, useStore } from "@/lib/store";
import { diagnose, suggestReplacements, type Diagnosis } from "@/lib/mechanic/engine";
import { SYSTEM_LABEL, type System } from "@/lib/mechanic/knowledge";
import { BB_STANDARDS, matchBearings, parseShis } from "@/lib/mechanic/standards";
import { profileFromModel, virtualSelection, type BikeProfile } from "@/lib/upgrade";
import { profileFromGarage } from "@/lib/profiles";
import { checkCandidate } from "@/lib/compat";
import type { MechanicAIResult, AIStatus } from "@/lib/ai/types";
import { AIStatusBadge, useAIStatus } from "@/components/AIStatusBadge";
import { Button, Chip, CompatBadge, Field, Segmented, StatusBadge } from "@/components/ui";
import { ComponentGlyph } from "@/components/Glyphs";
import { cx, titleCase, uid } from "@/lib/format";
import type { Build, GarageBike } from "@/lib/types";

interface Img { name: string; mediaType: "image/jpeg"; base64: string; preview: string }

/** Downscale images client-side (≤1568 px JPEG) before sending to the server. */
async function toImage(file: File): Promise<Img> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const scale = Math.min(1, 1568 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  URL.revokeObjectURL(url);
  return { name: file.name, mediaType: "image/jpeg", base64: dataUrl.split(",")[1], preview: dataUrl };
}

type SpeechRec = { start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; lang: string; interimResults: boolean; continuous: boolean };

export function Mechanic() {
  const sp = useSearchParams();
  const cat = useCatalog();
  const garage = useStore(garageStore);
  const builds = useStore(buildsStore);
  const status = useAIStatus();
  const [tab, setTab] = useState<"diagnose" | "bearing">(sp.get("tab") === "bearing" ? "bearing" : "diagnose");

  return (
    <div className="container-x py-10 md:py-14">
      <div className="mb-10 flex flex-wrap items-center gap-4">
        <Segmented value={tab} onChange={setTab} options={[{ value: "diagnose", label: <span className="flex items-center gap-2"><Stethoscope className="h-3.5 w-3.5" />Diagnose a problem</span> }, { value: "bearing", label: <span className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5" />Bearing identification</span> }]} />
        <AIStatusBadge capability="language" status={status} />
      </div>
      {tab === "diagnose" ? <Diagnose cat={cat} garage={garage} builds={builds} status={status} initial={sp.get("q") ?? ""} /> : <BearingId cat={cat} />}
    </div>
  );
}

/* ================================ diagnose ================================ */

function Diagnose({ cat, garage, builds, status, initial }: { cat: ReturnType<typeof useCatalog>; garage: GarageBike[]; builds: Build[]; status: AIStatus | null; initial: string }) {
  const [text, setText] = useState(initial);
  const [bikeRef, setBikeRef] = useState("");
  const [systems, setSystems] = useState<System[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Img[]>([]);
  const [result, setResult] = useState<{ local: Diagnosis; ai: MechanicAIResult | null; aiError: string | null; aiProvider?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated();
  const speechSupported = hydrated && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const profile: BikeProfile | null = useMemo(() => {
    if (bikeRef.startsWith("garage:")) {
      const g = garage.find((x) => x.id === bikeRef.slice(7));
      return g ? profileFromGarage(g, cat, builds) : null;
    }
    if (bikeRef.startsWith("model:")) {
      const m = cat.bikeById.get(bikeRef.slice(6));
      return m ? profileFromModel(m, cat.brandById.get(m.brandId)?.name ?? "") : null;
    }
    return null;
  }, [bikeRef, garage, cat, builds]);

  /** AI Mechanic history: kept on this device for everyone; synced to the account when signed in. */
  const remember = (d: Diagnosis) => {
    if (!text.trim()) return;
    mechanicHistoryStore.set((h) => [{ id: uid("diag"), at: new Date().toISOString(), text: text.trim().slice(0, 500), bike: profile?.label ?? null, safety: d.safety.level, topCauses: [...d.likely, ...d.possible].slice(0, 3).map((c) => c.title), systems: d.systems.slice(0, 3).map((x) => x.system) }, ...h.filter((x) => x.text !== text.trim().slice(0, 500))].slice(0, 50));
  };
  const run = async (nextAnswers = answers) => {
    if (!text.trim() && !systems.length) return;
    setLoading(true);
    const bike = profile ? { label: profile.label, compat: profile.compat, groupset: profile.groupset, brakes: profile.current.brakes ?? null } : null;
    try {
      const res = await fetch("/api/mechanic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: text, answers: nextAnswers, systems, bike, images: images.map(({ mediaType, base64 }) => ({ mediaType, base64 })) }) });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setResult({ local: data.local, ai: data.ai, aiError: data.aiError, aiProvider: data.aiProvider });
      remember(data.local);
    } catch {
      // network/server unavailable: run the same engine in the browser
      const local = diagnose({ text, answers: nextAnswers, systems, bike, imageCount: images.length });
      setResult({ local, ai: null, aiError: "Server unavailable — showing the in-browser analysis." });
      remember(local);
    } finally {
      setLoading(false);
    }
  };

  // auto-run when arriving with ?q=
  useEffect(() => { if (initial) void run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (qid: string, a: string) => {
    const next = { ...answers, [qid]: a };
    setAnswers(next);
    void run(next);
  };

  const toggleDictation = () => {
    if (listening) { recRef.current?.stop(); return; }
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${last[0].transcript}`);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = await Promise.all(Array.from(files).slice(0, 6 - images.length).filter((f) => f.type.startsWith("image/")).map(toImage));
    setImages((x) => [...x, ...list].slice(0, 6));
  };

  const base = useMemo(() => (profile ? virtualSelection(profile) : {}), [profile]);
  const replacements = useMemo(() => (result ? suggestReplacements(result.local, cat.components, profile?.category === "mtb" ? "mtb" : profile?.category === "road" ? "road" : null) : []), [result, cat.components, profile]);

  const d = result?.local;

  return (
    <div className="grid gap-12 lg:grid-cols-[420px_1fr] xl:gap-16 [&>*]:min-w-0">
      {/* ------------------------------- input ------------------------------- */}
      <div className="flex flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
        <Field label="Describe the problem" htmlFor="m-text" hint="What you hear or feel, where it seems to come from, and when it happens.">
          <div className="relative">
            <textarea id="m-text" rows={5} className="field pr-11" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Clicking from the bottom bracket every pedal stroke, only when I stand up on climbs" />
            {speechSupported && (
              <button type="button" onClick={toggleDictation} aria-pressed={listening} aria-label={listening ? "Stop dictation" : "Dictate description"} className={cx("absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full", listening ? "bg-bad/20 text-bad" : "text-muted hover:text-fg")}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
        </Field>
        <Field label="Your bike (optional)" htmlFor="m-bike" hint="Lets VELOX use catalogue data and check replacement-part compatibility.">
          <select id="m-bike" className="field" value={bikeRef} onChange={(e) => setBikeRef(e.target.value)}>
            <option value="">Not specified</option>
            {garage.length > 0 && <optgroup label="My Garage">{garage.map((g) => <option key={g.id} value={`garage:${g.id}`}>{g.nickname}</option>)}</optgroup>}
            <optgroup label="Catalogue">{cat.bikes.map((b) => <option key={b.id} value={`model:${b.id}`}>{cat.brandById.get(b.brandId)?.name} {b.name} ({b.year})</option>)}</optgroup>
          </select>
        </Field>
        <Field label="Area of the bike (optional)">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SYSTEM_LABEL) as System[]).map((s) => <Chip key={s} active={systems.includes(s)} onClick={() => setSystems((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>{SYSTEM_LABEL[s]}</Chip>)}
          </div>
        </Field>
        <div>
          <p className="label-tech mb-2">Photos (optional, up to 6)</p>
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden border hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                <button onClick={() => setImages((x) => x.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute right-0.5 top-0.5 rounded-full bg-ink-950/80 p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {images.length < 6 && (
              <button onClick={() => fileRef.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 border border-dashed hairline text-xs text-muted hover:text-fg"><Camera className="h-4 w-4" />Add</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <p className="mt-2 text-xs text-subtle">{status?.vision.connected ? "Photos are analysed by the connected vision model for visible context only." : "Vision provider not connected: photos are attached for your reference but not analysed."} No part is identified from a photo alone.</p>
        </div>
        <Button size="lg" className="rounded-full" onClick={() => run()} disabled={loading || (!text.trim() && !systems.length)}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />} Analyse</Button>
      </div>

      {/* ------------------------------ results ------------------------------ */}
      <div aria-live="polite">
        {!d ? (
          <div className="border border-dashed hairline p-10">
            <Wrench className="h-7 w-7 text-subtle" strokeWidth={1.25} />
            <p className="mt-4 text-lg font-medium">Describe a symptom to begin</p>
            <p className="mt-2 max-w-md text-sm text-muted">Try: “Rear hub grinds when coasting”, “Brake lever feels spongy”, “Headset clunks when I brake”.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {d.safety.level !== "none" && (
              <div className={cx("flex gap-4 border p-5", d.safety.level === "stop" ? "border-bad/40 bg-bad/[0.07]" : "border-warn/40 bg-warn/[0.06]")} role="alert">
                {d.safety.level === "stop" ? <AlertOctagon className="h-6 w-6 shrink-0 text-bad" /> : <TriangleAlert className="h-6 w-6 shrink-0 text-warn" />}
                <div><p className={cx("font-medium", d.safety.level === "stop" ? "text-bad" : "text-warn")}>{d.safety.level === "stop" ? "Stop riding until inspected" : "Safety-related area"}</p><p className="mt-1 text-sm text-fg/80">{d.safety.message}</p></div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {d.systems.slice(0, 6).map((s) => <span key={s.system} className="rounded-full border hairline px-3 py-1 text-xs text-muted">{s.label}</span>)}
              {d.complexity && <span className="rounded-full border border-lime/30 px-3 py-1 text-xs text-lime">Typical repair: {d.complexity}</span>}
            </div>

            {d.followUps.length > 0 && (
              <section className="border hairline bg-ink-900 p-6">
                <h2 className="flex items-center gap-2 text-lg font-medium"><CircleHelp className="h-4 w-4 text-lime" />Checks that would narrow this down</h2>
                <div className="mt-5 space-y-5">
                  {d.followUps.map((q) => (
                    <div key={q.id}>
                      <p className="text-sm">{q.text}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{q.options.map((o) => <Chip key={o} active={answers[q.id] === o} onClick={() => answer(q.id, o)}>{o}</Chip>)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <CauseList title="Likely causes" tone="likely" items={d.likely} empty="No cause stands out yet — answer the checks above." />
            <CauseList title="Possible causes" tone="possible" items={d.possible} empty="None." />

            {d.confirmed.length > 0 && (
              <section>
                <h2 className="label-tech mb-3 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-lime" />Confirmed information (your answers and catalogue data)</h2>
                <ul className="space-y-1.5 text-sm text-fg/80">{d.confirmed.map((c) => <li key={c}>— {c}</li>)}</ul>
              </section>
            )}
            {d.unknown.length > 0 && (
              <section>
                <h2 className="label-tech mb-3 flex items-center gap-2"><CircleHelp className="h-3.5 w-3.5 text-info" />Unknown — needed for a firmer answer</h2>
                <ul className="space-y-1.5 text-sm text-muted">{d.unknown.map((c) => <li key={c}>— {c}</li>)}</ul>
                {d.bearingRelated && <Link href="/mechanic?tab=bearing" className="mt-3 inline-flex items-center gap-2 text-sm text-lime link-u"><ScanLine className="h-4 w-4" />Identify the bearing from measurements</Link>}
              </section>
            )}

            {/* AI layer */}
            <section className="border hairline p-6">
              <h2 className="flex items-center gap-2 text-lg font-medium"><Sparkles className="h-4 w-4 text-lime" />AI analysis</h2>
              {result?.ai ? (
                <div className="mt-4 space-y-5 text-sm">
                  <p className="label-tech">Generated by {result.aiProvider} — AI output, check before acting</p>
                  <p className="text-fg/90">{result.ai.summary}</p>
                  {result.ai.likelyCauses.length > 0 && <ul className="space-y-3">{result.ai.likelyCauses.map((c, i) => <li key={i}><span className={cx("mr-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase", c.confidence === "likely" ? "bg-lime/15 text-lime" : "bg-white/5 text-muted")}>{c.confidence}</span><span className="font-medium">{c.title}</span> <span className="text-muted">— {c.reasoning}</span></li>)}</ul>}
                  {result.ai.imageObservations.length > 0 && <div><p className="label-tech mb-1">From your photos</p><ul className="space-y-1 text-muted">{result.ai.imageObservations.map((o, i) => <li key={i}>— {o}</li>)}</ul></div>}
                  {result.ai.bearingNotes && <p className="text-muted"><span className="text-fg">Bearings:</span> {result.ai.bearingNotes}</p>}
                  {result.ai.followUpQuestions.length > 0 && <div><p className="label-tech mb-1">AI follow-up questions</p><ul className="space-y-1 text-muted">{result.ai.followUpQuestions.map((o, i) => <li key={i}>— {o}</li>)}</ul></div>}
                  {result.ai.safety.level === "stop" && d.safety.level !== "stop" && <p className="text-bad">The AI model flagged a safety concern: {result.ai.safety.message}</p>}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  {result?.aiError ?? (status?.language.connected ? "No AI output for this request." : "No AI provider is connected on this server, so the analysis above comes entirely from VELOX's rule-based diagnostic engine. Configure ANTHROPIC_API_KEY on the server to add language and photo analysis.")}
                </p>
              )}
            </section>

            {replacements.length > 0 && (
              <section>
                <h2 className="text-lg font-medium">Parts that may need attention</h2>
                <p className="mt-1 text-sm text-muted">{profile ? `Checked against ${profile.label}'s catalogue data.` : "Select your bike to check compatibility."} Replace only after inspection confirms the cause.</p>
                <ul className="mt-4 border-t hairline">
                  {replacements.slice(0, 8).map((c) => {
                    const r = profile ? checkCandidate(base, c) : null;
                    return (
                      <li key={c.id} className="flex items-center gap-4 border-b hairline py-3">
                        <ComponentGlyph type={c.type} className="h-8 w-8 text-muted" />
                        <Link href={`/components/${c.id}`} className="min-w-0 flex-1 truncate text-sm link-u">{c.manufacturer} {c.name}</Link>
                        <span className="hidden text-xs text-muted sm:block">{titleCase(c.type)}</span>
                        {r && r.status !== "empty" ? <CompatBadge status={r.status} short /> : <span className="text-xs text-subtle">—</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <p className="text-xs leading-relaxed text-subtle">VELOX AI Mechanic does not physically inspect your bicycle. Results are ranked hypotheses based on your description and catalogue data. If anything affects braking, steering or the frame, stop riding and have a qualified mechanic inspect it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CauseList({ title, items, tone, empty }: { title: string; items: Diagnosis["likely"]; tone: "likely" | "possible"; empty: string }) {
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-3 text-2xl font-medium tracking-tight">{title}<span className="text-sm font-normal text-muted">{items.length}</span></h2>
      {!items.length ? <p className="text-sm text-muted">{empty}</p> : (
        <ul className="border-t hairline">
          {items.map((c) => (
            <li key={c.id} className="border-b hairline py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase", tone === "likely" ? "bg-lime/15 text-lime" : "bg-white/5 text-muted")}>{tone}</span>
                <span className="label-tech">{SYSTEM_LABEL[c.system]}</span>
                {c.safety === "stop" && <span className="rounded-full bg-bad/15 px-2 py-0.5 font-mono text-[10px] uppercase text-bad">Safety</span>}
                <span className="ml-auto text-xs text-subtle">{c.complexity}</span>
              </div>
              <p className="mt-2 text-[17px] font-medium tracking-tight">{c.title}</p>
              <p className="mt-1 text-sm text-muted">{c.explanation}</p>
              {c.evidence.length > 0 && <p className="mt-2 text-xs text-subtle">Based on: {c.evidence.join(" · ")}</p>}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted hover:text-fg">Inspection steps</summary>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-fg/85">{c.inspection.map((s) => <li key={s}>{s}</li>)}</ol>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================= bearing ID ============================= */

function BearingId({ cat }: { cat: ReturnType<typeof useCatalog> }) {
  const [location, setLocation] = useState("hub");
  const [inner, setInner] = useState("");
  const [outer, setOuter] = useState("");
  const [width, setWidth] = useState("");
  const [marking, setMarking] = useState("");
  const [shis, setShis] = useState("");
  const bearings = useMemo(() => cat.components.filter((c) => c.type === "bearing"), [cat.components]);
  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : null);
  const hasInput = !!(marking.trim() || inner || outer || width);
  const matches = useMemo(() => (hasInput ? matchBearings({ innerMm: num(inner), outerMm: num(outer), widthMm: num(width), marking, location }, bearings) : []), [hasInput, inner, outer, width, marking, location, bearings]);
  const parsedShis = shis.trim() ? parseShis(shis) : null;
  const verifiedMatches = matches.filter((m) => m.bearing.provenance.status === "cross-verified");
  const otherMatches = matches.filter((m) => m.bearing.provenance.status !== "cross-verified");
  const dimsGiven = [inner, outer, width].filter(Boolean).length;

  return (
    <div className="grid gap-12 lg:grid-cols-[420px_1fr] xl:gap-16 [&>*]:min-w-0">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="border border-warn/30 bg-warn/[0.05] p-4 text-sm text-fg/85">VELOX never identifies a bearing from a photo. Use the marking printed on the bearing seal, the hub/BB/headset maker's documentation, or caliper measurements of the old bearing.</div>
        <Field label="Where is the bearing?" htmlFor="b-loc">
          <select id="b-loc" className="field" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="hub">Wheel hub</option><option value="freehub">Freehub body</option><option value="bb">Bottom bracket</option><option value="headset">Headset</option><option value="pivot">Suspension pivot</option><option value="pedal">Pedal</option>
          </select>
        </Field>
        <Field label="Marking on the seal" htmlFor="b-mark" hint="e.g. 6802-2RS, 61803, MR15267 — seal suffixes are ignored.">
          <input id="b-mark" className="field" value={marking} onChange={(e) => setMarking(e.target.value)} placeholder="6902 2RS" />
        </Field>
        <div>
          <p className="label-tech mb-2">Measurements (mm)</p>
          <div className="grid grid-cols-3 gap-2">
            <input aria-label="Inner diameter (mm)" className="field" inputMode="decimal" placeholder="Inner Ø" value={inner} onChange={(e) => setInner(e.target.value)} />
            <input aria-label="Outer diameter (mm)" className="field" inputMode="decimal" placeholder="Outer Ø" value={outer} onChange={(e) => setOuter(e.target.value)} />
            <input aria-label="Width (mm)" className="field" inputMode="decimal" placeholder="Width" value={width} onChange={(e) => setWidth(e.target.value)} />
          </div>
          <p className="mt-2 text-xs text-subtle">Measure the old bearing with calipers. Matches allow ±0.3 mm.</p>
        </div>
        {location === "headset" && (
          <Field label="Headset SHIS code (optional)" htmlFor="b-shis" hint="Printed in the frame maker's documentation, e.g. ZS44/28.6 | EC44/40">
            <input id="b-shis" className="field" value={shis} onChange={(e) => setShis(e.target.value)} placeholder="IS42/28.6 | IS52/40" />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-10">
        {location === "headset" && shis.trim() && (
          <section>
            <h2 className="text-lg font-medium">SHIS decode</h2>
            {parsedShis ? (
              <ul className="mt-3 space-y-2 text-sm">{parsedShis.map((p) => <li key={p.position}><span className="label-tech mr-2">{p.position}</span>{p.type} — {p.meaning}</li>)}</ul>
            ) : <p className="mt-2 text-sm text-warn">Not a recognised SHIS code. Format: IS|ZS|EC + bore / steerer, top | bottom.</p>}
            <p className="mt-3 text-xs text-subtle">SHIS describes the cup/bore — the bearing inside still has to be measured (outer Ø, inner Ø, width and contact angle).</p>
          </section>
        )}
        {!hasInput ? (
          <div className="border border-dashed hairline p-10 text-sm text-muted">Enter a marking or at least one measurement to search {bearings.length} reference bearings.</div>
        ) : (
          <>
            <MatchList title="Matches — standard designations (dimensions fixed by ISO 15)" items={verifiedMatches} />
            <MatchList title="Matches — common headset sizes (industry practice, verify)" items={otherMatches} />
            {!matches.length && <p className="text-sm text-muted">No reference bearing matches. Re-measure (bearings are usually whole millimetres, headset bearings often 41.8 / 30.15 mm), or use the manufacturer's service documentation.</p>}
            {matches.length > 1 && dimsGiven < 3 && !marking && <p className="text-sm text-warn">Several bearings fit the dimensions you entered — add the missing measurement to narrow it to one.</p>}
            <p className="text-xs text-subtle">Seal type (2RS / LLB / open), precision grade and material (steel / ceramic hybrid) do not change the size but do change performance — match them to the original or the manufacturer's recommendation.</p>
          </>
        )}
        {location === "bb" && (
          <section>
            <h2 className="text-lg font-medium">Bottom-bracket standards</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b hairline text-left"><th className="py-2 font-normal label-tech">Standard</th><th className="py-2 font-normal label-tech">Shell</th><th className="py-2 font-normal label-tech">Bore / thread</th><th className="py-2 font-normal label-tech">Typical bearings</th></tr></thead>
                <tbody>{BB_STANDARDS.map((b) => <tr key={b.id} className="border-b hairline align-top"><td className="py-2.5 pr-3">{b.name}<span className="block text-xs text-subtle">{titleCase(b.type)}</span></td><td className="py-2.5 pr-3 text-muted">{b.shell}</td><td className="py-2.5 pr-3 text-muted">{b.bore}</td><td className="py-2.5 text-muted">{b.typical}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MatchList({ title, items }: { title: string; items: ReturnType<typeof matchBearings> }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      <ul className="border-t hairline">
        {items.map((m) => (
          <li key={m.bearing.id} className="grid grid-cols-[1fr_auto] gap-3 border-b hairline py-4">
            <div>
              <p className="text-[17px] font-medium tracking-tight">{m.bearing.bearing!.designation} {m.exact && <span className="ml-2 rounded-full bg-lime/15 px-2 py-0.5 font-mono text-[10px] uppercase text-lime">Exact</span>}</p>
              <p className="tabular text-sm text-muted">{m.bearing.bearing!.innerMm} × {m.bearing.bearing!.outerMm} × {m.bearing.bearing!.widthMm} mm{m.bearing.bearing!.contactAngle ? ` · ${m.bearing.bearing!.contactAngle}°` : ""}</p>
              <p className="mt-1 text-xs text-subtle">{m.basis} · Typical use: {m.bearing.bearing!.typicalUse.join(", ")}</p>
            </div>
            <StatusBadge status={m.bearing.provenance.status} className="self-start" />
          </li>
        ))}
      </ul>
    </section>
  );
}
