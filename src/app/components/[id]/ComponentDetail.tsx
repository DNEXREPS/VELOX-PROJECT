"use client";
import Link from "next/link";
import { ArrowLeft, Hammer } from "lucide-react";
import { useCatalog } from "@/lib/state";
import { useHydrated } from "@/lib/store";
import { checkCandidate } from "@/lib/compat";
import type { CompatAttrs, Component } from "@/lib/types";
import { ComponentGlyph } from "@/components/Glyphs";
import { CompareButton, ComponentRow, WishlistButton } from "@/components/catalog";
import { ButtonLink, CompatBadge, DemoNotice, EmptyState, Price, ProvenanceLine, SpecRows, Tag } from "@/components/ui";
import { formatWeightG, titleCase } from "@/lib/format";

const ATTR_LABEL: Partial<Record<keyof CompatAttrs, string>> = {
  bbStandard: "Bottom bracket", brakeMount: "Brake mount", brakeInterface: "Brake interface", rearAxle: "Rear axle", frontAxle: "Front axle", wheelSizes: "Wheel sizes", maxTireMm: "Max tyre width (mm)",
  seatpostDiameter: "Seatpost diameter", steerer: "Steerer / head tube", steererTopMm: "Steerer top (mm)", drivetrainSupport: "Drivetrain routing", frontDerailleurMount: "Front derailleur mount", udh: "UDH",
  maxRotorMm: "Max rotor (mm)", travelMm: "Travel (mm)", speeds: "Speeds", protocol: "Actuation system", electronic: "Electronic", chainrings: "Chainrings", maxCog: "Max cog (T)", cogRange: "Cog range",
  freehub: "Freehub required", freehubOptions: "Freehub options", spindle: "Spindle", requiresUDH: "Requires UDH frame", pedalThread: "Pedal thread", brakeType: "Brake type", rotorMount: "Rotor mount", rotorMm: "Rotor size (mm)",
  wheelSize: "Wheel size", tubeless: "Tubeless", internalRimMm: "Internal rim width (mm)", tireWidthMm: "Tyre width (mm)", barClampMm: "Bar clamp (mm)", stemSteererMm: "Steerer clamp (mm)", postDiameter: "Post diameter",
};

/** For a component, find the most relevant counterpart type to show "works with" results. */
const COUNTERPART: Partial<Record<Component["type"], Component["type"]>> = {
  frame: "crankset", fork: "wheelset", cassette: "wheelset", wheelset: "cassette", tires: "wheelset", "rear-derailleur": "cassette", crankset: "frame", seatpost: "frame", stem: "handlebar", handlebar: "stem", brakes: "wheelset", shifters: "rear-derailleur",
};

