/**
 * VELOX end-to-end smoke test — drives the real app in Chromium and exercises every primary flow.
 * Usage: start the app (npm run dev / npm start), then: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const errors = [];

async function step(name, fn) {
  try {
    await fn();
    results.push(["PASS", name]);
  } catch (e) {
    results.push(["FAIL", name, e.message.split("\n")[0]]);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e.message}`));
// 404 = intentional not-found test; 503 = Visualizer's honest "no image provider configured" response
page.on("console", (m) => { if (m.type() === "error" && !/404|503/.test(m.text())) errors.push(`${page.url()} :: ${m.text().slice(0, 200)}`); });
const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle" });

await step("Home renders hero and CTAs", async () => {
  await go("/");
  await page.getByRole("heading", { level: 1 }).filter({ hasText: "Find Your Ride" }).waitFor();
  await page.getByRole("link", { name: "Explore Bikes" }).click();
  await page.waitForURL("**/bikes");
});

await step("Bike Finder filters by budget + category and explains results", async () => {
  await go("/bikes");
  await page.getByRole("button", { name: "≤ 20 jt" }).click();
  await page.getByRole("button", { name: "Road", exact: true }).first().click();
  await page.waitForTimeout(300);
  const count = Number((await page.locator("section[aria-label=Results] p .tabular").first().textContent()) ?? "0");
  assert(count > 0, "no road bikes under 20 jt");
  assert(page.url().includes("max=20000000") && page.url().includes("category=road"), "URL not synced: " + page.url());
  const tiles = await page.locator("section[aria-label=Results] article").count();
  assert(tiles === count, `tile count ${tiles} != ${count}`);
  assert((await page.locator("section[aria-label=Results] article li").count()) > 0, "no recommendation reasons");
});

await step("Bike Finder: every product image is distinct, real or an honest placeholder", async () => {
  await go("/bikes?q=strattos");
  await page.getByLabel("Include discontinued & historical models").first().check();
  await page.waitForTimeout(400);
  const figs = page.locator("section[aria-label=Results] article [data-image-status]");
  const n = await figs.count();
  assert(n > 2, "too few Strattos results: " + n);
  const srcs = [];
  for (let i = 0; i < n; i++) {
    const f = figs.nth(i);
    const status = await f.getAttribute("data-image-status");
    if (status === "verified") srcs.push(decodeURIComponent((await f.locator("img").getAttribute("src")) ?? ""));
    else assert(status === "missing" || status === "admin-unverified", "unexpected image status " + status);
  }
  assert(srcs.length >= 1, "Strattos S3 should show its verified photo");
  assert(new Set(srcs).size === srcs.length, "same photo shown for two models");
  assert(srcs.every((u) => u.includes("/media/products/")), "a product card used non-product imagery: " + srcs.join(","));
  const s3 = page.locator("section[aria-label=Results] article", { hasText: "Strattos S3" });
  assert((await s3.locator("[data-image-status=verified]").count()) === 1, "Strattos S3 is not showing its own photo");
  // nothing on the whole finder may use category photography
  await go("/bikes");
  await page.waitForTimeout(400);
  const all = await page.locator("section[aria-label=Results] article img").evaluateAll((els) => els.map((e) => decodeURIComponent(e.getAttribute("src") ?? "")));
  assert(all.every((u) => u.includes("/media/products/")), "category photo found on a product card");
});

await step("Product page: placeholder links to the manufacturer and converted price is labelled", async () => {
  await go("/bikes/canyon-ultimate-cf-7-di2-2027");
  await page.locator("[data-image-status=missing]").first().waitFor();
  const link = page.getByRole("link", { name: /manufacturer’s photos/ });
  assert((await link.getAttribute("href"))?.startsWith("https://www.canyon.com/"), "official link missing");
  await page.getByText(/US\$3,199/).first().waitFor();
  await page.getByText(/not an Indonesian price/).first().waitFor();
  await go("/bikes/polygon-strattos-s3-2019");
  await page.locator("[data-image-status=verified]").first().waitFor();
  await page.getByText(/CC BY-SA 2.0/).first().waitFor();
});

