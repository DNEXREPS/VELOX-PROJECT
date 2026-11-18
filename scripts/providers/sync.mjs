#!/usr/bin/env node
/**
 * Background provider synchronisation (run on a schedule, e.g. daily cron / CI job — never inside the web app).
 *
 *   node scripts/providers/sync.mjs              register providers, then sync every enabled + configured one
 *   node scripts/providers/sync.mjs --register   only (re)register provider metadata
 *   node scripts/providers/sync.mjs --provider shopify:icancycling.com [--dry-run]
 *
 * Env (job runner secrets, never the web app): VELOX_JOB_DB_URL, VELOX_JOB_DB_KEY (PostgREST URL + privileged key),
 * plus any provider credentials (see .env.example). Locally: scripts/local-supabase/.env.jobs-local.
 *
 * Writes: providers, sellers, offers (upsert by provider+url; never deletes — missing offers become inactive),
 * price_observations (only when the price changed), provider_runs. Offers are linked to a catalogue product
 * only on hard evidence (same official URL, GTIN, MPN, or exact brand + title); otherwise left unmatched.
 */
import { withModules } from "../lib/load-ts.mjs";

const args = process.argv.slice(2);
const only = args.includes("--provider") ? args[args.indexOf("--provider") + 1] : null;
const dry = args.includes("--dry-run");
const DB = process.env.VELOX_JOB_DB_URL?.replace(/\/$/, "");
const KEY = process.env.VELOX_JOB_DB_KEY;
if (!DB || !KEY) { console.error("VELOX_JOB_DB_URL / VELOX_JOB_DB_KEY not set (job secrets). Locally: set -a; . scripts/local-supabase/.env.jobs-local"); process.exit(2); }

