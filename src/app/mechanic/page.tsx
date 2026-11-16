import type { Metadata } from "next";
import { Suspense } from "react";
import { Mechanic } from "./Mechanic";
import { Skeleton } from "@/components/ui";
import { Photo } from "@/components/Photo";
import { MEDIA } from "@/data/media";

export const metadata: Metadata = { title: "AI Mechanic", description: "Describe a bicycle problem in plain words and get ranked possible causes, inspection steps, bearing identification and compatible replacement parts." };

export default function Page() {
  return (
    <>
      <header className="relative overflow-hidden border-b hairline">
        <Photo asset={MEDIA.workshop} priority sizes="100vw" className="absolute inset-0 h-full w-full" overlay="left" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="container-x relative pb-14 pt-24 md:pb-20 md:pt-32">
          <p className="eyebrow mb-5 flex items-center gap-3 text-fg/70"><span className="inline-block h-px w-6 bg-lime" />VELOX AI Mechanic</p>
          <h1 className="display max-w-3xl text-[clamp(2.6rem,6.5vw,5.5rem)]">Understand your bike.<br /><span className="text-fg/45">Diagnose smarter.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-fg/70 md:text-[17px]">Describe what you hear and feel. VELOX ranks likely and possible causes, asks the checks a mechanic would, identifies bearings from measurements, and points to compatible parts. It cannot see or touch your bike — treat every result as something to inspect, not a verdict.</p>
        </div>
      </header>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <Mechanic />
      </Suspense>
    </>
  );
}
