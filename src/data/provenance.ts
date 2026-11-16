import type { PriceEntry, Provenance } from "@/lib/types";

export const SEED_DATE = "2026-11-01";

/** Seed records: demonstration data that has not been checked against an official source. */
export const DEMO_PROVENANCE: Provenance = {
  status: "unverified",
  demo: true,
  updatedAt: SEED_DATE,
  sources: [{ label: "VELOX editorial seed — requires verification against the manufacturer" }],
};

export const discontinued = (): Provenance => ({ ...DEMO_PROVENANCE, status: "discontinued" });

/** Every seed price is a VELOX estimate in IDR — never presented as official. */
export const est = (amount: number, note?: string): PriceEntry => ({
  amount,
  currency: "IDR",
  type: "estimated",
  source: "VELOX estimate",
  date: SEED_DATE,
  note: note ?? null,
});