await step("Bike Finder: official-data filter and brand counts", async () => {
  await go("/bikes");
  await page.getByLabel("Official manufacturer data only").first().check();
  await page.waitForTimeout(300);
  const count = Number((await page.locator("section[aria-label=Results] p .tabular").first().textContent()) ?? "0");
  assert(count > 300, "official filter returned " + count);
  const opt = await page.locator("#f-brand option", { hasText: "Specialized" }).first().textContent();
  assert(/\(\d+\)/.test(opt ?? ""), "brand option lacks model count: " + opt);
});

await step("Bike Finder: Indonesian-only filter", async () => {
  await go("/bikes?region=Indonesia");
  await page.waitForTimeout(300);
  const badges = await page.locator("section[aria-label=Results] article").count();
  const local = await page.locator("section[aria-label=Results] article", { hasText: "Lokal" }).count();
  assert(badges > 0 && badges === local, `expected only local bikes, got ${local}/${badges}`);
});

await step("Global search palette (Ctrl+K) with typo tolerance", async () => {
  await go("/");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search query" }).fill("polgon strattos");
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/(bikes|brands)\//);
});

await step("Build a Bike: frame + groupset kit + wheels, compatibility, save, persist", async () => {
  await go("/build");
  await page.getByRole("button", { name: "Choose Frame" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("listitem").filter({ hasText: "TCR Advanced Pro Frameset" }).getByRole("button", { name: "Select" }).click();
  await page.getByRole("button", { name: "Choose Fork" }).click();
  await page.getByRole("dialog").getByRole("listitem").filter({ hasText: "TCR Advanced Fork" }).getByRole("button", { name: "Select" }).click();
  await page.getByRole("button", { name: "Choose Groupset" }).click();
  await page.getByRole("dialog").getByRole("listitem").filter({ hasText: "105 Di2 R7100" }).getByRole("button", { name: "Select" }).click();
  await page.getByRole("button", { name: "Choose Wheelset" }).click();
  await page.getByRole("dialog").getByRole("listitem").filter({ hasText: "303 Firecrest" }).getByRole("button", { name: "Select" }).click();
  const total = await page.locator("aside").getByText(/^Rp [\d.]+$/).first().textContent();
  assert(total && total !== "Rp 0", "total not calculated: " + total);
  const checks = await page.getByRole("button", { name: /Compatibility checks \(\d+\)/ }).textContent();
  assert(/\((\d+)\)/.exec(checks)[1] > 5, "too few checks: " + checks);
  await page.getByLabel("Build name").fill("E2E Race Build");
  await page.getByRole("button", { name: /Save build/ }).click();
  await page.reload({ waitUntil: "networkidle" });
  assert((await page.getByLabel("Build name").inputValue()) === "E2E Race Build", "draft not persisted");
  await page.getByText("Saved builds (1)").waitFor();
});

await step("Build a Bike: detects an incompatibility (rim caliper on disc frame)", async () => {
  await page.getByRole("button", { name: "Change Brakes" }).click();
  await page.getByRole("dialog").getByLabel("Show parts from all disciplines", { exact: false }).check().catch(() => {});
  await page.getByRole("dialog").getByRole("listitem").filter({ hasText: "R559" }).getByRole("button", { name: "Select" }).click();
  await page.locator("aside").getByText("Incompatible").first().waitFor();
});

await step("Upgrade Advisor: generates three tiers for a catalogue bike", async () => {
  await go("/upgrade?bike=polygon-xtrada-7-2024");
  await page.getByText("Recommendations for").waitFor();
  for (const t of ["Budget Upgrade", "Balanced Upgrade", "Performance Upgrade"]) await page.getByRole("heading", { name: t }).waitFor();
  const recs = await page.locator("section[aria-label='Performance Upgrade'] li").count();
  assert(recs > 0, "no performance recommendations");
});

await step("Upgrade Advisor: manual bike entry", async () => {
  await page.getByRole("radio", { name: "Enter manually" }).click();
  await page.getByLabel("Bike name").fill("Old commuter");
  await page.getByLabel("Category").selectOption("urban");
  await page.getByLabel("Wheel size").selectOption("700c");
  await page.getByLabel("Brakes").selectOption("v-brake");
  await page.getByText("Recommendations for").waitFor();
  await page.getByText("Old commuter").first().waitFor();
});

await step("Compare: shareable URL loads three bikes with highlighted best value", async () => {
  await go("/compare?kind=bike&ids=polygon-strattos-s5-2024,specialized-allez-2024,giant-tcr-advanced-1-2024");
  await page.waitForTimeout(400);
  await page.getByRole("link", { name: "Strattos S5" }).waitFor();
  await page.getByRole("link", { name: "TCR Advanced 1" }).waitFor();
  assert((await page.getByText("Best", { exact: true }).count()) >= 1, "no best marker");
  await page.getByLabel("Only show differences").check();
});

await step("Compare: custom builds tab includes the saved build", async () => {
  await go("/compare?kind=build");
  await page.getByRole("button", { name: /Add a build|Add build/ }).first().click();
  await page.getByRole("button", { name: /E2E Race Build/ }).click();
  await page.getByRole("link", { name: "E2E Race Build" }).waitFor();
});

await step("My Garage: add catalogue bike, open profile, add log entry", async () => {
  await go("/garage");
  await page.getByRole("button", { name: "Add a bike" }).first().click();
  await page.getByLabel("Brand").selectOption("polygon");
  await page.getByLabel("Nickname (optional)").fill("Daily Strattos");
  await page.getByRole("button", { name: "Add to garage" }).click();
  await page.getByRole("link", { name: "Open Daily Strattos" }).click();
  await page.waitForURL(/\/garage\/bike_/);
  await page.getByLabel("Title").fill("New chain fitted");
  await page.getByLabel("Cost (Rp)").fill("350000");
  await page.getByRole("button", { name: "Add entry" }).click();
  await page.getByText("New chain fitted").waitFor();
  await page.locator("main").getByRole("link", { name: "Upgrade Advisor" }).click();
  await page.getByText("Recommendations for").waitFor();
});

await step("Permissions: admin panel blocked for guests", async () => {
  await go("/admin");
  await page.getByText("Administrator role required").waitFor();
});

await step("Community submission → admin approval publishes record", async () => {
  await go("/submit?kind=brand");
  await page.getByLabel("Brand name *").fill("Kreuz Test");
  await page.getByLabel("Country of origin *").fill("Indonesia");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await go("/account");
  await page.getByLabel("Display name").fill("Admin");
  await page.getByRole("radio", { name: "Administrator" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await go("/admin");
  await page.getByRole("radio", { name: /Submissions/ }).click();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await go("/brands/kreuz-test");
  await page.getByRole("heading", { name: "Kreuz Test" }).waitFor();
  await page.getByText("Community Submitted").first().waitFor();
});

await step("Admin: CSV ingest is staged, de-duplicated and published only after review", async () => {
  await go("/admin");
  await page.getByRole("radio", { name: "Import / Export" }).click();
  await page.getByRole("button", { name: "Insert sample" }).click();
  await page.getByLabel("Source URL (where this data came from)").fill("https://www.polygonbikes.com/");
  await page.getByRole("button", { name: "Stage for review" }).click();
  await page.getByText(/Polygon Strattos S3|polygon Strattos S3/i).first().waitFor();
  await go("/bikes/polygon-strattos-s3-2025");
  await page.getByText("Bike not found").waitFor(); // not public before approval
  await go("/admin");
  await page.getByRole("radio", { name: "Review queue" }).click();
  await page.getByRole("button", { name: "Approve as new" }).first().click();
  await go("/bikes/polygon-strattos-s3-2025");
  await page.getByRole("heading", { name: "Strattos S3" }).waitFor();
});

await step("Admin: edit + archive hides a model from the public finder", async () => {
  await go("/admin");
  await page.getByRole("radio", { name: "Bike models" }).click();
  await page.getByLabel("Search models").fill("Strattos S3");
  await page.getByRole("button", { name: /Archive Polygon Strattos S3 \(2025\)/ }).click();
  await go("/bikes?q=strattos%20s3");
  await page.getByText("No bikes match every filter").waitFor();
});

await step("Component Explorer search + detail + use in build", async () => {
  await go("/components");
  await page.getByLabel("Search components").fill("rekon");
  await page.waitForTimeout(200);
  await page.getByRole("link", { name: /Maxxis Rekon/ }).first().click();
  await page.getByRole("heading", { name: /Rekon/ }).waitFor();
  await page.getByRole("link", { name: "Use in a build" }).click();
  await page.waitForURL("**/build");
  await page.getByText("Maxxis Rekon 29x2.4 WT EXO").first().waitFor();
});

await step("Brand Explorer filters Indonesian brands", async () => {
  await go("/brands");
  await page.getByRole("radio", { name: /Indonesian/ }).click();
  const n = await page.locator("main ul li h2").count();
  assert(n >= 14, "expected ≥14 Indonesian brands, got " + n);
});

await step("Tools menu opens AI Mechanic", async () => {
  await go("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: /Tools/ }).click();
  await page.getByRole("menuitem", { name: /AI Mechanic/ }).click();
  await page.waitForURL("**/mechanic");
});

await step("AI status endpoint reports honestly (no provider configured)", async () => {
  const res = await page.request.get(BASE + "/api/ai/status");
  const s = await res.json();
  assert(s.language.connected === false && s.imageGeneration.connected === false, JSON.stringify(s));
});

await step("AI Mechanic: diagnoses, asks follow-ups, re-ranks on answers", async () => {
  await go("/mechanic?q=" + encodeURIComponent("derailleur skips gears under load"));
  await page.getByRole("heading", { name: /Likely causes|Possible causes/ }).first().waitFor();
  await page.getByText("Checks that would narrow this down").waitFor();
  await page.getByRole("button", { name: "Checker shows worn (≥0.5–0.75%)" }).click();
  await page.waitForTimeout(600);
  await page.getByText("Worn (stretched) chain").first().waitFor();
  await page.getByText(/No AI provider is connected/).waitFor();
});

await step("AI Mechanic: braking problem triggers stop-riding warning", async () => {
  await go("/mechanic?q=" + encodeURIComponent("my brake lever is spongy and pulls to the bar"));
  await page.getByText("Stop riding until inspected").waitFor();
});

await step("Bearing identification by marking and measurements", async () => {
  await go("/mechanic?tab=bearing");
  await page.getByLabel("Marking on the seal").fill("61902-2RS");
  await page.getByText("15 × 28 × 7 mm").first().waitFor();
  await page.getByLabel("Marking on the seal").fill("");
  await page.getByLabel("Inner diameter (mm)").fill("17");
  await page.getByLabel("Outer diameter (mm)").fill("30");
  await page.getByLabel("Width (mm)").fill("7");
  await page.getByText("6903").first().waitFor();
});

await step("Upgrade Simulator: loads an advisor plan and calculates cost", async () => {
  await go("/simulator?bike=giant-tcr-advanced-1-2024");
  await page.getByRole("button", { name: "Balanced", exact: true }).click();
  await page.getByText("Upgrade cost").waitFor();
  await page.getByText("How these numbers are calculated").waitFor();
});

await step("AI Visualizer: builds a brief and refuses to fake an image without a provider", async () => {
  await go("/visualizer?bike=polygon-strattos-s4-2024");
  await page.getByRole("button", { name: "Performance", exact: true }).click();
  await page.getByText("Concept brief", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Generate concept" }).click();
  await page.getByText(/No image was generated/).first().waitFor();
});

await step("Sources page lists image licences and research findings", async () => {
  await go("/sources");
  await page.getByRole("heading", { name: "Product photography" }).waitFor();
  await page.getByRole("heading", { name: /Official manufacturer imports/ }).waitFor();
  await page.getByRole("heading", { name: "Requested but not found" }).waitFor();
});

/* --------------------------- responsive checks --------------------------- */
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const m = await mobile.newPage();
for (const p of ["/", "/bikes", "/build", "/upgrade", "/brands", "/components", "/compare", "/garage", "/bikes/polygon-strattos-s4-2024", "/mechanic", "/visualizer", "/simulator", "/sources"]) {
  await step(`Mobile 390px has no horizontal overflow: ${p}`, async () => {
    await m.goto(BASE + p, { waitUntil: "networkidle" });
    const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(over <= 1, `overflow ${over}px`);
  });
}
await step("Mobile navigation menu opens and navigates", async () => {
  await m.goto(BASE + "/", { waitUntil: "networkidle" });
  await m.getByRole("button", { name: "Open menu" }).click();
  await m.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: /AI Mechanic/ }).click();
  await m.waitForURL("**/mechanic");
});

await browser.close();

for (const r of results) console.log(r[0] === "PASS" ? "✓" : "✗", r[1], r[2] ? `— ${r[2]}` : "");
console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
if (errors.length) console.log("\nRuntime errors:\n" + errors.join("\n"));
process.exit(results.some((r) => r[0] === "FAIL") || errors.length ? 1 : 0);
