"use client";
import { TermLabel } from "@/components/Term";
import { requireAccount } from "@/components/auth/AccountPrompt";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, ExternalLink, Minus, Plus, Sparkles } from "lucide-react";
import { useCatalog, garageStore, settingsStore } from "@/lib/state";
import { useStore } from "@/lib/store";
import { BikeGalleryThumbs, BikeImage } from "@/components/BikeImage";
import { useState } from "react";
import { BikeTile, CompareButton, WishlistButton } from "@/components/catalog";
import { Button, ButtonLink, DemoNotice, EmptyState, Price, ProvenanceLine, SpecRows, Tag } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { formatOriginal, formatWeightKg, formatWeightPref, NA, PRICE_TYPE_LABEL, titleCase, uid } from "@/lib/format";
import { useHydrated } from "@/lib/store";

export function BikeDetail({ slug }: { slug: string }) {
  const cat = useCatalog();
  const [photo, setPhoto] = useState(0);
  const { units } = useStore(settingsStore);
  const router = useRouter();
  const hydrated = useHydrated();
  const bike = cat.bikeBySlug.get(slug);

  if (!bike) {
    return (
      <div className="container-x py-24">
        {hydrated ? (
          <EmptyState title="Bike not found" action={<ButtonLink href="/bikes" variant="secondary">Back to Bike Finder</ButtonLink>}>This model is not in the catalogue, or it was archived.</EmptyState>
        ) : <div className="skeleton h-96" />}
      </div>
    );
  }

  const brand = cat.brandById.get(bike.brandId);
  const label = `${brand?.name ?? ""} ${bike.name}`;
  const category = cat.categories.find((c) => c.id === bike.category);
  const sub = category?.subcategories.find((s) => s.id === bike.subcategory);
  const generations = cat.all.bikes.filter((b) => b.brandId === bike.brandId && b.family === bike.family && b.id !== bike.id).sort((a, b) => b.year - a.year);
  const similar = cat.bikes
    .filter((b) => b.id !== bike.id && b.category === bike.category && b.price && bike.price)
    .sort((a, b) => Math.abs(a.price!.amount - bike.price!.amount) - Math.abs(b.price!.amount - bike.price!.amount))
    .slice(0, 3);

  const rows: Array<[string, unknown]> = [
    ["Brand", brand?.name],
    ["Model year", bike.yearBasis === "undated" ? null : bike.yearBasis === "listed-in-range" ? `${bike.year} (listed in range; model year not published)` : bike.year],
    ["Colours", bike.colors?.length ? bike.colors : null],
    ["Generation", bike.generation],
    ["Category", `${category?.name ?? bike.category} · ${sub?.name ?? titleCase(bike.subcategory)}`],
    ["Frame material", bike.frameMaterial],
    ["Groupset", bike.groupset],
    ["Drivetrain", bike.drivetrain],
    ["Brakes", bike.brakes],
    ["Wheelset", bike.wheelset],
    ["Tyres", bike.tires],
    ["Wheel size", bike.wheelSize],
    ["Tyre clearance", bike.tireClearanceMm ? `${bike.tireClearanceMm} mm` : null],
    ["Suspension", bike.suspension === "rigid" ? "Rigid" : bike.suspension === "front" ? `Front${bike.travel ? ` · ${bike.travel}` : ""}` : `Full${bike.travel ? ` · ${bike.travel}` : ""}`],
    ["Weight", bike.weightKg ? formatWeightPref(bike.weightKg, units) : null],
    ["Available sizes", bike.sizes],
    ["Riding style", bike.ridingStyle],
    ["Intended use", bike.usage.map(titleCase)],
    ["Rider level", bike.experience.map(titleCase)],
    ...(bike.electric ? ([["Motor", bike.electric.motor], ["Battery", bike.electric.batteryWh ? `${bike.electric.batteryWh} Wh` : null]] as Array<[string, unknown]>) : []),
    ["Frame geometry", bike.geometry ? JSON.stringify(bike.geometry) : null],
    ["Official product page", bike.officialUrl],
  ];
  const missing = rows.filter(([, v]) => v == null || (Array.isArray(v) && !v.length)).length;

  const addToGarage = () => requireAccount("garage", () => {
    const id = uid("bike");
    garageStore.set((g) => [...g, { id, nickname: label, modelId: bike.id, purchaseYear: bike.year, purchasePriceIdr: bike.price?.amount ?? null, odometerKm: 0, log: [], createdAt: new Date().toISOString() }]);
    toast("Added to My Garage", { body: label, action: { label: "Open bike profile", href: `/garage/${id}` } });
  });

  return (
    <>
      <div className="container-x pt-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Back</button>
      </div>
      <section className="container-x grid gap-10 pb-16 pt-8 lg:grid-cols-[1.25fr_1fr] lg:gap-16 [&>*]:min-w-0">
        <div className="order-2 lg:order-1">
          <div className="relative aspect-[4/3] overflow-hidden bg-ink-900">
            <BikeImage key={photo} index={photo} bike={bike} brandName={brand?.name} variant="detail" priority sizes="(min-width: 1024px) 55vw, 100vw" className="absolute inset-0 h-full w-full" />
          </div>
          <BikeGalleryThumbs bikeId={bike.id} active={photo} onSelect={setPhoto} />
        </div>
        <div className="order-1 animate-fade-up lg:order-2">
          <Link href={`/brands/${brand?.slug}`} className="eyebrow link-u inline-flex items-center gap-2 hover:text-fg">{brand?.name} · {brand?.country}</Link>
          <h1 className="display mt-4 text-[clamp(2.4rem,5vw,4.2rem)]">{bike.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag>{bike.yearBasis === "listed-in-range" ? `Listed ${bike.year} · model year not published` : bike.yearBasis === "undated" ? "Model year not published" : bike.year}</Tag>
            <Tag>{category?.name}</Tag>
            <Tag>{sub?.name ?? titleCase(bike.subcategory)}</Tag>
            {brand?.region === "Indonesia" && <Tag active>Indonesian brand</Tag>}
          </div>
          <p className="mt-6 text-[15px] leading-relaxed text-muted">{bike.ridingStyle}.</p>
          <div className="mt-8 border-y hairline py-5">
            <p className="label-tech mb-2">Price</p>
            <Price price={bike.price} className="text-2xl" />
            {bike.price?.type === "estimated" && <p className="mt-2 text-xs text-subtle">VELOX estimate, not an official manufacturer or distributor price. Check with an authorised dealer.</p>}
            {bike.price?.original && (
              <p className="mt-2 text-xs text-subtle">
                Published as {formatOriginal(bike.price.original)} ({PRICE_TYPE_LABEL[bike.price.type]}, {bike.price.source ?? "source"}{bike.price.date ? `, retrieved ${bike.price.date}` : ""}). The rupiah figure is a conversion at Rp {bike.price.original.rate.toLocaleString("id-ID")} per {bike.price.original.currency}, not an Indonesian price.{" "}
                {bike.price.sourceUrl && <a href={bike.price.sourceUrl} target="_blank" rel="noreferrer" className="link-u text-muted">Source ↗</a>}
              </p>
            )}
            {!!bike.priceHistory?.length && (
              <ul className="mt-3 space-y-1 text-xs text-muted">
                {bike.priceHistory.map((p, i) => <li key={i}>History · {p.date?.slice(0, 4)} · <Price price={p} className="text-xs" /></li>)}
              </ul>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={addToGarage}><Plus className="h-4 w-4" /> Add to My Garage</Button>
            <ButtonLink href={`/upgrade?bike=${bike.id}`} variant="secondary"><Sparkles className="h-4 w-4" /> Upgrade ideas</ButtonLink>
            <CompareButton kind="bike" id={bike.id} label={label} className="h-10 px-4 text-sm" />
            <WishlistButton kind="bike" refId={bike.id} label={label} className="h-10 w-10" />
          </div>
          <div className="mt-8"><ProvenanceLine p={bike.provenance} detailed /></div>
        </div>
      </section>

      <section className="container-x grid gap-16 border-t hairline pt-14 lg:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
        <div>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-medium tracking-tight">Specifications</h2>
            {missing > 0 && <span className="text-xs text-subtle"><span className="tabular text-warn">{missing}</span> fields {NA.toLowerCase()} — help us complete them</span>}
          </div>
          <SpecRows rows={rows} />
          {!!bike.componentSpec?.length && (
            <div className="mt-10">
              <h3 className="mb-1 text-lg font-medium tracking-tight">Component specification</h3>
              <p className="mb-3 text-xs text-subtle">As published by the manufacturer. Linked parts open their component record.</p>
              <dl className="divide-y divide-line border-y hairline">
                {bike.componentSpec.map((r, i) => {
                  const part = r.componentId ? cat.componentById.get(r.componentId) : null;
                  return (
                    <div key={`${i}-${r.label}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                      <dt className="text-muted"><TermLabel label={r.label} /></dt>
                      <dd className="text-fg">{part ? <Link href={`/components/${part.id}`} className="link-u text-lime">{r.value} →</Link> : r.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {bike.officialUrl && <a href={bike.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">Official product page <ExternalLink className="h-3.5 w-3.5" /></a>}
            <Link href={`/submit?kind=correction&ref=${bike.id}`} className="link-u text-sm text-muted hover:text-fg">Suggest a correction</Link>
          </div>
        </div>
        <div className="space-y-12">
          <div>
            <h2 className="mb-5 text-2xl font-medium tracking-tight">Strengths & trade-offs</h2>
            <ul className="space-y-3 text-sm">
              {bike.highlights.map((h) => <li key={h} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{h}</li>)}
              {bike.drawbacks.map((h) => <li key={h} className="flex gap-3 text-muted"><Minus className="mt-0.5 h-4 w-4 shrink-0 text-warn" />{h}</li>)}
              {!bike.highlights.length && !bike.drawbacks.length && <li className="text-muted">{NA}</li>}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-2xl font-medium tracking-tight">Other years & generations</h2>
            <p className="mb-4 text-xs text-subtle">Each model year is stored separately — specifications are never assumed identical across years.</p>
            {generations.length ? (
              <ul className="border-t hairline">
                {generations.map((g) => (
                  <li key={g.id}>
                    <Link href={`/bikes/${g.slug}`} className="group flex items-center justify-between border-b hairline py-3.5 text-sm">
                      <span><span className="tabular text-muted">{g.year}</span> · {g.name}{g.generation ? ` · ${g.generation}` : ""} · <span className="text-muted">{g.groupset ?? NA}</span></span>
                      <span className="flex items-center gap-3">{g.provenance.status === "discontinued" && <span className="label-tech text-warn">Discontinued</span>}<ArrowUpRight className="h-4 w-4 text-subtle group-hover:text-lime" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No other years catalogued yet.</p>}
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="container-x pt-24">
          <h2 className="mb-8 text-2xl font-medium tracking-tight">Similar {category?.name.toLowerCase()} bikes at this price</h2>
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-3">
            {similar.map((b) => <BikeTile key={b.id} bike={b} brand={cat.brandById.get(b.brandId)} />)}
          </div>
        </section>
      )}
      <div className="container-x"><DemoNotice className="mt-16" /></div>
    </>
  );
}
