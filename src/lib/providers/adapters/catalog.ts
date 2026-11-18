/** The internal VELOX catalogue as a provider, so external and internal results share one result shape. */
import { categoryForType } from "@/lib/parts/categories";
import type { ProviderAdapter } from "../types";
import type { Offer } from "@/lib/parts/types";
import type { ComponentSummary } from "@/lib/catalog/types";

export function catalogAdapter(searchComponents: (q: string, limit: number) => Promise<ComponentSummary[]>): ProviderAdapter {
  return {
    meta: {
      id: "velox-catalog", name: "VELOX catalogue", type: "internal-catalog", accessMethod: "internal", permission: "permitted", capabilities: ["search"],
      categories: ["all"], manufacturers: [], countries: [], dataFormat: "internal", auth: "none", credentialsEnv: [], cost: "free",
      displayPermission: "own curated data", imagePermission: "per image licence record", rateLimit: "n/a", updateFrequency: "continuous", defaultEnabled: true,
    },
    configured: () => ({ ok: true }),
    async search(query) {
      const now = new Date().toISOString();
      return (await searchComponents(query.q, query.limit)).map((c): Offer => ({
        id: `velox-catalog:${c.id}`, providerId: "velox-catalog", sourceKind: "velox-catalog", sourceSite: "velox", seller: "VELOX catalogue", title: `${c.manufacturer} ${c.name}`,
        brand: c.manufacturer, model: c.name, category: categoryForType(c.type), imageUrl: null, url: `/components/${c.id}`,
        // catalogue prices are MSRP / estimates, not seller offers: they are carried on the record, not as an advertised price
        price: null, availability: "unknown", availabilityVerified: false, shipping: null, condition: "new", specs: { weightG: c.weightG ?? null, material: c.material ?? null },
        retrievedAt: now, identification: "exact", affiliate: false, sponsored: false, catalogId: c.id, verification: "verified", description: null,
      }));
    },
  };
}
