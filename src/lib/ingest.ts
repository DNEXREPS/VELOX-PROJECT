/**
 * Data ingestion pipeline.
 *
 *   adapter.parse(input)  →  normalise  →  detectDuplicates  →  staged records (review queue)
 *                                                               ↓ admin approves
 *                                                          catalogue overlay / database
 *
 * Adapters are pure and reusable; adding a manufacturer integration means adding an adapter,
 * never editing frontend components. Nothing enters the verified catalogue without review.
 */
import { slugify } from "@/data/brands";
import { parseCsv } from "./csv";
import { importMany, normalizeBrand, normalizeComponent, normalizeModel } from "./importers";
import { editDistance } from "./search";
import type { BikeModel, Brand, Component, SourceType, VerificationStatus } from "./types";

export type EntityKind = "brand" | "bike" | "component";
export type AnyRecord = Brand | BikeModel | Component;

export interface IngestAdapter {
  id: string;
  label: string;
  sourceType: SourceType;
  description: string;
  /** turn raw input into plain rows; adapters never decide verification */
  parse: (input: string) => Record<string, unknown>[];
}

/* ------------------------------- adapters ------------------------------- */

export const csvAdapter: IngestAdapter = {
  id: "csv", label: "CSV file", sourceType: "editorial-seed", description: "Header row + one record per line. Lists use “|”.",
  parse: (input) => parseCsv(input),
};

export const jsonAdapter: IngestAdapter = {
  id: "json", label: "JSON array", sourceType: "editorial-seed", description: "An array of record objects (or { records: [...] }).",
  parse: (input) => {
    const data = JSON.parse(input);
    const rows = Array.isArray(data) ? data : Array.isArray(data?.records) ? data.records : null;
    if (!rows) throw new Error("Expected a JSON array of records");
    return rows as Record<string, unknown>[];
  },
};

/**
 * Official product pages: extracts schema.org Product data from JSON-LD blocks — the structured
 * data most manufacturer sites publish for search engines. Only fields present are mapped.
 */
export const schemaOrgProductAdapter: IngestAdapter = {
  id: "schema-org", label: "Official product page (schema.org JSON-LD)", sourceType: "official-website",
  description: "Paste the HTML of a manufacturer product page; Product JSON-LD is extracted.",
  parse: (html) => {
    const out: Record<string, unknown>[] = [];
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(visit);
      const n = node as Record<string, unknown>;
      if (n["@graph"]) visit(n["@graph"]);
      const type = n["@type"];
      if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
        const brand = typeof n.brand === "object" && n.brand ? (n.brand as Record<string, unknown>).name : n.brand;
        const offers = (Array.isArray(n.offers) ? n.offers[0] : n.offers) as Record<string, unknown> | undefined;
        const image = Array.isArray(n.image) ? n.image[0] : n.image;
        out.push({
          name: n.name, brand, manufacturer: brand, description: n.description, productId: n.sku ?? n.gtin13 ?? n.gtin ?? n.mpn ?? null,
          imageUrl: typeof image === "string" ? image : null, officialUrl: n.url ?? null,
          priceIdr: offers && offers.priceCurrency === "IDR" ? offers.price : null,
          priceType: offers && offers.priceCurrency === "IDR" ? "msrp" : null,
          weightG: typeof n.weight === "object" && n.weight ? (n.weight as Record<string, unknown>).value : null,
        });
      }
    };
    while ((m = re.exec(html))) {
      try { visit(JSON.parse(m[1])); } catch { /* skip malformed block */ }
    }
    if (!out.length) throw new Error("No schema.org Product data found on this page");
    return out;
  },
};

export const manualAdapter: IngestAdapter = {
  id: "manual", label: "Manual administrator entry", sourceType: "editorial-seed", description: "Single record entered in the admin editor.",
  parse: (input) => [JSON.parse(input) as Record<string, unknown>],
};

export const ADAPTERS: IngestAdapter[] = [csvAdapter, jsonAdapter, schemaOrgProductAdapter, manualAdapter];

/* --------------------------- duplicate detection --------------------------- */

