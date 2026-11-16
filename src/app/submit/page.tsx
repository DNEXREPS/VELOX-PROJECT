import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitForm } from "./SubmitForm";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Suggest data", description: "Submit missing brands, bikes, components or corrections for review." };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Community submissions" title={<>Help complete<br /><span className="text-muted">the catalogue.</span></>}>
        Suggest a missing brand, bicycle model or component, or correct a specification. Submissions are reviewed by an administrator before they appear — and are labelled “Community Submitted” until verified against an official source.
      </PageHeader>
      <Suspense fallback={<div className="container-x py-12"><Skeleton className="h-96" /></div>}>
        <SubmitForm />
      </Suspense>
    </>
  );
}
