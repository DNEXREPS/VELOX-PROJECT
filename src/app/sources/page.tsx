import type { Metadata } from "next";
import Image from "next/image";
import { BRANDS } from "@/data/brands";
import { BIKES } from "@/data/bikes";
import { COMPONENTS } from "@/data/components";
import { MEDIA_LIST } from "@/data/media";
import { OFFICIAL_SOURCES, PENDING_BRANDS } from "@/data/research";
import { IMPORT_LOG } from "@/data/import-log";
import { COVERAGE_LABEL, imageCoverage, PRODUCT_IMAGES, type ImageCoverage } from "@/data/product-images";
import { PageHeader } from "@/components/ui";
import { isVerified, SOURCE_TYPE_LABEL, STATUS_LABEL, titleCase } from "@/lib/format";
import type { VerificationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Data & image sources", description: "How VELOX sources, verifies and licenses its data and imagery." };

export default function Page() {
  const all = [...BRANDS, ...BIKES, ...COMPONENTS];
  const statuses = Object.keys(STATUS_LABEL) as VerificationStatus[];
  const researchedBrands = BRANDS.filter((b) => b.provenance.sources.some((s) => s.type && s.type !== "editorial-seed"));
  const sourceTypes = new Map<string, number>();
  for (const r of all) for (const s of r.provenance.sources) if (s.type) sourceTypes.set(s.type, (sourceTypes.get(s.type) ?? 0) + 1);

  return (
    <>
      <PageHeader eyebrow="Data & image sources" title={<>Where everything<br /><span className="text-muted">comes from.</span></>}>
        VELOX labels every record with a verification status, its sources and a confidence level. This page summarises the current state of the database honestly — including what is still unverified and what could not be found.
      </PageHeader>
      <div className="container-x space-y-24 py-14">
        <section>
          <h2 className="text-2xl font-medium tracking-tight">Database status</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{all.length} records in total. Counts are computed live from the catalogue.</p>
          <div className="mt-6 grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {statuses.map((s) => <div key={s} className="bg-ink-950 p-5"><p className="tabular text-3xl font-medium tracking-tight">{all.filter((r) => r.provenance.status === s).length}</p><p className="label-tech mt-1">{STATUS_LABEL[s]}</p></div>)}
          </div>
          <p className="mt-4 text-sm text-muted">{all.filter((r) => isVerified(r.provenance.status)).length} verified records: models and wheelsets imported from official manufacturer pages, bearing designations by ISO standard, and brands confirmed by multiple independent sources. Older seed records remain unverified and their prices are VELOX estimates. Run <code className="font-mono text-xs">npm run audit</code> for the full catalogue audit.</p>
          <h3 className="label-tech mb-2 mt-8">Source types cited</h3>
          <div className="flex flex-wrap gap-2">{[...sourceTypes.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => <span key={t} className="rounded-full border hairline px-3 py-1 text-xs text-muted">{SOURCE_TYPE_LABEL[t as keyof typeof SOURCE_TYPE_LABEL]} · {n}</span>)}</div>
        </section>

        <section>
          <h2 className="text-2xl font-medium tracking-tight">Research pass — 16 November 2026</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{researchedBrands.length} brand records were researched through web search. Facts are recorded only where a source stated them; conflicts are left empty and noted. Official manufacturer product data is imported separately — see below.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b hairline text-left">{["Brand", "Status", "Confidence", "Sources", "Notes"].map((h) => <th key={h} className="py-2 pr-4 font-normal label-tech">{h}</th>)}</tr></thead>
              <tbody>{researchedBrands.map((b) => (
                <tr key={b.id} className="border-b hairline align-top">
                  <td className="py-3 pr-4">{b.name}<span className="block text-xs text-subtle">{b.country}</span></td>
                  <td className="py-3 pr-4 text-muted">{STATUS_LABEL[b.provenance.status]}</td>
                  <td className="py-3 pr-4 text-muted">{b.provenance.confidence ?? "—"}</td>
                  <td className="py-3 pr-4">{b.provenance.sources.map((s) => <a key={s.url ?? s.label} href={s.url ?? undefined} target="_blank" rel="noreferrer" className="block text-xs text-muted link-u hover:text-fg">{s.label} ↗</a>)}</td>
                  <td className="py-3 text-xs text-subtle">{b.provenance.reviewerNotes ?? ""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-medium tracking-tight">Official manufacturer imports — {IMPORT_LOG.date}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">Read from the manufacturers' own product pages with robots.txt respected and at least 1.2 s between requests. Only published fields are filled. USD prices are converted at {IMPORT_LOG.usdIdrRate.source} (Rp {IMPORT_LOG.usdIdrRate.rate.toLocaleString("en-US")}/USD) and labelled as conversions.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b hairline text-left">{["Source", "Listings read", "Duplicates removed", "Records in catalogue"].map((h) => <th key={h} className="py-2 pr-4 font-normal label-tech">{h}</th>)}</tr></thead>
              <tbody>
                {IMPORT_LOG.bikes.map((x) => (
                  <tr key={x.source} className="border-b hairline">
                    <td className="py-3 pr-4"><a href={x.url} target="_blank" rel="noreferrer" className="link-u">{x.source}</a></td>
                    <td className="tabular py-3 pr-4 text-muted">{x.listingsRead}</td>
                    <td className="tabular py-3 pr-4 text-muted">{x.duplicateListingsDropped}</td>
                    <td className="tabular py-3 text-muted">{BIKES.filter((b) => b.provenance.status === "verified-official" && b.provenance.sources[0]?.label.startsWith(x.source.split(" ")[0])).length}</td>
                  </tr>
                ))}
                <tr className="border-b hairline">
                  <td className="py-3 pr-4">{IMPORT_LOG.wheels.source}</td>
                  <td className="tabular py-3 pr-4 text-muted">{IMPORT_LOG.wheels.listingsRead}</td>
                  <td className="tabular py-3 pr-4 text-muted">{IMPORT_LOG.wheels.rejected}</td>
                  <td className="tabular py-3 text-muted">{COMPONENTS.filter((c) => c.type === "wheelset" && c.provenance.status === "verified-official").length} wheelsets</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 className="label-tech mb-2 mt-8">Could not be read automatically</h3>
          <ul className="space-y-1 text-sm text-muted">{IMPORT_LOG.blocked.map((b) => <li key={b}>· {b}</li>)}</ul>
        </section>

        <section>
          <h2 className="text-2xl font-medium tracking-tight">Product photography</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            A model is pictured only with the photo its manufacturer declares for that exact product on its own product page (schema.org / Open Graph / product feed), or with a licensed photo checked against the model. Every file is downloaded, validated (HTTP status, image type, decodable, minimum size), stored locally, de-duplicated by checksum and reviewed on a contact sheet. Manufacturer photos are shown unaltered, credited and linked to the source page. Models without one show the VELOX missing-image state with a link to the official page.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-px bg-line sm:grid-cols-5">
            {(Object.keys(COVERAGE_LABEL) as ImageCoverage[]).map((k) => <div key={k} className="bg-ink-950 p-5"><p className="tabular text-3xl font-medium tracking-tight">{BIKES.filter((b) => imageCoverage(b) === k).length}</p><p className="label-tech mt-1">{COVERAGE_LABEL[k]}</p></div>)}
          </div>
          <h3 className="label-tech mb-2 mt-8">Licensed photographs</h3>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_IMAGES.filter((i) => i.image_source_type !== "manufacturer").map((i) => {
              const bike = BIKES.find((b) => b.id === i.subjectId);
              return (
                <li key={i.id}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-ink-900"><Image src={i.primary_image_url} alt={i.alt} fill sizes="360px" className="object-contain" /></div>
                  <p className="mt-2 text-sm">{bike ? `${BRANDS.find((b) => b.id === bike.brandId)?.name} ${bike.name} (${bike.year})` : i.subjectId}</p>
                  <p className="text-[11px] text-subtle">{i.author ?? "Author not recorded"} · <a href={i.image_source_url} target="_blank" rel="noreferrer" className="link-u">Wikimedia Commons</a> · <a href={i.licenseUrl ?? undefined} target="_blank" rel="noreferrer" className="link-u">{i.license}</a></p>
                  <p className="mt-1 text-[11px] text-muted">{i.matchNotes}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-medium tracking-tight">Requested but not found</h2>
            <p className="mt-2 text-sm text-muted">These names were requested for the catalogue but could not be substantiated. They are not shown as brands until a reliable source is found.</p>
            <ul className="mt-5 border-t hairline">{PENDING_BRANDS.map((p) => <li key={p.name} className="border-b hairline py-3 text-sm"><span className="font-medium">{p.name}</span> <span className="text-subtle">· {p.context}</span><p className="text-xs text-muted">{p.finding}</p></li>)}</ul>
          </div>
          <div>
            <h2 className="text-2xl font-medium tracking-tight">Official sources not yet imported</h2>
            <p className="mt-2 text-sm text-muted">Several refuse automated readers; VELOX does not work around that. Their data enters through search-indexed official pages, distributor feeds or admin import, always via review.</p>
            <ul className="mt-5 border-t hairline">{OFFICIAL_SOURCES.map((o) => <li key={o.url} className="border-b hairline py-3 text-sm"><span className="font-medium">{o.brand}</span> <span className="text-subtle">· {SOURCE_TYPE_LABEL[o.type]}</span><p className="text-xs text-muted">{o.url} — {o.covers}</p><p className="label-tech mt-0.5 text-warn">{titleCase(o.status)}</p></li>)}</ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-medium tracking-tight">Category photography</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">Used under the Pexels License on the homepage and category tiles only. These photos illustrate categories and are never used to picture a specific model.</p>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {MEDIA_LIST.map((m) => (
              <li key={m.id}>
                <div className="relative aspect-[4/3] overflow-hidden bg-ink-900"><Image src={m.src} alt={m.alt} fill sizes="200px" className="object-cover" /></div>
                <p className="mt-2 text-xs">{m.subject}</p>
                <p className="text-[11px] text-subtle">{m.photographer ?? "Photographer not recorded"} · <a href={m.sourceUrl ?? undefined} target="_blank" rel="noreferrer" className="link-u">{m.source}</a> · {m.license}</p>
                <p className="text-[11px] text-subtle">Verified {m.verifiedAt} · {m.quality}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
