import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "./CompareView";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Compare", description: "Compare bicycles, brands, components and custom builds side by side." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Compare" title={<>Side by side.<br /><span className="text-muted">Differences first.</span></>}>
        Compare up to four bicycles, brands, components or custom builds. Differences are highlighted, the best numeric value is marked, and missing data stays “Not Available”.
      </PageHeader>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <CompareView />
      </Suspense>
    </>
  );
}
