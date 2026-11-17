import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of Use" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of Use">Plain-language terms for using VELOX. The site owner should have these reviewed before public launch.</PageHeader>
      <div className="container-x max-w-3xl space-y-6 py-12 text-[15px] leading-relaxed text-muted">
        <p><span className="text-fg">Information, not a guarantee.</span> Specifications, prices and compatibility results come from the sources shown on each record. Always confirm with the manufacturer or an authorised dealer before buying or modifying a bicycle.</p>
        <p><span className="text-fg">Safety.</span> AI Mechanic and the compatibility engine give guidance only. Brakes, steering, wheels and frames are safety-critical — have work checked by a qualified mechanic.</p>
        <p><span className="text-fg">Your account.</span> Keep your password private. You can delete your account and personal data at any time from Account settings.</p>
        <p><span className="text-fg">Product photography.</span> Manufacturer photos are shown to identify the exact product, credited and linked to their source. Rights holders can request removal.</p>
      </div>
    </>
  );
}
