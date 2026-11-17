#!/usr/bin/env node
/**
 * Authentication + account end-to-end test (real browser, real Supabase Auth stack).
 *
 *   scripts/local-supabase/start.sh                       # GoTrue + PostgREST + Postgres + mail sink
 *   set -a; . scripts/local-supabase/.env.local-stack; set +a
 *   VELOX_DIST_DIR=.next-auth NEXT_PUBLIC_AUTH_GOOGLE=true npm run build
 *   VELOX_DIST_DIR=.next-auth PORT=3100 npm start &
 *   BASE_URL=http://localhost:3100 node scripts/auth-e2e.mjs
 *
 * Google sign-in is verified up to the hand-off to Supabase's /authorize endpoint (provider, PKCE
 * challenge, callback URL). Completing a real Google login needs real Google OAuth credentials.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!ANON) { console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set — source scripts/local-supabase/.env.local-stack"); process.exit(2); }

const results = [];
async function step(name, fn) {
  try { await fn(); results.push([name, true]); console.log(`✓ ${name}`); }
  catch (e) { results.push([name, false, e.message]); console.log(`✗ ${name} — ${e.message.split("\n")[0]}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const stamp = Date.now().toString(36);
const A = { name: "Rani Test", email: `rani.${stamp}@example.com`, pw: "Velox2026ride" };
const B = { name: "Budi Test", email: `budi.${stamp}@example.com`, pw: "Velox2026pedal" };

async function mailTo(email, subject) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${SB}/__mail`)).json();
    const m = list.filter((x) => x.to.includes(email) && (!subject || subject.test(x.subject))).pop();
    if (m) return m;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email for ${email}`);
}
const verifyLink = (m) => m.links.find((l) => l.includes("/auth/v1/verify"));
async function token(email, pw) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
  const j = await r.json(); if (!j.access_token) throw new Error(`token failed: ${JSON.stringify(j).slice(0, 120)}`); return j;
}
const rest = (path, tok, init = {}) => fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${tok ?? ANON}`, "content-type": "application/json", ...(init.headers ?? {}) } });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle" });
const BIKE = "/bikes/canyon-ultimate-cf-7-di2-2027";

await step("Guest can browse without signing in (home, finder, product, components, compare)", async () => {
  for (const p of ["/", "/bikes", BIKE, "/components", "/compare", "/brands", "/glossary"]) { await go(p); assert(!page.url().includes("/login"), `redirected to login from ${p}`); }
  await go("/bikes?q=ultimate%20cf%207");
  assert((await page.locator("section[aria-label=Results] article").count()) > 0, "search returned nothing");
});

await step("Guest saving a bike gets a friendly account prompt (no forced login)", async () => {
  await go(BIKE);
  await page.getByRole("button", { name: /Add to My Garage/ }).click();
  await page.getByRole("dialog", { name: /Save it to your account/ }).waitFor();
  await page.getByRole("link", { name: "Create free account" }).click();
  await page.waitForURL(/\/signup\?next=/);
});

await step("Sign-up validates input clearly", async () => {
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText("Enter your name.").waitFor();
  await page.getByText("Enter a valid email address.").waitFor();
  await page.getByLabel("Full name").fill(A.name); await page.getByLabel("Email address").fill(A.email);
  await page.getByLabel("Password", { exact: true }).fill("short"); await page.getByLabel("Confirm password").fill("different");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText("At least 8 characters, with a letter and a number.").first().waitFor();
  await page.getByText("Passwords do not match.").waitFor();
});

await step("Email sign-up sends a verification email", async () => {
  await page.getByLabel("Password", { exact: true }).fill(A.pw); await page.getByLabel("Confirm password").fill(A.pw);
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Check your email" }).waitFor();
  const m = await mailTo(A.email, /confirm/i); assert(verifyLink(m), "no verification link");
});

await step("Unconfirmed account cannot sign in yet", async () => {
  await go("/login");
  await page.getByLabel("Email address").fill(A.email); await page.getByLabel("Password", { exact: true }).fill(A.pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText(/confirm your email/i).waitFor();
});

await step("Email verification link signs the user in and returns them to the bike they were saving", async () => {
  const link = verifyLink(await mailTo(A.email, /confirm/i));
  assert(decodeURIComponent(link).includes(`/auth/callback?next=${BIKE}`), "verification link does not return to the product page");
  await page.goto(link, { waitUntil: "networkidle" });
  await page.waitForURL(BASE + BIKE);
  await page.getByRole("link", { name: new RegExp(`Account: ${A.name}`) }).waitFor();
});

await step("Signed-in user saves the bike to My Garage (synced to the account)", async () => {
  await go(BIKE);
  await page.getByRole("button", { name: /Add to My Garage/ }).click();
  assert(!(await page.getByRole("dialog").count()), "prompt shown to a signed-in user");
  await page.getByText("Added to My Garage").first().waitFor();
  await page.waitForTimeout(1500);
  const t = await token(A.email, A.pw);
  const rows = await (await rest("user_collections?collection=eq.garage&select=data", t.access_token)).json();
  assert(rows.length === 1 && rows[0].data.some((b) => b.modelId === "canyon-ultimate-cf-7-di2-2027"), `garage not synced: ${JSON.stringify(rows).slice(0, 160)}`);
});

await step("Session persists across tabs and reloads", async () => {
  const p2 = await ctx.newPage();
  await p2.goto(BASE + "/account", { waitUntil: "networkidle" });
  await p2.getByRole("heading", { name: A.name }).waitFor();
  await p2.close();
});

await step("Sign out clears personal data from the device", async () => {
  await go("/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(BASE + "/");
  await go("/garage");
  await page.getByText("Bikes").first().waitFor();
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem("velox:v1:garage") || "[]").length);
  assert(n === 0, `garage still on device after sign-out (${n})`);
});

await step("Invalid credentials show a generic error", async () => {
  await go("/login");
  await page.getByLabel("Email address").fill(A.email); await page.getByLabel("Password", { exact: true }).fill("Wrong2026pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("Email or password is incorrect.").waitFor();
  await page.getByLabel("Email address").fill(`nobody.${stamp}@example.com`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("Email or password is incorrect.").waitFor(); // same message: no account enumeration
});

await step("Sign in again: saved garage is restored from the account", async () => {
  await page.getByLabel("Email address").fill(A.email); await page.getByLabel("Password", { exact: true }).fill(A.pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/account/);
  await go("/garage");
  await page.getByText(/Ultimate CF 7 Di2/).first().waitFor();
});

await step("Password recovery: reset email, new password, sign in with it", async () => {
  await go("/account"); await page.getByRole("button", { name: "Sign out" }).click(); await page.waitForURL(BASE + "/");
  await go("/forgot-password");
  await page.getByLabel("Email address").fill(A.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page.getByText(/If an account exists/).waitFor();
  const link = verifyLink(await mailTo(A.email, /reset/i));
  await page.goto(link, { waitUntil: "networkidle" });
  await page.waitForURL(/\/reset-password/);
  A.pw = "Velox2026newpw";
  await page.getByLabel("New password").fill(A.pw); await page.getByLabel("Confirm password").fill(A.pw);
  await page.getByRole("button", { name: "Save new password" }).click();
  await page.waitForURL(/\/account/);
  await token(A.email, A.pw);
});

await step("Reset for an unknown address gives the same neutral message", async () => {
  await go("/account"); await page.getByRole("button", { name: "Sign out" }).click(); await page.waitForURL(BASE + "/");
  await go("/forgot-password");
  await page.getByLabel("Email address").fill(`ghost.${stamp}@example.com`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page.getByText(/If an account exists/).waitFor();
});

await step("Cross-account isolation is enforced by the database (RLS)", async () => {
  // user B via the API
  await fetch(`${SB}/auth/v1/signup`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email: B.email, password: B.pw, data: { full_name: B.name } }) });
  await fetch(verifyLink(await mailTo(B.email, /confirm/i)), { redirect: "manual" });
  const a = await token(A.email, A.pw), b = await token(B.email, B.pw);
  const bSees = await (await rest("user_collections?select=owner_id", b.access_token)).json();
  assert(Array.isArray(bSees) && bSees.every((r) => r.owner_id === b.user.id), "B can read another account's rows");
  const anonSees = await (await rest("user_collections?select=owner_id")).json();
  assert(Array.isArray(anonSees) && anonSees.length === 0, "anonymous visitor can read personal rows");
  const write = await rest("user_collections", b.access_token, { method: "POST", body: JSON.stringify({ owner_id: a.user.id, collection: "garage", data: [] }), headers: { prefer: "resolution=merge-duplicates" } });
  assert(write.status >= 400, `B could write A's garage (HTTP ${write.status})`);
  const upd = await rest(`user_collections?owner_id=eq.${a.user.id}`, b.access_token, { method: "PATCH", body: JSON.stringify({ data: [] }), headers: { prefer: "return=representation" } });
  assert((await upd.json()).length === 0, "B could modify A's rows");
  const role = await rest(`profiles?id=eq.${b.user.id}`, b.access_token, { method: "PATCH", body: JSON.stringify({ role: "admin" }), headers: { prefer: "return=representation" } });
  assert(role.status >= 400 || (await role.json()).length === 0, "user could promote themselves to admin");
  const aStill = await (await rest("user_collections?collection=eq.garage&select=data", a.access_token)).json();
  assert(aStill[0]?.data?.length === 1, "A's garage was changed by B");
});

await step("Second account on the same device never sees the first account's data", async () => {
  await go("/login");
  await page.getByLabel("Email address").fill(B.email); await page.getByLabel("Password", { exact: true }).fill(B.pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/account/);
  await go("/garage");
  await page.waitForTimeout(800);
  assert(!(await page.getByText(/Ultimate CF 7 Di2/).count()), "B sees A's bike");
});

await step("Protected admin features stay closed to regular accounts", async () => {
  await go("/admin");
  await page.getByText("Administrator role required").waitFor();
});

await step("Google sign-in starts the official OAuth flow (PKCE, callback URL)", async () => {
  await go("/account"); await page.getByRole("button", { name: "Sign out" }).click(); await page.waitForURL(BASE + "/");
  await go("/login");
  const req = page.waitForRequest((r) => r.url().includes("/auth/v1/authorize"));
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const u = new URL((await req).url());
  assert(u.searchParams.get("provider") === "google", "provider not google");
  assert(u.searchParams.get("code_challenge") && u.searchParams.get("code_challenge_method")?.toLowerCase() === "s256", "no PKCE challenge");
  assert((u.searchParams.get("redirect_to") ?? "").startsWith(`${BASE}/auth/callback`), `bad redirect_to ${u.searchParams.get("redirect_to")}`);
  await page.waitForURL(/\/login\?error=|\/auth\/v1\/authorize/); // provider disabled locally → Supabase returns an error, app shows it
});

await step("Account deletion removes the account and its data", async () => {
  await go("/login");
  await page.getByLabel("Email address").fill(B.email); await page.getByLabel("Password", { exact: true }).fill(B.pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/account/);
  const b = await token(B.email, B.pw);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.waitForURL(BASE + "/");
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email: B.email, password: B.pw }) });
  assert(r.status === 400, `deleted account can still sign in (${r.status})`);
  const rows = await (await rest("user_collections?select=owner_id", b.access_token)).json();
  assert(!Array.isArray(rows) || rows.length === 0, "personal rows survived deletion");
});

await step("Sign-in pages render without overflow on phone and tablet", async () => {
  for (const vp of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
    const m = await browser.newPage({ viewport: vp });
    for (const p of ["/login", "/signup", "/forgot-password", "/account", "/glossary"]) {
      await m.goto(BASE + p, { waitUntil: "networkidle" });
      const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 1, `${p} overflows by ${over}px at ${vp.width}px`);
    }
    await m.close();
  }
});

await step("No runtime errors in the browser", async () => { assert(errors.length === 0, errors.join(" | ")); });

await browser.close();
const passed = results.filter((r) => r[1]).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
