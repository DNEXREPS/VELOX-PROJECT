"use client";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Plug, RefreshCw } from "lucide-react";
import { authConfigured, supabase } from "@/lib/supabase/client";
import { Button, Field, Segmented } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cx } from "@/lib/format";

interface ProviderRow {
  id: string; name: string; type: string; accessMethod: string; permission: string; capabilities: string[]; cost: string; rateLimit: string; updateFrequency: string;
  displayPermission: string; imagePermission: string; credentialsEnv: string[]; notes?: string | null; docsUrl?: string | null;
  enabled: boolean; configured: boolean; missing: string[]; configNote: string | null; hasAdapter: boolean;
  health: { lastSuccessAt: string | null; lastError: string | null; lastErrorAt: string | null } | null;
}
interface DiscoveryRow {
  id: string; source_url: string; source_kind: string; platform: string | null; method: string; retrieval_status: string; retrieval_note: string | null; title: string | null;
  brand_text: string | null; price: number | null; currency: string | null; condition: string; verification: string; review_state: string; created_at: string;
  identity_confidence: string; image_refs: string[]; discovery_notes: Array<{ id: string; kind: string; body: string; created_at: string }>;
}
type View = "providers" | "submit" | "queue";

async function authed(path: string, init: RequestInit = {}) {
  const sb = supabase();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  return fetch(path, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers } });
}

const STATUS_TONE: Record<string, string> = { ok: "text-lime", active: "text-lime", "needs-credentials": "text-warn", "requires-credentials": "text-warn", "requires-agreement": "text-warn", "manual-only": "text-muted", "not-permitted": "text-bad", unknown: "text-muted" };

/** Admin → Data sources: provider registry, connectivity tests, URL submission and the research queue. */
export function SourcesAdmin() {
  const [view, setView] = useState<View>("providers");
  if (!authConfigured) return (
    <div className="border hairline p-6 text-sm text-muted">
      Provider management, URL submission and the research queue are server-side administrator features. They need Supabase Auth
      (an administrator account checked by the server). The device-only demo role cannot use them.
    </div>
  );
  return (
    <div className="space-y-6">
      <Segmented value={view} onChange={setView} options={[{ value: "providers", label: "Providers" }, { value: "submit", label: "Submit / research" }, { value: "queue", label: "Research queue" }]} />
      {view === "providers" && <Providers />}
      {view === "submit" && <Submit />}
      {view === "queue" && <Queue />}
    </div>
  );
}

