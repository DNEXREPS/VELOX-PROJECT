import type { Metadata } from "next";
import { Suspense } from "react";
import { Visualizer } from "./Visualizer";
import { Skeleton } from "@/components/ui";
import { Photo } from "@/components/Photo";
import { MEDIA } from "@/data/media";

export const metadata: Metadata = { title: "AI Bike Visualizer", description: "Preview your bike with upgraded components as a realistic AI concept image." };

export default function Page() {
  return (
    <>
      <header className="relative overflow-hidden border-b hairline">
        <Photo asset={MEDIA.roadbikeWall} priority sizes="100vw" className="absolute inset-0 h-full w-full" imgClassName="grayscale" overlay="left" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="container-x relative pb-14 pt-24 md:pb-20 md:pt-32">
          <p className="eyebrow mb-5 flex items-center gap-3 text-fg/70"><span className="inline-block h-px w-6 bg-lime" />VELOX AI Bike Visualizer</p>
          <h1 className="display max-w-3xl text-[clamp(2.6rem,6.5vw,5.5rem)]">See your<br /><span className="text-fg/45">next build.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-fg/70 md:text-[17px]">Choose a bike, upload a photo if you have one, and select real catalogue parts. VELOX prepares a geometry-preserving brief for an image model and calculates the weight and cost impact. Images are AI concept visualisations — not engineering drawings or real product photos.</p>
        </div>
      </header>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <Visualizer />
      </Suspense>
    </>
  );
}
