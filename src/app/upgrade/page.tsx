import type { Metadata } from "next";
import { Suspense } from "react";
import { Advisor } from "./Advisor";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Upgrade Advisor", description: "Goal-driven, compatibility-checked upgrade recommendations in three budget tiers." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Upgrade Advisor" title={<>Make your bike<br /><span className="text-muted">measurably better.</span></>}>
        Register the bike you own, set a budget and your riding goals. VELOX checks every candidate part against your bike&apos;s brakes, axles, freehub and drivetrain, skips sideways moves, and packages the rest into Budget, Balanced and Performance plans.
      </PageHeader>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <Advisor />
      </Suspense>
    </>
  );
}
