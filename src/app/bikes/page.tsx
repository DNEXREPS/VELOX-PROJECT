import type { Metadata } from "next";
import { Suspense } from "react";
import { BikeFinder } from "./BikeFinder";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Bike Finder", description: "Find the right bicycle by budget, riding style, experience, brand and specification — local and international brands, priced in Rupiah." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Bike Finder" title={<>Find the bike that<br /><span className="text-muted">fits how you ride.</span></>}>
        Set a budget in Rupiah, tell us how you ride, and VELOX ranks every matching bicycle by suitability and value — not by price tag. Local and international brands are treated equally.
      </PageHeader>
      <Suspense fallback={<div className="container-x grid gap-8 py-12 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[5/4]" />)}</div>}>
        <BikeFinder />
      </Suspense>
    </>
  );
}