const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function identityKey(kind: EntityKind, r: AnyRecord): string {
  if (kind === "brand") return `brand|${norm((r as Brand).name)}`;
  if (kind === "bike") {
    const b = r as BikeModel;
    return `bike|${norm(b.brandId)}|${norm(b.name)}|${b.year}|${norm(b.variant ?? "")}`;
  }
  const c = r as Component;
  return `component|${norm(c.manufacturer)}|${norm(c.name)}|${c.modelYear ?? ""}`;
}

export interface DuplicateMatch {
  existingId: string;
  reason: string;
  certainty: "exact" | "likely" | "possible";
}

export function detectDuplicates(kind: EntityKind, record: AnyRecord, existing: AnyRecord[]): DuplicateMatch[] {
  const key = identityKey(kind, record);
  const out: DuplicateMatch[] = [];
  const pid = (record as Component).productId;
  for (const e of existing) {
    if (e.id === record.id) { out.push({ existingId: e.id, reason: "Same record id", certainty: "exact" }); continue; }
    if (pid && (e as Component).productId && norm(pid) === norm((e as Component).productId)) { out.push({ existingId: e.id, reason: `Same product identifier (${pid})`, certainty: "exact" }); continue; }
    const ek = identityKey(kind, e);
    if (ek === key) { out.push({ existingId: e.id, reason: kind === "bike" ? "Same brand, model, year and variant" : "Same name", certainty: "likely" }); continue; }
    // near-identical names (typos, spacing) within the same brand / year
    const [, a1, a2, a3] = key.split("|");
    const [, b1, b2, b3] = ek.split("|");
    if (a1 === b1 && (kind !== "bike" || a3 === b3) && a2 && b2 && a2.length > 3 && editDistance(a2, b2, 2) <= 2) {
      out.push({ existingId: e.id, reason: "Very similar name" + (kind === "bike" ? " for the same brand and year" : ""), certainty: "possible" });
    }
  }
  const rank = { exact: 0, likely: 1, possible: 2 };
  return out.sort((a, b) => rank[a.certainty] - rank[b.certainty]);
}

/* ------------------------------ staging queue ------------------------------ */

export interface StagedRecord {
  id: string;
  kind: EntityKind;
  record: AnyRecord;
  adapter: string;
  sourceUrl: string | null;
  stagedAt: string;
  duplicates: DuplicateMatch[];
  state: "pending" | "approved" | "rejected" | "merged";
  reviewerNotes?: string;
}

export interface StageInput {
  kind: EntityKind;
  adapter: IngestAdapter;
  input: string;
  sourceUrl?: string | null;
  existing: AnyRecord[];
}

export interface StageResult {
  staged: StagedRecord[];
  errors: string[];
}

/** Parse + normalise + dedupe. Records are always staged as "unverified" — review decides the final status. */
export function stage({ kind, adapter, input, sourceUrl, existing }: StageInput): StageResult {
  let rows: Record<string, unknown>[];
  try {
    rows = adapter.parse(input);
  } catch (e) {
    return { staged: [], errors: [(e as Error).message] };
  }
  const status: VerificationStatus = "unverified";
  const withSource = rows.map((r) => ({ ...r, source: r.source ?? sourceUrl ?? null }));
  const fn = kind === "brand" ? (r: Record<string, unknown>) => normalizeBrand(r, status) : kind === "bike" ? (r: Record<string, unknown>) => normalizeModel(r, status) : (r: Record<string, unknown>) => normalizeComponent(r, status);
  const { ok, errors } = importMany(withSource, fn as (r: Record<string, unknown>) => AnyRecord);
  const now = new Date().toISOString();
  const seenInBatch: AnyRecord[] = [];
  const staged = ok.map((record, i) => {
    for (const s of record.provenance.sources) s.type = s.type ?? adapter.sourceType;
    const duplicates = [...detectDuplicates(kind, record, existing), ...detectDuplicates(kind, record, seenInBatch).map((d) => ({ ...d, reason: `${d.reason} (within this import)` }))];
    seenInBatch.push(record);
    return { id: `stg_${Date.now().toString(36)}_${i}_${slugify(record.id).slice(0, 24)}`, kind, record, adapter: adapter.id, sourceUrl: sourceUrl ?? null, stagedAt: now, duplicates, state: "pending" as const };
  });
  return { staged, errors };
}
