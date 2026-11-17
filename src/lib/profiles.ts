import type { Build, Component, ComponentType, GarageBike } from "./types";
import type { Catalog } from "./catalog-client";
import { profileFromModel, type BikeProfile } from "./upgrade";
import { resolveSelection } from "./builds";

/** Derive an Upgrade Advisor profile from a saved custom build — every installed part is known. */
export function profileFromBuild(b: Build, byId: Map<string, Component>, label?: string): BikeProfile {
  const sel = resolveSelection(b.selection, byId);
  const f = sel.frame?.compat ?? {};
  const fk = sel.fork?.compat ?? {};
  const cs = sel.cassette?.compat ?? {};
  const sh = sel.shifters?.compat ?? {};
  const wh = sel.wheelset?.compat ?? {};
  const br = sel.brakes?.compat ?? {};
  const name = (t: ComponentType) => (sel[t] ? `${sel[t]!.manufacturer} ${sel[t]!.name}` : null);
  const installed: BikeProfile["installed"] = {};
  for (const [k, v] of Object.entries(sel)) if (v && k !== "frame" && k !== "fork") installed[k as ComponentType] = v;
  const category = b.discipline === "universal" ? "road" : b.discipline;
  return {
    label: label ?? b.name,
    category,
    groupset: sel.groupset ? `${sel.groupset.manufacturer} ${sel.groupset.name}` : null,
    priceIdr: Object.values(sel).reduce((s, c) => s + (c && c.type !== "groupset" ? c.price?.amount ?? 0 : 0), 0) || null,
    compat: {
      ...f,
      frontAxle: fk.frontAxle ?? null,
      wheelSize: wh.wheelSize ?? f.wheelSizes?.[0] ?? null,
      speeds: sh.speeds ?? cs.speeds ?? null,
      protocol: sh.protocol ?? null,
      freehub: cs.freehub ?? null,
      brakeType: br.brakeType ?? null,
      rotorMount: wh.rotorMount ?? br.rotorMount ?? null,
      chainrings: sel.crankset?.compat.chainrings ?? null,
      barClampMm: sel.stem?.compat.barClampMm ?? null,
      steererTopMm: fk.steererTopMm ?? null,
    },
    current: { groupset: name("groupset"), wheelset: name("wheelset"), tires: name("tires"), brakes: name("brakes"), drivetrain: name("cassette"), cockpit: name("handlebar"), saddle: name("saddle"), pedals: name("pedals"), seatpost: name("seatpost") },
    installed,
  };
}

export function profileFromGarage(g: GarageBike, cat: Catalog, builds: Build[]): BikeProfile | null {
  if (g.modelId) {
    const m = cat.bikeById.get(g.modelId);
    if (!m) return null;
    const p = profileFromModel(m, cat.brandById.get(m.brandId)?.name ?? "");
    return { ...p, label: `${g.nickname} — ${p.label}` };
  }
  if (g.buildId) {
    const b = builds.find((x) => x.id === g.buildId);
    return b ? profileFromBuild(b, cat.componentById, g.nickname) : null;
  }
  if (g.manual) {
    const m = g.manual;
    const disc = m.brakeType?.includes("disc");
    return {
      label: `${g.nickname} — ${m.brand} ${m.model}${m.year ? ` (${m.year})` : ""}`,
      category: m.category,
      groupset: m.groupset,
      priceIdr: g.purchasePriceIdr ?? null,
      compat: { wheelSize: m.wheelSize, wheelSizes: m.wheelSize ? [m.wheelSize] : null, brakeType: m.brakeType, brakeInterface: m.brakeType ? (disc ? "disc" : "rim") : null },
      current: { groupset: m.groupset, wheelset: m.wheelset, brakes: m.brakes, tires: null },
    };
  }
  return null;
}
