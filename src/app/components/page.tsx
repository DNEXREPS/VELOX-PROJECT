import type { Metadata } from "next";
import { Suspense } from "react";
import { ComponentExplorer } from "./ComponentExplorer";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Component Explorer", description: "Search groupsets, wheelsets, tyres, brakes, cockpit parts and more with specifications and compatibility data." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Component Explorer" title={<>Every part,<br /><span className="text-muted">specified.</span></>}>
        Groupsets, wheels, tyres, brakes, cockpit and accessories from Shimano, SRAM, Campagnolo, MicroSHIFT, LTWOO, Sensah, Zipp, DT Swiss, Continental, Maxxis and more — with the technical attributes the compatibility engine relies on.
      </PageHeader>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <ComponentExplorer />
      </Suspense>
    </>
  );
}
