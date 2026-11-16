import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandExplorer } from "./BrandExplorer";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Brand Explorer", description: "Browse Indonesian and international bicycle brands by country and category." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Brand Explorer" title={<>From Sidoarjo<br /><span className="text-muted">to San Francisco.</span></>}>
        Every brand, local or global, with its origin, categories and catalogued models. Indonesian manufacturers are first-class citizens here — discoverable in search, the finder, comparisons and recommendations.
      </PageHeader>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <BrandExplorer />
      </Suspense>
    </>
  );
}
