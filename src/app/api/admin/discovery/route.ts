import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server-auth";
import { rateLimit } from "@/lib/ratelimit";
import { providerRuntime } from "@/lib/providers/runtime";
import { VERIFIED_STORES } from "@/lib/providers/registry";
import { extractFromUrl } from "@/lib/providers/url-extract";
import { isPublicHost } from "@/lib/net/public-host";

export const dynamic = "force-dynamic";

const SourceKind = z.enum(["official-manufacturer", "authorized-distributor", "retailer", "marketplace", "social", "community", "publication", "web"]);
const Manual = z.object({
  action: z.literal("manual"),
  source_url: z.string().url().max(2000), source_kind: SourceKind, platform: z.string().max(80).optional(),
  title: z.string().min(2).max(300), brand_text: z.string().max(120).optional(), model_text: z.string().max(200).optional(),
  mpn: z.string().max(120).optional(), gtin: z.string().regex(/^\d{8,14}$/).optional(), category_id: z.string().max(80).optional(),
  price: z.number().nonnegative().optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  condition: z.enum(["new", "used", "refurbished", "open-box", "unknown"]).default("unknown"),
  authenticity: z.enum(["official", "authorized", "unknown", "counterfeit-risk", "unbranded"]).default("unknown"),
  publisher: z.string().max(200).optional(), published_at: z.string().datetime().optional(), specs: z.record(z.string(), z.string().max(300)).default({}),
  note: z.string().max(4000).optional(),
}).refine((v) => (v.price == null) === (v.currency == null), "price and currency go together");
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit-url"), url: z.string().url().max(2000) }),
  Manual,
  z.object({ action: z.literal("note"), id: z.string().uuid(), kind: z.enum(["identification", "conflict", "seller", "reference", "authenticity", "image-permission", "general"]), body: z.string().min(1).max(4000), reference_url: z.string().url().max(2000).optional() }),
  z.object({ action: z.literal("review"), id: z.string().uuid(), review_state: z.enum(["new", "in-review", "approved", "rejected", "needs-correction"]), verification: z.enum(["officially-verified", "multi-source-verified", "seller-listing-verified", "community-reported", "unverified", "suspected-misrepresentation"]).optional() }),
]);

/** GET /api/admin/discovery — the research queue (admin only). */
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const state = new URL(request.url).searchParams.get("state");
  const filter = state && /^[a-z-]+$/.test(state) ? `&review_state=eq.${state}` : "";
  const res = await admin.db(`discovery_records?select=*,discovery_notes(id,kind,body,reference_url,created_at)&order=created_at.desc&limit=100${filter}`);
  return res.ok ? Response.json({ records: await res.json() }) : Response.json({ error: "Could not load the research queue" }, { status: 502 });
}

/** POST /api/admin/discovery — submit a URL, record a manual finding, add a note, or change review state. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "admin-discovery", 30);
  if (limited) return limited;
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Invalid request", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  const b = parsed.data;

  if (b.action === "submit-url") {
    const draft = await extractFromUrl(b.url, providerRuntime().http, { guard: isPublicHost, knownManufacturerHosts: VERIFIED_STORES.map((s) => s.host) });
    const row = {
      source_url: draft.sourceUrl, source_kind: draft.sourceKind, platform: draft.platform, method: "manual-url", retrieval_status: draft.retrievalStatus, retrieval_note: draft.retrievalNote,
      title: draft.title, brand_text: draft.brandText, mpn: draft.mpn, gtin: draft.gtin && /^\d{8,14}$/.test(draft.gtin) ? draft.gtin : null,
      extracted: { specs: draft.specs, structuredData: draft.structuredData, categoryHint: draft.categoryHint }, image_refs: draft.imageRefs,
      price: draft.price, currency: draft.currency, condition: draft.condition, availability: draft.availability, publisher: draft.publisher, published_at: draft.publishedAt,
      retrieved_at: draft.retrievedAt, submitted_by: admin.userId,
      // a single seller listing at most; official structured data still needs a reviewer's confirmation
      verification: "unverified", identity_confidence: draft.retrievalStatus === "extracted" && draft.structuredData === "json-ld" ? "medium" : "low",
    };
    if (draft.retrievalStatus === "failed" && !draft.title) return Response.json({ draft, saved: false });
    const res = await admin.db("discovery_records?on_conflict=source_url", { method: "POST", body: row, prefer: "resolution=merge-duplicates,return=representation" });
    return Response.json({ draft, saved: res.ok, record: res.ok ? (await res.json())[0] : null });
  }

  if (b.action === "manual") {
    const { action: _a, note, specs, ...fields } = b;
    const res = await admin.db("discovery_records?on_conflict=source_url", { method: "POST", prefer: "resolution=merge-duplicates,return=representation",
      body: { ...fields, method: "manual-form", retrieval_status: "extracted", retrieval_note: "Entered by an administrator from the source page.", extracted: { specs }, submitted_by: admin.userId, verification: "unverified" } });
    if (!res.ok) return Response.json({ error: `Could not save (${res.status})` }, { status: 400 });
    const rec = (await res.json())[0];
    if (note) await admin.db("discovery_notes", { method: "POST", body: { discovery_id: rec.id, author: admin.userId, kind: "general", body: note } });
    return Response.json({ saved: true, record: rec });
  }

  if (b.action === "note") {
    const res = await admin.db("discovery_notes", { method: "POST", prefer: "return=representation", body: { discovery_id: b.id, author: admin.userId, kind: b.kind, body: b.body, reference_url: b.reference_url ?? null } });
    return res.ok ? Response.json({ saved: true, note: (await res.json())[0] }) : Response.json({ error: "Could not save the note" }, { status: 400 });
  }

  const res = await admin.db(`discovery_records?id=eq.${b.id}`, { method: "PATCH", prefer: "return=representation", body: { review_state: b.review_state, ...(b.verification ? { verification: b.verification } : {}), updated_at: new Date().toISOString() } });
  return res.ok ? Response.json({ saved: true, record: (await res.json())[0] }) : Response.json({ error: "Could not update" }, { status: 400 });
}
