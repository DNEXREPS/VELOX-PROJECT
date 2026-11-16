import type { Metadata } from "next";
import { Suspense } from "react";
import { Builder } from "./Builder";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Build a Bike", description: "Configure a custom bicycle component by component with live price, weight and compatibility checks." };

export default function Page() {
  return (
    <Suspense fallback={<div className="container-x py-16"><Skeleton className="h-[70vh]" /></div>}>
      <Builder />
    </Suspense>
  );
}
