import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { safeNext } from "@/lib/supabase/client";
import { DICTS, detectLang, translate } from "@/lib/i18n";
import { GLOSSARY, findTerm } from "@/lib/glossary";
import { findBikes } from "@/lib/finder";
import { BIKES } from "@/data/bikes";
import { BRANDS } from "@/data/brands";
import { PRODUCT_IMAGES, photoSources } from "@/data/product-images";
import { DEMO_USD_RATE, formatMoney } from "@/lib/format";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const walk = (dir: string): string[] => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

describe("authentication safety", () => {
  it("only accepts same-site relative redirects after sign-in (no open redirects)", () => {
    expect(safeNext("/garage")).toBe("/garage");
    expect(safeNext("/bikes/x?y=1")).toBe("/bikes/x?y=1");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined]) expect(safeNext(bad as string)).toBe("/account");
  });
  it("the OAuth callback route also rejects external redirect targets", () => {
    const src = read("src/app/auth/callback/route.ts");
    expect(src).toMatch(/startsWith\("\/\/"\)/);
    expect(src).toMatch(/exchangeCodeForSession/);
  });
  it("never puts a service-role key or OAuth secret in client code", () => {
    for (const f of walk("src")) {
      const s = fs.readFileSync(path.join(root, f), "utf8");
      expect(s, f).not.toMatch(/SERVICE_ROLE|service_role_key|GOOGLE_CLIENT_SECRET|sb_secret_/i);
    }
  });
  it("protects personal data with row-level security, owner-only", () => {
    const sql = read("supabase/schema.sql");
    expect(sql).toMatch(/alter table user_collections enable row level security/);
    expect(sql).toMatch(/create policy "own collections" on user_collections for all using \(owner_id = auth\.uid\(\)\) with check \(owner_id = auth\.uid\(\)\)/);
    expect(sql).toMatch(/role = \(select role from profiles where id = auth\.uid\(\)\)/); // cannot self-promote
    expect(sql).toMatch(/create or replace function delete_my_account\(\)[\s\S]*delete from auth\.users where id = auth\.uid\(\)/);
    expect(sql).not.toMatch(/create table (builds|garage_bikes|wishlist) /); // replaced by user_collections, no duplicates
  });
  it("documents every required environment variable without real values", () => {
    const env = read(".env.example");
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_AUTH_GOOGLE"]) expect(env).toMatch(new RegExp(`^${k}=$`, "m"));
  });
});

describe("language and currency", () => {
  it("has an Indonesian translation for every English key", () => {
    for (const k of Object.keys(DICTS.en)) expect(DICTS.id[k as keyof typeof DICTS.id], k).toBeTruthy();
  });
  it("follows the saved preference, else Indonesian browsers get Indonesian", () => {
    expect(detectLang("auto", "id-ID")).toBe("id");
    expect(detectLang("auto", "en-US")).toBe("en");
    expect(detectLang("en", "id-ID")).toBe("en");
    expect(translate("id", "auth.signIn")).toBe("Masuk");
    expect(translate("en", "auth.checkEmailBody", { email: "a@b.co" })).toContain("a@b.co");
  });
  it("converts IDR to USD only at the cited Bank Indonesia rate (no invented rate)", () => {
    expect(DEMO_USD_RATE).toBe(18148);
    expect(formatMoney(18_148_000, "USD")).toBe("$1,000");
  });
});

describe("beginner glossary", () => {
  it("explains the requested terms in both languages", () => {
    for (const label of ["Groupset", "Bottom bracket", "Headset", "Freehub", "Hub", "Thru-axle", "Rim depth", "Tyre clearance", "Frame material", "Brakes"]) {
      const t = findTerm(label); expect(t, label).toBeTruthy(); expect(t!.en.text.length).toBeGreaterThan(40); expect(t!.id_.text.length).toBeGreaterThan(40);
    }
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length);
  });
});

describe("product discovery", () => {
  const brandById = new Map(BRANDS.map((b) => [b.id, b]));
  it("newest-first never ranks models without a published year above dated ones", () => {
    const r = findBikes(BIKES, brandById, { sort: "newest", includeDiscontinued: true });
    const firstUndated = r.findIndex((x) => x.bike.yearBasis === "undated");
    expect(r.slice(firstUndated).every((x) => x.bike.yearBasis === "undated")).toBe(true);
  });
  it("search matches parts in the published component list (e.g. a wheelset)", () => {
    const r = findBikes(BIKES, brandById, { q: "syte chronos", includeDiscontinued: true });
    expect(r.some((x) => x.bike.name === "Magnus 5.0")).toBe(true);
  });
  it("filters combine: brand + category + budget", () => {
    const r = findBikes(BIKES, brandById, { brandIds: ["canyon"], category: "road", budgetMax: 60_000_000 });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.bike.brandId === "canyon" && x.bike.category === "road" && (x.bike.price?.amount ?? Infinity) <= 60_000_000)).toBe(true);
  });
});

describe("image galleries", () => {
  it("gallery photos belong to the same product and are never shared across products", () => {
    const owner = new Map<string, string>();
    for (const img of PRODUCT_IMAGES) for (const s of photoSources(img)) {
      expect(owner.get(s.src) ?? img.subjectId, s.src).toBe(img.subjectId);
      owner.set(s.src, img.subjectId);
    }
  });
});

describe("image health checker etiquette", () => {
  it("honours robots.txt wildcards, $ anchors, Allow precedence and agent groups", async () => {
    // @ts-expect-error plain ESM helper without types
    const { parseRobots, robotsAllows } = await import("../scripts/lib/robots.mjs");
    const txt = "User-agent: *\nDisallow: /*?sort=\nDisallow: /checkout\nAllow: /checkout/ok$\n\nUser-agent: velox-image-health\nDisallow: /private\n";
    const star = parseRobots(txt, "other-bot/1");
    expect(robotsAllows(star, "/en/bike.html")).toBe(true); // a wildcard rule must not block everything
    expect(robotsAllows(star, "/list?sort=price")).toBe(false);
    expect(robotsAllows(star, "/checkout/ok")).toBe(true);
    expect(robotsAllows(star, "/checkout/ok2")).toBe(false);
    const own = parseRobots(txt, "VELOX-image-health/1.0");
    expect(robotsAllows(own, "/private/x")).toBe(false);
    expect(robotsAllows(own, "/checkout")).toBe(true);
  });
});
