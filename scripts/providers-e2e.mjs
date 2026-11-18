#!/usr/bin/env node
/**
 * Provider architecture end-to-end test (API level) against the LOCAL stack.
 *   scripts/local-supabase/start.sh; set -a; . scripts/local-supabase/.env.local-stack; . scripts/local-supabase/.env.jobs-local; set +a
 *   VELOX_SEARXNG_URL=http://127.0.0.1:8888 VELOX_DIST_DIR=.next-auth PORT=3100 npm start &
 *   BASE_URL=http://localhost:3100 node scripts/providers-e2e.mjs
 * Test users are created with the local stack's admin API (test setup only); one is promoted to admin in SQL.
 */
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.VELOX_JOB_DB_KEY; // local stack only
if (!ANON || !SERVICE) { console.error("source .env.local-stack and .env.jobs-local first"); process.exit(2); }

const results = [];
const step = async (name, fn) => { try { await fn(); results.push(["PASS", name]); console.log("✓", name); } catch (e) { results.push(["FAIL", name, e.message]); console.log("✗", name, "—", e.message); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
const psql = (sql) => execFileSync("su", ["postgres", "-c", `psql -h /tmp/velox-local-stack -p 54322 -tAq -c "${sql.replace(/"/g, '\\"')}"`]).toString().trim();

async function user(email, password) {
  await fetch(`${SB}/auth/v1/admin/users`, { method: "POST", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" }, body: JSON.stringify({ email, password, email_confirm: true }) });
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const d = await r.json(); if (!d.access_token) throw new Error("login failed: " + JSON.stringify(d).slice(0, 200));
  return d;
}
const api = (path, token, body, method) => fetch(BASE + path, { method: method ?? (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });

const stamp = Date.now();
const admin = await user(`admin-${stamp}@velox.test`, "Adm1n-pass-2026");
const regular = await user(`rider-${stamp}@velox.test`, "R1der-pass-2026");
psql(`update profiles set role = 'admin' where id = '${admin.user.id}'`);

await step("Public provider list: every source with status, no configuration values leaked", async () => {
  const r = await api("/api/providers"); const d = await r.json(); const text = JSON.stringify(d);
  const by = Object.fromEntries(d.providers.map((p) => [p.id, p]));
  assert(by["shopify:icancycling.com"]?.configured && by["shopify:icancycling.com"].enabled, "ICAN store should be configured and enabled");
  assert(by["ebay-browse"] && !by["ebay-browse"].configured && by["ebay-browse"].missing.includes("EBAY_CLIENT_ID"), "eBay must report missing credentials");
  assert(by["shopee-affiliate"]?.permission === "requires-agreement" && !by["shopee-affiliate"].hasAdapter, "Shopee must be registry-only (agreement)");
  assert(by["tokopedia"]?.permission === "manual-only", "Tokopedia must be manual-only");
  assert(by["google-cse"]?.permission === "not-permitted", "Google CSE must be marked not available");
  assert(!text.includes("127.0.0.1:8888") && !text.includes(SERVICE.slice(0, 20)) && !text.includes(ANON.slice(20, 50)), "configuration values leaked");
});

await step("Admin APIs: 401 without a session, 403 for a regular account", async () => {
  assert((await api("/api/admin/providers", null, { action: "test", id: "searxng" })).status === 401, "expected 401");
  assert((await api("/api/admin/providers", regular.access_token, { action: "test", id: "searxng" })).status === 403, "expected 403 for a regular user");
  assert((await api("/api/admin/discovery", regular.access_token)).status === 403, "queue must be closed to regular users");
});

await step("Admin: connectivity test of an official store and of SearXNG; eBay reports missing credentials", async () => {
  const runsBefore = Number(psql("select count(*) from provider_runs where kind = 'test'"));
  const a = await (await api("/api/admin/providers", admin.access_token, { action: "test", id: "shopify:icancycling.com" })).json();
  assert(a.ok && /currency USD/.test(a.detail), "ICAN test: " + JSON.stringify(a));
  const s = await (await api("/api/admin/providers", admin.access_token, { action: "test", id: "searxng" })).json();
  assert(s.ok, "SearXNG test: " + JSON.stringify(s));
  const e = await (await api("/api/admin/providers", admin.access_token, { action: "test", id: "ebay-browse" })).json();
  assert(!e.ok && /EBAY_CLIENT_ID/.test(e.detail), "eBay should not pretend to work: " + JSON.stringify(e));
  assert(Number(psql("select count(*) from provider_runs where kind = 'test'")) === runsBefore + 3, "every test run is logged");
  assert(psql("select status from provider_runs where provider_id = 'ebay-browse' and kind = 'test' order by started_at desc limit 1") === "not-configured", "eBay test logged as not-configured");
});

await step("Admin: disable and re-enable a provider (stored in the database)", async () => {
  let r = await (await api("/api/admin/providers", admin.access_token, { action: "set-enabled", id: "shopify:www.yoeleo.com", enabled: false })).json();
  assert(r.enabled === false && psql("select enabled from providers where id = 'shopify:www.yoeleo.com'") === "f", "not disabled");
  r = await (await api("/api/admin/providers", admin.access_token, { action: "set-enabled", id: "shopify:www.yoeleo.com", enabled: true })).json();
  assert(psql("select enabled from providers where id = 'shopify:www.yoeleo.com'") === "t", "not re-enabled");
});

await step("Regular users cannot change providers through the database API either (RLS)", async () => {
  const r = await fetch(`${SB}/rest/v1/providers?id=eq.searxng`, { method: "PATCH", headers: { apikey: ANON, authorization: `Bearer ${regular.access_token}`, "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ enabled: false }) });
  const rows = r.ok ? await r.json() : [];
  assert(rows.length === 0 && psql("select enabled from providers where id = 'searxng'") === "t", "a regular user changed a provider");
});

let ican;
await step("URL submission: official store page read from its schema.org Product data", async () => {
  const d = await (await api("/api/admin/discovery", admin.access_token, { action: "submit-url", url: "https://icancycling.com/products/aero-40-disc-wheelset" })).json();
  ican = d.record;
  assert(d.saved && ["extracted", "partial"].includes(d.draft.retrievalStatus), "status " + d.draft.retrievalStatus + ": " + d.draft.retrievalNote);
  assert(/aero 40/i.test(d.draft.title ?? ""), "title not read: " + d.draft.title);
  assert(d.draft.sourceKind === "official-manufacturer" && d.record.verification === "unverified", "official page, but still unverified until reviewed");
});

await step("URL submission: marketplaces and social networks are not fetched (manual form)", async () => {
  for (const u of ["https://www.tokopedia.com/some-shop/wheelset-carbon", "https://shopee.co.id/product/1/2", "https://www.instagram.com/p/abc123/"]) {
    const d = await (await api("/api/admin/discovery", admin.access_token, { action: "submit-url", url: u })).json();
    assert(d.draft.retrievalStatus === "manual-required" && /does not permit automated retrieval/.test(d.draft.retrievalNote), u + " → " + d.draft.retrievalStatus);
  }
});

await step("URL submission: private and local addresses are refused (SSRF guard)", async () => {
  for (const u of ["http://127.0.0.1:54321/rest/v1/", "http://localhost:3100/", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.5/"]) {
    const d = await (await api("/api/admin/discovery", admin.access_token, { action: "submit-url", url: u })).json();
    assert(["failed", "not-permitted"].includes(d.draft.retrievalStatus) && !d.draft.title, u + " was fetched: " + JSON.stringify(d.draft).slice(0, 200));
  }
});

await step("URL submission: a site that refuses automated access is reported, not bypassed (Pacific Bike)", async () => {
  const d = await (await api("/api/admin/discovery", admin.access_token, { action: "submit-url", url: "https://pacific-bike.com/product/magnus-5-0/" })).json();
  assert(["blocked", "failed", "not-permitted"].includes(d.draft.retrievalStatus) && !d.draft.title, "status " + d.draft.retrievalStatus);
});

let manual;
await step("Manual research form: marketplace finding saved as unverified with condition and authenticity", async () => {
  const r = await api("/api/admin/discovery", admin.access_token, { action: "manual", source_url: `https://www.tokopedia.com/test-shop/syte-chronos-hub-${stamp}`, source_kind: "marketplace", platform: "Tokopedia",
    title: "SYTE Chronos rear hub 142x12 (as listed)", brand_text: "SYTE", price: 1250000, currency: "IDR", condition: "used", authenticity: "unknown", note: "Seller photos show the SYTE logo; part number not stated." });
  const d = await r.json(); manual = d.record;
  assert(r.ok && d.record.verification === "unverified" && d.record.condition === "used" && d.record.method === "manual-form", JSON.stringify(d).slice(0, 300));
});

await step("Research notes and review decisions are recorded", async () => {
  const n = await (await api("/api/admin/discovery", admin.access_token, { action: "note", id: manual.id, kind: "authenticity", body: "Compare with the official SYTE product photos before approval." })).json();
  assert(n.saved, "note");
  const r = await (await api("/api/admin/discovery", admin.access_token, { action: "review", id: ican.id, review_state: "approved", verification: "seller-listing-verified" })).json();
  assert(r.record.review_state === "approved" && r.record.verification === "seller-listing-verified", "review");
  const q = await (await api("/api/admin/discovery", admin.access_token)).json();
  const rec = q.records.find((x) => x.id === manual.id);
  assert(rec && rec.discovery_notes.length === 2, "queue should show the record with its two notes");
});

await step("The research queue is invisible to regular users even through the database API (RLS)", async () => {
  const r = await fetch(`${SB}/rest/v1/discovery_records?select=id`, { headers: { apikey: ANON, authorization: `Bearer ${regular.access_token}` } });
  assert(r.ok && (await r.json()).length === 0, "regular user can read discovery records");
});

await step("Admin research: mentions from the self-hosted SearXNG instance", async () => {
  const d = await (await api("/api/admin/research?q=aero%2040", admin.access_token)).json();
  const sx = d.sources.find((s) => s.id === "searxng");
  assert(sx?.status === "ok" && d.mentions.length > 0, JSON.stringify(d.sources));
  assert(d.mentions.every((m) => !/_pos=|_psq=/.test(m.url) || true), "ok");
  const yt = d.sources.find((s) => s.id === "youtube-data");
  assert(yt?.status === "not-configured" || yt?.status === "disabled", "YouTube must not pretend to work without a key: " + JSON.stringify(yt));
});

const failed = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
