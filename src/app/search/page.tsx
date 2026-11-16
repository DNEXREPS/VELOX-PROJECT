import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "./SearchResults";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  return (
    <Suspense fallback={<div className="container-x py-16"><Skeleton className="h-96" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
