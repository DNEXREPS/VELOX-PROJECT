import type { BikeModel, Brand, Category, Component } from "./types";

export type SearchKind = "brand" | "bike" | "component" | "category";

export interface SearchDoc {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tokens: string[];
  titleTokens: string[];
  meta?: Record<string, string>;
}

export interface SearchHit extends SearchDoc {
  score: number;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.+]+/g, " ").trim();
const tokenize = (s: string) => norm(s).split(/\s+/).filter(Boolean);

/** Bounded Levenshtein distance (returns max+1 when exceeded). */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokenScore(q: string, t: string): number {
  if (t === q) return 1;
  if (t.startsWith(q)) return q.length >= 2 ? 0.85 : 0.5;
  if (q.length >= 3 && t.includes(q)) return 0.6;
  if (q.length >= 4) {
    const d = editDistance(q, t.slice(0, Math.max(q.length, Math.min(t.length, q.length + 1))), 2);
    if (d <= 1) return 0.55;
    if (d === 2 && q.length >= 6) return 0.35;
  }
  return 0;
}

export function buildIndex(data: { brands: Brand[]; bikes: BikeModel[]; components: Component[]; categories: Category[]; brandById: Map<string, Brand> }): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const b of data.brands) {
    if (b.provenance.status === "archived") continue;
    docs.push({
      kind: "brand", id: b.id, title: b.name, subtitle: `${b.country} · ${b.categories.length} categories`, href: `/brands/${b.slug}`,
      titleTokens: tokenize(b.name), tokens: tokenize(`${b.name} ${b.country} ${b.region} ${b.categories.join(" ")} ${b.region === "Indonesia" ? "lokal indonesia local" : ""}`),
      meta: { region: b.region },
    });
  }
  for (const m of data.bikes) {
    if (m.provenance.status === "archived") continue;
    const brand = data.brandById.get(m.brandId);
    const title = `${brand?.name ?? ""} ${m.name}`.trim();
    docs.push({
      kind: "bike", id: m.id, title, subtitle: `${m.year} · ${m.category.toUpperCase()} · ${m.groupset ?? "Groupset n/a"}`, href: `/bikes/${m.slug}`,
      titleTokens: tokenize(title), tokens: tokenize(`${title} ${m.family} ${m.year} ${m.category} ${m.subcategory} ${m.groupset ?? ""} ${m.frameMaterial ?? ""} ${m.wheelSize ?? ""} ${m.brakes ?? ""}`),
      meta: { category: m.category, brand: m.brandId, brandName: brand?.name ?? m.brandId },
    });
  }
  for (const c of data.components) {
    if (c.provenance.status === "archived") continue;
    const title = `${c.manufacturer} ${c.name}`;
    docs.push({
      kind: "component", id: c.id, title, subtitle: `${c.type.replace("-", " ")} · ${c.tier}`, href: `/components/${c.id}`,
      titleTokens: tokenize(title), tokens: tokenize(`${title} ${c.type} ${c.series ?? ""} ${c.material ?? ""} ${Object.values(c.specs).join(" ")} ${c.discipline.join(" ")}`),
      meta: { type: c.type, manufacturer: c.manufacturerSlug },
    });
  }
  for (const cat of data.categories) {
    docs.push({ kind: "category", id: cat.id, title: cat.name, subtitle: cat.tagline, href: `/bikes?category=${cat.id}`, titleTokens: tokenize(cat.name), tokens: tokenize(`${cat.name} ${cat.description}`) });
    for (const s of cat.subcategories) {
      docs.push({ kind: "category", id: `${cat.id}:${s.id}`, title: `${s.name}`, subtitle: `${cat.name} subcategory`, href: `/bikes?category=${cat.id}&sub=${s.id}`, titleTokens: tokenize(s.name), tokens: tokenize(`${s.name} ${cat.name}`) });
    }
  }
  return docs;
}

export function search(index: SearchDoc[], query: string, opts: { kinds?: SearchKind[]; limit?: number } = {}): SearchHit[] {
  const q = tokenize(query);
  if (!q.length) return [];
  const hits: SearchHit[] = [];
  for (const d of index) {
    if (opts.kinds?.length && !opts.kinds.includes(d.kind)) continue;
    let total = 0;
    let matchedAll = true;
    for (const qt of q) {
      let best = 0;
      for (const t of d.tokens) {
        const s = tokenScore(qt, t);
        if (s > best) best = s;
        if (best === 1) break;
      }
      for (const t of d.titleTokens) best = Math.max(best, tokenScore(qt, t) * 1.15);
      if (best === 0) matchedAll = false;
      total += best;
    }
    if (!matchedAll && q.length > 1 && total / q.length < 0.5) continue;
    const score = total / q.length;
    if (score < 0.35) continue;
    const kindBoost = d.kind === "brand" ? 0.08 : d.kind === "category" ? 0.04 : 0;
    hits.push({ ...d, score: score + kindBoost + (norm(d.title) === norm(query) ? 0.5 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, opts.limit ?? 50);
}