export function ComponentDetail({ id }: { id: string }) {
  const cat = useCatalog();
  const hydrated = useHydrated();
  const c = cat.componentById.get(id);
  if (!c) return <div className="container-x py-24">{hydrated ? <EmptyState title="Component not found" action={<ButtonLink href="/components" variant="secondary">Component Explorer</ButtonLink>} /> : <div className="skeleton h-96" />}</div>;

  const label = `${c.manufacturer} ${c.name}`;
  const attrs = Object.entries(c.compat).filter(([k]) => ATTR_LABEL[k as keyof CompatAttrs]).map(([k, v]) => [ATTR_LABEL[k as keyof CompatAttrs]!, typeof v === "boolean" ? (v ? "Yes" : "No") : v] as [string, unknown]);
  const kitParts = c.kit ? Object.values(c.kit).map((x) => cat.componentById.get(x!)).filter(Boolean) as Component[] : [];
  const usedIn = cat.components.filter((g) => g.kit && Object.values(g.kit).includes(c.id));
  const counterpartType = COUNTERPART[c.type];
  const worksWith = counterpartType
    ? cat.components.filter((x) => x.type === counterpartType).map((x) => ({ x, r: checkCandidate({ [c.type]: c }, x) })).filter(({ r }) => r.status !== "empty").sort((a, b) => ["compatible", "potential", "insufficient", "incompatible"].indexOf(a.r.status) - ["compatible", "potential", "insufficient", "incompatible"].indexOf(b.r.status)).slice(0, 8)
    : [];

  return (
    <>
      <div className="container-x pt-8"><Link href="/components" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Component Explorer</Link></div>
      <section className="container-x grid gap-12 pb-14 pt-10 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
        <div className="relative flex aspect-square max-h-[460px] items-center justify-center overflow-hidden border hairline bg-gradient-to-b from-ink-900 to-ink-950">
          <div className="grid-bg absolute inset-0 opacity-70" />
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt={label} className="relative h-full w-full object-contain p-8" />
          ) : (
            <>
              <ComponentGlyph type={c.type} className="relative h-1/2 w-1/2 text-fg/80" />
              <p className="label-tech absolute bottom-3 left-4">Technical glyph — not product photography</p>
            </>
          )}
        </div>
        <div className="animate-fade-up">
          <Link href={`/components?mfr=${c.manufacturerSlug}`} className="eyebrow link-u">{c.manufacturer}</Link>
          <h1 className="display mt-4 text-[clamp(2.2rem,4.6vw,3.8rem)]">{c.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2"><Tag>{titleCase(c.type)}</Tag><Tag>{titleCase(c.tier)}</Tag>{c.discipline.map((d) => <Tag key={d}>{titleCase(d)}</Tag>)}{c.series && <Tag>{c.series}</Tag>}</div>
          {!!c.benefits?.length && <ul className="mt-6 space-y-1.5 text-[15px] text-muted">{c.benefits.map((b) => <li key={b}>— {b}</li>)}</ul>}
          <div className="mt-8 grid grid-cols-2 border-y hairline">
            <div className="border-r hairline py-5 pr-5"><p className="label-tech mb-1">Price</p><Price price={c.price} className="text-xl" /></div>
            <div className="py-5 pl-5"><p className="label-tech mb-1">Weight</p><p className="tabular text-xl font-medium">{formatWeightG(c.weightG)}</p></div>
          </div>
          {c.price?.note && <p className="mt-2 text-xs text-subtle">{c.price.note}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {c.type !== "accessory" && <ButtonLink href={`/build?add=${c.id}`}><Hammer className="h-4 w-4" /> Use in a build</ButtonLink>}
            <CompareButton kind="component" id={c.id} label={label} className="h-10 px-4 text-sm" />
            <WishlistButton kind="component" refId={c.id} label={label} className="h-10 w-10" />
          </div>
          <div className="mt-8"><ProvenanceLine p={c.provenance} detailed /></div>
        </div>
      </section>

      <section className="container-x grid gap-14 border-t hairline pt-14 lg:grid-cols-2">
        <div>
          <h2 className="mb-5 text-2xl font-medium tracking-tight">Specifications</h2>
          <SpecRows rows={[["Manufacturer", c.manufacturer], ["Product", c.name], ["Category", titleCase(c.type)], ["Material", c.material], ["Weight", c.weightG != null ? formatWeightG(c.weightG) : null], ...Object.entries(c.specs), ["Official product page", c.officialUrl]]} />
        </div>
        <div>
          <h2 className="mb-5 text-2xl font-medium tracking-tight">Compatibility data</h2>
          {attrs.length ? <SpecRows rows={attrs} /> : <p className="text-sm text-muted">No compatibility attributes catalogued for this part.</p>}
          <Link href={`/submit?kind=correction&ref=${c.id}`} className="mt-4 inline-block text-sm text-muted link-u hover:text-fg">Suggest a correction</Link>
        </div>
      </section>

      {c.type === "wheelset" && (
        <section className="container-x pt-16">
          <h2 className="mb-5 text-2xl font-medium tracking-tight">Wheelset specification</h2>
          <div className="grid gap-x-14 lg:grid-cols-2">
            <SpecRows rows={[["Manufacturer", c.manufacturer], ["Model", c.name], ["Model year", c.modelYear], ["Discipline", c.discipline.map(titleCase)], ["Rim material", c.wheel?.rimMaterial], ["Rim depth", c.wheel?.rimDepthMm != null ? `${c.wheel.rimDepthMm} mm` : null], ["Internal width", c.wheel?.internalWidthMm != null ? `${c.wheel.internalWidthMm} mm` : null], ["External width", c.wheel?.externalWidthMm != null ? `${c.wheel.externalWidthMm} mm` : null], ["Tubeless", c.compat.tubeless == null ? null : c.compat.tubeless ? "Yes" : "No"]]} />
            <SpecRows rows={[["Brake type", c.compat.brakeInterface === "disc" ? `Disc${c.compat.rotorMount ? ` (${c.compat.rotorMount})` : ""}` : c.compat.brakeInterface === "rim" ? "Rim" : null], ["Hub", [c.wheel?.hubManufacturer, c.wheel?.hubModel].filter(Boolean).join(" ") || null], ["Freehub options", c.compat.freehubOptions], ["Axles (front / rear)", c.compat.frontAxle || c.compat.rearAxle ? `${c.compat.frontAxle ?? "?"} / ${c.compat.rearAxle ?? "?"}` : null], ["Spoke count", c.wheel?.spokeCount], ["Spokes", c.wheel?.spokeType], ["Bearings", c.wheel?.bearings], ["Max. system weight", c.wheel?.maxSystemWeightKg != null ? `${c.wheel.maxSystemWeightKg} kg` : null], ["Warranty", c.wheel?.warranty], ["Weight", c.weightG != null ? formatWeightG(c.weightG) : null]]} />
          </div>
        </section>
      )}
      {c.bearing && (
        <section className="container-x pt-16">
          <h2 className="mb-5 text-2xl font-medium tracking-tight">Bearing dimensions</h2>
          <SpecRows rows={[["Designation", c.bearing.designation], ["Inner Ø × Outer Ø × Width", `${c.bearing.innerMm} × ${c.bearing.outerMm} × ${c.bearing.widthMm} mm`], ["Type", titleCase(c.bearing.kind)], ["Contact angle", c.bearing.contactAngle], ["Sealing", c.bearing.sealing ?? "Depends on the specific part (2RS, LLB, open…)"], ["Typical bicycle use", c.bearing.typicalUse]]} />
          <Link href="/mechanic?tab=bearing" className="mt-4 inline-block text-sm text-lime link-u">Identify a bearing from measurements →</Link>
        </section>
      )}
      {kitParts.length > 0 && (
        <section className="container-x pt-16"><h2 className="mb-4 text-2xl font-medium tracking-tight">Parts in this groupset</h2><div className="border-t hairline">{kitParts.map((p) => <ComponentRow key={p.id} c={p} />)}</div></section>
      )}
      {usedIn.length > 0 && (
        <section className="container-x pt-16"><h2 className="mb-4 text-2xl font-medium tracking-tight">Part of</h2><div className="border-t hairline">{usedIn.map((p) => <ComponentRow key={p.id} c={p} />)}</div></section>
      )}
      {worksWith.length > 0 && (
        <section className="container-x pt-16">
          <h2 className="mb-1 text-2xl font-medium tracking-tight">Checked against {titleCase(counterpartType!)}s</h2>
          <p className="mb-4 text-sm text-muted">Automatic compatibility check with catalogue {titleCase(counterpartType!).toLowerCase()}s.</p>
          <ul className="border-t hairline">
            {worksWith.map(({ x, r }) => (
              <li key={x.id} className="flex flex-col gap-1 border-b hairline py-3 md:flex-row md:items-center md:gap-6">
                <CompatBadge status={r.status as "compatible"} className="w-fit md:w-44" />
                <Link href={`/components/${x.id}`} className="text-sm link-u md:w-80">{x.manufacturer} {x.name}</Link>
                <span className="text-xs text-muted">{r.checks.find((k) => k.status === r.status)?.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="container-x"><DemoNotice className="mt-16" /></div>
    </>
  );
}
