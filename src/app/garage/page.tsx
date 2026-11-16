import type { Metadata } from "next";
import { Suspense } from "react";
import { Garage } from "./Garage";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "My Garage", description: "Your bicycles, saved builds, modifications, maintenance notes and wishlist." };

export default function Page() {
  return (
    <Suspense fallback={<div className="container-x py-16"><Skeleton className="h-96" /></div>}>
      <Garage />
    </Suspense>
  );
}
