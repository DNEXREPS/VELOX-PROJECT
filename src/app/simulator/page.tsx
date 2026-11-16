import type { Metadata } from "next";
import { Suspense } from "react";
import { Simulator } from "./Simulator";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Upgrade Simulator", description: "Calculate the weight and cost impact of component upgrades from catalogued specifications." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Performance Upgrade Simulator" title={<>Weight and cost,<br /><span className="text-muted">calculated — not guessed.</span></>}>
        Pick a bike and the parts you&apos;re considering. VELOX subtracts catalogued weights, totals the cost and tells you exactly which numbers are missing. It never converts grams into invented speed or watt gains.
      </PageHeader>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <Simulator />
      </Suspense>
    </>
  );
}
