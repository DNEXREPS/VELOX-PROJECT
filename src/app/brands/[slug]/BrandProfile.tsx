"use client";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useCatalog } from "@/lib/state";
import { useHydrated } from "@/lib/store";
import { BrandMark } from "@/components/Glyphs";
import { BikeTile, CompareButton, ComponentRow } from "@/components/catalog";
import { ButtonLink, EmptyState, ProvenanceLine, SpecRows, Tag } from "@/components/ui";

const KIND_LABEL: Record<string, string> = { bicycles: "Complete bicycles", frames: "Framesets", wheels: "Wheels", components: "Components", "e-bikes": "E-bikes", "oem-manufacturer": "OEM manufacturing for other brands", "private-label": "Private-label / open-mould products", distributor: "Distribution" };
const kindLabel = (k: string) => KIND_LABEL[k] ?? k;

export function BrandProfile({ slug }: { slug: string }) {
  const cat = useCatalog();
  const hydrated = useHydrated();
  const brand = cat.brandBySlug.get(slug);
  if (!brand) {
    return <div className="container-x py-24">{hydrated ? <EmptyState title="Brand not found" action={<ButtonLink href="/brands" variant="secondary">All brands</ButtonLink>} /> : <div className="skeleton h-96" />}</div>;
  }
  const models = cat.all.bikes.filter((b) => b.brandId === brand.id && b.provenance.status !== "archived").sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
  const current = models.filter((m) => m.provenance.status !== "discontinued");
  const historical = models.filter((m) => m.provenance.status === "discontinued");
  const popular = [...current].sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0)).slice(0, 3);
  const components = cat.components.filter((c) => c.manufacturerSlug === brand.slug);
  const alternatives = cat.brands.filter((b) => b.id !== brand.id && b.region !== brand.region && b.categories.some((c) => brand.categories.includes(c))).slice(0, 6);

  return (
    <>
      <header className="border-b hairline">
        <div className="container-x pb-14 pt-8">
          <Link href="/brands" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Brand Explorer</Link>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
            <div className="animate-fade-up">
              <div className="flex items-center gap-5">
                <BrandMark name={brand.name} color={brand.mark?.color} size="lg" />
                <div>
                  <p className="eyebrow">{brand.region === "Indonesia" ? "Indonesian brand" : "International brand"}</p>
                  <h1 className="display mt-2 text-[clamp(2.6rem,6vw,5rem)]">{brand.name}</h1>
                </div>
              </div>
              <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-muted">{brand.description || "Description not available."}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {brand.categories.map((c) => <Link key={c} href={`/bikes?brand=${brand.id}&category=${c}`}><Tag className="hover:border-line-strong hover:text-fg">{cat.categories.find((x) => x.id === c)?.name}</Tag></Link>)}
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {models.length > 0 ? <ButtonLink href={`/bikes?brand=${brand.id}`}>Find {brand.name} bikes</ButtonLink> : components.length > 0 ? <ButtonLink href={`/components?mfr=${brand.slug}`}>Browse {brand.name} components</ButtonLink> : null}
                <CompareButton kind="brand" id={brand.id} label={brand.name} className="h-10 px-4 text-sm" />
                {brand.website && <a href={brand.website} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 px-3 text-sm text-muted hover:text-fg">Official website <ExternalLink className="h-3.5 w-3.5" /></a>}
              </div>
            </div>
            <div>
              <SpecRows rows={[["Country of origin", brand.country], ["Headquarters", brand.headquarters], ["Parent / operating company", brand.parentCompany], ["What they make", (brand.kinds ?? []).map(kindLabel)], ["Founded", brand.founded], ["Official website", brand.website?.replace(/^https?:\/\//, "")], ["Catalogued models", models.length], ["Catalogued components", components.length], ["Brand history", brand.history]]} />
              <div className="mt-5"><ProvenanceLine p={brand.provenance} detailed /></div>
            </div>
          </div>
        </div>
      </header>

      <section className="container-x pt-16">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="text-2xl font-medium tracking-tight">Bicycle models</h2>
          <span className="text-sm text-muted">{current.length} current · {historical.length} historical</span>
        </div>
        {current.length ? (
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">{current.map((b) => <BikeTile key={b.id} bike={b} brand={brand} />)}</div>
        ) : (
          <EmptyState title={`No ${brand.name} models catalogued yet`} action={<Link href={`/submit?kind=bike&brand=${brand.id}`} className="text-sm text-lime link-u">Submit a model</Link>}>
            VELOX lists brands even before their models are verified. Know a {brand.name} model? Submit it for review.
          </EmptyState>
        )}
        {popular.length > 1 && <p className="mt-8 text-sm text-muted">Most accessible: {popular.map((p, i) => <span key={p.id}>{i ? ", " : ""}<Link href={`/bikes/${p.slug}`} className="text-fg link-u">{p.name}</Link></span>)}</p>}
      </section>

      {historical.length > 0 && (
        <section className="container-x pt-16">
          <h2 className="mb-6 text-2xl font-medium tracking-tight">Discontinued & historical</h2>
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">{historical.map((b) => <BikeTile key={b.id} bike={b} brand={brand} />)}</div>
        </section>
      )}

      {components.length > 0 && (
        <section className="container-x pt-16">
          <h2 className="mb-4 text-2xl font-medium tracking-tight">{brand.name} components</h2>
          <div className="border-t hairline">{components.slice(0, 8).map((c) => <ComponentRow key={c.id} c={c} />)}</div>
        </section>
      )}

      {alternatives.length > 0 && (
        <section className="container-x pt-16">
          <h2 className="mb-2 text-2xl font-medium tracking-tight">{brand.region === "Indonesia" ? "International alternatives" : "Indonesian alternatives"}</h2>
          <p className="mb-6 text-sm text-muted">Brands in overlapping categories from {brand.region === "Indonesia" ? "abroad" : "Indonesia"}.</p>
          <div className="flex flex-wrap gap-3">
            {alternatives.map((b) => (
              <Link key={b.id} href={`/brands/${b.slug}`} className="flex items-center gap-3 border hairline py-2 pl-2 pr-4 hover:border-line-strong">
                <BrandMark name={b.name} color={b.mark?.color} size="sm" /><span className="text-sm">{b.name}</span><span className="text-xs text-subtle">{b.country}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