function Providers() {
  const [rows, setRows] = useState<ProviderRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; detail: string }>>({});
  const load = useCallback(() => { fetch("/api/providers").then((r) => r.json()).then((d) => setRows(d.providers)).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  const act = async (id: string, body: object) => {
    setBusy(id);
    const r = await authed("/api/admin/providers", { method: "POST", body: JSON.stringify({ id, ...body }) });
    const d = await r.json();
    setBusy(null);
    if (!r.ok) { toast(d.error ?? "Failed"); return; }
    if ("ok" in d) setResults((x) => ({ ...x, [id]: { ok: d.ok, detail: d.detail } }));
    load();
  };
  if (!rows) return <p className="text-sm text-muted"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading providers…</p>;
  const counts = { active: rows.filter((r) => r.enabled && r.configured).length, creds: rows.filter((r) => r.hasAdapter && !r.configured && r.missing.length).length, agreement: rows.filter((r) => r.permission === "requires-agreement").length, manual: rows.filter((r) => r.permission === "manual-only").length };
  return (
    <div>
      <p className="text-sm text-muted">{counts.active} working · {counts.creds} need credentials · {counts.agreement} need an agreement · {counts.manual} manual research only. Credentials are server environment variables; this page never shows their values.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="label-tech border-b hairline"><tr><th className="py-2 pr-3">Source</th><th className="pr-3">Type / access</th><th className="pr-3">Status</th><th className="pr-3">Health</th><th className="pr-3">Cost · limits</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => {
              const state = !p.hasAdapter ? p.permission : !p.configured ? (p.missing.length ? "needs-credentials" : "unknown") : p.enabled ? "active" : "disabled";
              return (
                <tr key={p.id} className="border-b hairline align-top" data-provider={p.id}>
                  <td className="py-3 pr-3"><p className="font-medium">{p.name}</p><p className="font-mono text-[11px] text-subtle">{p.id}</p>{p.notes && <p className="mt-1 max-w-xs text-xs text-muted">{p.notes}</p>}</td>
                  <td className="pr-3 text-xs text-muted"><p>{p.type}</p><p className="mt-1 max-w-[16rem]">{p.accessMethod}</p></td>
                  <td className="pr-3 text-xs"><span className={cx("font-mono uppercase", STATUS_TONE[state] ?? "text-muted")}>{state}</span>{p.missing.length > 0 && <p className="mt-1 text-subtle">Set: {p.missing.join(", ")}</p>}</td>
                  <td className="pr-3 text-xs text-muted">{p.health?.lastSuccessAt ? <p>OK {new Date(p.health.lastSuccessAt).toLocaleString()}</p> : <p>—</p>}{p.health?.lastError && <p className="text-bad">Last error: {p.health.lastError}</p>}{results[p.id] && <p className={results[p.id].ok ? "text-lime" : "text-bad"}>Test: {results[p.id].detail}</p>}</td>
                  <td className="pr-3 text-xs text-muted"><p>{p.cost}</p><p>{p.rateLimit}</p></td>
                  <td className="whitespace-nowrap py-3 text-right">
                    {p.hasAdapter && <>
                      <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => act(p.id, { action: "test" })}><Plug className="h-3.5 w-3.5" />Test</Button>
                      <Button size="sm" variant="secondary" disabled={busy === p.id} onClick={() => act(p.id, { action: "set-enabled", enabled: !p.enabled })}>{p.enabled ? "Disable" : "Enable"}</Button>
                    </>}
                    {p.docsUrl && <a href={p.docsUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex text-subtle hover:text-fg" aria-label={`${p.name} documentation`}><ExternalLink className="h-3.5 w-3.5" /></a>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Submit() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ draft: Record<string, unknown>; saved: boolean } | null>(null);
  const [manual, setManual] = useState({ source_url: "", source_kind: "marketplace", platform: "", title: "", brand_text: "", mpn: "", price: "", currency: "IDR", condition: "unknown", authenticity: "unknown", note: "" });
  const [q, setQ] = useState("");
  const [research, setResearch] = useState<{ mentions: Array<{ url: string; title: string; platform: string; publisher: string | null }>; sources: Array<{ id: string; status: string; detail?: string }> } | null>(null);
  const submit = async () => {
    setBusy(true); setResult(null);
    const r = await authed("/api/admin/discovery", { method: "POST", body: JSON.stringify({ action: "submit-url", url }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return toast(d.error ?? "Failed");
    setResult(d);
    if (d.draft?.retrievalStatus !== "extracted") setManual((m) => ({ ...m, source_url: url, title: (d.draft?.title as string) ?? "", platform: (d.draft?.platform as string) ?? "" }));
  };
  const saveManual = async () => {
    const body = { action: "manual", ...manual, platform: manual.platform || undefined, brand_text: manual.brand_text || undefined, mpn: manual.mpn || undefined, note: manual.note || undefined,
      price: manual.price ? Number(manual.price) : undefined, currency: manual.price ? manual.currency : undefined };
    const r = await authed("/api/admin/discovery", { method: "POST", body: JSON.stringify(body) });
    const d = await r.json();
    toast(r.ok ? "Saved to the research queue (unverified)" : (d.issues?.join("; ") ?? d.error ?? "Failed"));
  };
  const runResearch = async () => { const r = await authed(`/api/admin/research?q=${encodeURIComponent(q)}`); setResearch(await r.json()); };
  const set = (k: keyof typeof manual) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setManual((m) => ({ ...m, [k]: e.target.value }));
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h3 className="text-lg font-medium">Submit a product URL</h3>
        <p className="mt-1 text-sm text-muted">Manufacturer, retailer, marketplace, social or forum URL. VELOX reads it only through permitted methods (official oEmbed, robots-allowed pages with structured data). Social networks and marketplaces that forbid automated access are not fetched — use the form.</p>
        <div className="mt-3 flex gap-2"><input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" aria-label="Product URL" /><Button onClick={submit} disabled={busy || !url}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Read</Button></div>
        {result && (
          <div className="mt-4 border hairline p-4 text-sm" data-testid="url-result">
            <p className="font-mono text-xs uppercase text-lime">{String(result.draft.retrievalStatus)}</p>
            <p className="mt-1 text-muted">{String(result.draft.retrievalNote)}</p>
            {Boolean(result.draft.title) && <p className="mt-2"><span className="label-tech">Title</span> {String(result.draft.title)}</p>}
            {Boolean(result.draft.brandText) && <p><span className="label-tech">Brand (as stated)</span> {String(result.draft.brandText)}</p>}
            {result.draft.price != null && <p><span className="label-tech">Observed price</span> {String(result.draft.price)} {String(result.draft.currency)} (not a checkout price)</p>}
            <p className="mt-2 text-xs text-subtle">{result.saved ? "Saved to the research queue as unverified." : "Not saved."}</p>
          </div>
        )}
        <h3 className="mt-8 text-lg font-medium">Find public mentions</h3>
        <div className="mt-3 flex gap-2"><input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Pacific Primum 5.5" aria-label="Research query" /><Button variant="secondary" onClick={runResearch} disabled={!q}>Search</Button></div>
        {research && <div className="mt-3 text-sm">
          <p className="text-xs text-muted">{research.sources.map((s) => `${s.id}: ${s.status}${s.detail ? ` (${s.detail})` : ""}`).join(" · ") || "No research sources available"}</p>
          <ul className="mt-2 space-y-2">{research.mentions.map((m) => <li key={m.url}><a className="text-lime hover:underline" href={m.url} target="_blank" rel="noreferrer">{m.title}</a> <span className="text-xs text-muted">{m.platform}{m.publisher ? ` · ${m.publisher}` : ""}</span></li>)}</ul>
          <p className="mt-2 text-xs text-subtle">Mentions are leads, not evidence of specifications or authenticity.</p>
        </div>}
      </section>
      <section>
        <h3 className="text-lg font-medium">Manual research form</h3>
        <p className="mt-1 text-sm text-muted">For sources VELOX cannot read automatically. Record only what the source states.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Source URL"><input className="field" value={manual.source_url} onChange={set("source_url")} /></Field>
          <Field label="Source kind"><select className="field" value={manual.source_kind} onChange={set("source_kind")}>{["official-manufacturer", "authorized-distributor", "retailer", "marketplace", "social", "community", "publication", "web"].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Platform"><input className="field" value={manual.platform} onChange={set("platform")} placeholder="Tokopedia, Instagram…" /></Field>
          <Field label="Title as listed"><input className="field" value={manual.title} onChange={set("title")} /></Field>
          <Field label="Brand (as stated)"><input className="field" value={manual.brand_text} onChange={set("brand_text")} /></Field>
          <Field label="Part number"><input className="field" value={manual.mpn} onChange={set("mpn")} /></Field>
          <Field label="Observed price"><input className="field" inputMode="decimal" value={manual.price} onChange={set("price")} /></Field>
          <Field label="Currency"><input className="field" value={manual.currency} onChange={set("currency")} maxLength={3} /></Field>
          <Field label="Condition"><select className="field" value={manual.condition} onChange={set("condition")}>{["new", "used", "refurbished", "open-box", "unknown"].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Authenticity"><select className="field" value={manual.authenticity} onChange={set("authenticity")}>{["official", "authorized", "unknown", "counterfeit-risk", "unbranded"].map((k) => <option key={k}>{k}</option>)}</select></Field>
        </div>
        <Field label="Research note" className="mt-3"><textarea className="field min-h-24" value={manual.note} onChange={set("note")} /></Field>
        <Button className="mt-3" onClick={saveManual} disabled={!manual.source_url || manual.title.length < 2}>Save to research queue</Button>
      </section>
    </div>
  );
}

function Queue() {
  const [rows, setRows] = useState<DiscoveryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { authed("/api/admin/discovery").then(async (r) => { const d = await r.json(); if (r.ok) setRows(d.records); else setError(d.error); }); }, []);
  useEffect(load, [load]);
  const review = async (id: string, review_state: string, verification?: string) => { await authed("/api/admin/discovery", { method: "POST", body: JSON.stringify({ action: "review", id, review_state, verification }) }); load(); };
  const note = async (id: string) => { const body = prompt("Research note"); if (!body) return; await authed("/api/admin/discovery", { method: "POST", body: JSON.stringify({ action: "note", id, kind: "general", body }) }); load(); };
  if (error) return <p className="text-sm text-bad">{error}</p>;
  if (!rows) return <p className="text-sm text-muted"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</p>;
  if (!rows.length) return <p className="text-sm text-muted">The research queue is empty. Submit a URL or record a manual finding.</p>;
  return (
    <div>
      <div className="flex items-center justify-between"><p className="text-sm text-muted">{rows.length} records · nothing here is shown to users or added to the catalogue until approved.</p><Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button></div>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="py-4 text-sm" data-testid="discovery-row">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{r.title ?? "(untitled)"} {r.brand_text && <span className="text-muted">· {r.brand_text}</span>}</p>
              <span className="font-mono text-[11px] uppercase text-subtle">{r.review_state} · {r.verification}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{r.platform ?? r.source_kind} · {r.method} · {r.retrieval_status} · identity confidence {r.identity_confidence}{r.price != null ? ` · observed ${r.price} ${r.currency}` : ""} · {new Date(r.created_at).toLocaleString()}</p>
            <a className="mt-1 inline-flex items-center gap-1 text-xs text-lime hover:underline" href={r.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink className="h-3 w-3" /></a>
            {r.discovery_notes.map((n) => <p key={n.id} className="mt-1 border-l border-line pl-2 text-xs text-muted">{n.kind}: {n.body}</p>)}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => review(r.id, "in-review")}>In review</Button>
              <Button size="sm" variant="ghost" onClick={() => review(r.id, "needs-correction")}>Needs correction</Button>
              <Button size="sm" variant="secondary" onClick={() => review(r.id, "approved", "seller-listing-verified")}>Approve (seller listing)</Button>
              <Button size="sm" variant="danger" onClick={() => review(r.id, "rejected")}>Reject</Button>
              <Button size="sm" variant="ghost" onClick={() => review(r.id, r.review_state, "suspected-misrepresentation")}>Flag misrepresentation</Button>
              <Button size="sm" variant="ghost" onClick={() => note(r.id)}>Add note</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