const H = { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" };
async function rest(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${DB}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path.split("?")[0]}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 || method === "HEAD" ? null : res.json().catch(() => null);
}
async function all(path) { const out = []; for (let off = 0; ; off += 1000) { const page = await rest(`${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${off}`); out.push(...page); if (page.length < 1000) return out; } }
const chunks = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const norm = (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const urlKey = (u) => { try { const x = new URL(u); return (x.host.replace(/^www\./, "") + x.pathname).replace(/\/$/, "").toLowerCase(); } catch { return u; } };

function statusOf(meta, configured, enabled) {
  if (meta.permission === "not-permitted") return "unavailable";
  if (meta.permission === "requires-agreement") return "needs-agreement";
  if (meta.permission === "manual-only") return "manual-only";
  if (!configured.ok && configured.missing.length) return "needs-credentials";
  if (!configured.ok) return "disabled";
  return enabled ? "active" : "disabled";
}

await withModules(async (load) => {
  const { buildAdapters, REGISTRY_ONLY } = await load("/src/lib/providers/registry.ts");
  const { PoliteHttp } = await load("/src/lib/providers/http.ts");
  const adapters = buildAdapters(process.env);

  /* ------------------------------ registration ------------------------------ */
  const existing = new Map((await all("providers?select=id,enabled")).map((p) => [p.id, p.enabled]));
  const metaRow = (m, configured) => ({
    id: m.id, name: m.name, type: m.type, access_method: m.accessMethod, adapter: m.capabilities.length ? m.type : null, permission_status: m.permission,
    categories: m.categories, manufacturers: m.manufacturers, countries: m.countries, data_format: m.dataFormat, auth: m.auth, credentials_env: m.credentialsEnv,
    cost: m.cost, display_permission: m.displayPermission, image_permission: m.imagePermission, rate_limit: m.rateLimit, update_frequency: m.updateFrequency,
    docs_url: m.docsUrl ?? null, terms_url: m.termsUrl ?? null, notes: m.notes ?? null, schedule: m.capabilities.includes("sync") ? "daily" : m.capabilities.length ? "on demand" : null,
    status: statusOf(m, configured, existing.has(m.id) ? existing.get(m.id) : m.defaultEnabled), updated_at: new Date().toISOString(),
  });
  const rows = [...adapters.map((a) => metaRow(a.meta, a.configured())), ...REGISTRY_ONLY.map((m) => metaRow(m, { ok: false, missing: [], reason: m.permission }))];
  const fresh = rows.filter((r) => !existing.has(r.id)).map((r) => ({ ...r, enabled: [...adapters.map((a) => a.meta), ...REGISTRY_ONLY].find((m) => m.id === r.id).defaultEnabled }));
  const known = rows.filter((r) => existing.has(r.id));
  if (!dry) {
    if (fresh.length) await rest("providers?on_conflict=id", { method: "POST", body: fresh, prefer: "resolution=merge-duplicates" });
    if (known.length) await rest("providers?on_conflict=id", { method: "POST", body: known, prefer: "resolution=merge-duplicates" }); // `enabled` untouched: admin decision kept
  }
  console.log(`registered ${rows.length} providers (${fresh.length} new)`);
  if (args.includes("--register")) return;

  /* ------------------------------ catalogue index ------------------------------ */
  const products = await all("products?select=id,brand_name,name,model,official_url");
  const variants = await all("product_variants?select=product_id,mpn,gtin");
  const byUrl = new Map(products.filter((p) => p.official_url).map((p) => [urlKey(p.official_url), p.id]));
  const byTitle = new Map(products.map((p) => [norm(`${p.brand_name} ${p.name} ${p.model ?? ""}`), p.id]));
  const byMpn = new Map(variants.filter((v) => v.mpn).map((v) => [norm(v.mpn), v.product_id]));
  const byGtin = new Map(variants.filter((v) => v.gtin).map((v) => [v.gtin, v.product_id]));
  const match = (o) => {
    if (byUrl.has(urlKey(o.url))) return [byUrl.get(urlKey(o.url)), "official-url"];
    if (o.specs.gtin && byGtin.has(o.specs.gtin)) return [byGtin.get(o.specs.gtin), "gtin"];
    if (o.specs.partNumber && byMpn.has(norm(o.specs.partNumber))) return [byMpn.get(norm(o.specs.partNumber)), "mpn"];
    const t = norm(`${o.title}`), bt = norm(`${o.brand ?? ""} ${o.title}`);
    for (const k of [bt, t]) if (byTitle.has(k)) return [byTitle.get(k), "brand+title"];
    return [null, null];
  };

  /* ---------------------------------- sync ---------------------------------- */
  const enabledNow = new Map((await all("providers?select=id,enabled")).map((p) => [p.id, p.enabled]));
  const http = new PoliteHttp();
  let failures = 0;
  for (const a of adapters.filter((x) => x.sync && (!only || x.meta.id === only))) {
    const id = a.meta.id;
    const started = new Date();
    const run = { provider_id: id, kind: "sync", started_at: started.toISOString(), status: "skipped", items_seen: 0, items_upserted: 0, http_requests: 0, error: null, details: {} };
    const before = http.requests;
    try {
      const conf = a.configured();
      if (!conf.ok) { run.status = "not-configured"; run.error = conf.reason; continue; }
      if (!(enabledNow.get(id) ?? a.meta.defaultEnabled)) { run.status = "skipped"; run.error = "disabled by admin"; continue; }
      const { offers, seen, notes } = await a.sync({ signal: AbortSignal.timeout(15 * 60 * 1000), http, now: () => new Date() });
      run.items_seen = seen;
      const sellerRows = [...new Map(offers.map((o) => [o.sourceSite, { id: o.sourceSite, name: o.seller, kind: o.sourceKind === "official-manufacturer" ? "official-manufacturer" : o.sourceKind === "authorized-distributor" ? "authorized-distributor" : o.sourceKind === "marketplace" ? "marketplace-seller" : "retailer", country: o.sellerCountry ?? null, website: `https://${o.sourceSite}` }])).values()];
      const prev = new Map((await all(`offers?select=url,price,currency&provider_id=eq.${encodeURIComponent(id)}`)).map((o) => [o.url, o]));
      let matched = 0;
      const offerRows = offers.map((o) => {
        const [productId, basis] = match(o); if (productId) matched++;
        return { product_id: productId, provider_id: id, seller_id: o.sourceSite, url: o.url, title_as_listed: o.title, price: o.price?.amount ?? null, currency: o.price?.currency ?? null,
          list_price: o.listPrice ?? null, condition: o.condition, availability: o.availability, observed_at: o.retrievedAt,
          price_confidence: o.price ? (o.sourceKind === "official-manufacturer" ? "high" : "medium") : "low", availability_confidence: o.availability === "unknown" ? "low" : "medium",
          affiliate: o.affiliate, sponsored: o.sponsored, active: true,
          raw: { brand: o.brand, category: o.category, sourceKind: o.sourceKind, identification: o.identification, specs: o.specs, imageRef: o.imageUrl, variants: o.variants ?? null, matchBasis: basis } };
      });
      run.details = { matched, unmatched: offerRows.length - matched, notes };
      if (dry) { run.status = "ok"; console.log(`[dry-run] ${id}: ${offerRows.length} offers, ${matched} matched to catalogue products`); continue; }
      if (sellerRows.length) await rest("sellers?on_conflict=id", { method: "POST", body: sellerRows, prefer: "resolution=merge-duplicates" });
      const saved = [];
      for (const c of chunks(offerRows, 500)) saved.push(...await rest("offers?on_conflict=provider_id,url&select=id,url,price,currency,observed_at", { method: "POST", body: c, prefer: "resolution=merge-duplicates,return=representation" }));
      const changed = saved.filter((s) => s.price != null && (!prev.has(s.url) || Number(prev.get(s.url).price) !== Number(s.price) || prev.get(s.url).currency !== s.currency));
      for (const c of chunks(changed.map((s) => ({ offer_id: s.id, observed_at: s.observed_at, price: s.price, currency: s.currency })), 500))
        await rest("price_observations?on_conflict=offer_id,observed_at", { method: "POST", body: c, prefer: "resolution=ignore-duplicates" });
      // listings that disappeared from the source are kept but marked inactive (never deleted)
      await rest(`offers?provider_id=eq.${encodeURIComponent(id)}&observed_at=lt.${encodeURIComponent(started.toISOString())}&active=is.true`, { method: "PATCH", body: { active: false } });
      run.items_upserted = saved.length;
      run.details.priceChanges = changed.length;
      run.status = "ok";
      await rest(`providers?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { last_success_at: new Date().toISOString() } });
      console.log(`${id}: ${saved.length} offers (${matched} linked to catalogue products), ${changed.length} price observations`);
    } catch (e) {
      failures++;
      run.status = "error"; run.error = String(e.message).slice(0, 500);
      console.error(`${id}: ${run.error}`);
      if (!dry) await rest(`providers?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { last_error: run.error, last_error_at: new Date().toISOString() } }).catch(() => {});
    } finally {
      run.http_requests = http.requests - before; run.finished_at = new Date().toISOString();
      if (!dry) await rest("provider_runs", { method: "POST", body: run }).catch((e) => console.error("run log:", e.message));
    }
  }
  if (failures) process.exitCode = 1;
});
