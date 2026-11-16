/**
 * VELOX compatibility engine.
 *
 * Pure functions: given a set of selected components (one per slot) it returns a list of
 * checks. Each check is one of:
 *   compatible    — the technical data we hold agrees
 *   potential     — works with an adapter / shim / caveat
 *   incompatible  — the data says it will not work
 *   insufficient  — a required value is missing; we never assume compatibility
 */
import type { BBStandard, Component, ComponentType, CrankSpindle, Freehub, WheelSize } from "./types";

export type CompatStatus = "compatible" | "potential" | "incompatible" | "insufficient";

export interface CompatCheck {
  id: string;
  label: string;
  status: CompatStatus;
  message: string;
  slots: ComponentType[];
}

export interface CompatReport {
  checks: CompatCheck[];
  overall: CompatStatus | "empty";
  bySlot: Partial<Record<ComponentType, CompatStatus>>;
  counts: Record<CompatStatus, number>;
}

export type Selection = Partial<Record<ComponentType, Component | undefined>>;

const SEVERITY: Record<CompatStatus, number> = { compatible: 0, potential: 1, insufficient: 2, incompatible: 3 };
export const worst = (a: CompatStatus, b: CompatStatus): CompatStatus => (SEVERITY[a] >= SEVERITY[b] ? a : b);

export const STATUS_TEXT: Record<CompatStatus, string> = {
  compatible: "Compatible",
  potential: "Potentially Compatible",
  incompatible: "Incompatible",
  insufficient: "Insufficient Information",
};

/** ISO bead-seat diameters: 700c and 29" share 622 mm; 650b and 27.5" share 584 mm. */
const ISO: Record<WheelSize, number> = { "700c": 622, "29": 622, "650b": 584, "27.5": 584, "26": 559, "24": 507, "20": 406, "16": 349, "451": 451, "12": 203 };
const sameWheel = (a: WheelSize, b: WheelSize) => ISO[a] === ISO[b];

const missing = (id: string, label: string, slots: ComponentType[], what: string[]): CompatCheck => ({
  id,
  label,
  slots,
  status: "insufficient",
  message: `Missing ${what.join(", ")}. VELOX will not assume compatibility — verify manually with the manufacturer.`,
});

const ok = (id: string, label: string, slots: ComponentType[], message: string): CompatCheck => ({ id, label, slots, status: "compatible", message });
const maybe = (id: string, label: string, slots: ComponentType[], message: string): CompatCheck => ({ id, label, slots, status: "potential", message });
const bad = (id: string, label: string, slots: ComponentType[], message: string): CompatCheck => ({ id, label, slots, status: "incompatible", message });

/* -------------------------------- matrices -------------------------------- */

type S = CompatStatus;
const C: S = "compatible";
const P: S = "potential";
const I: S = "incompatible";

const BB_MATRIX: Record<BBStandard, Partial<Record<CrankSpindle, S>>> = {
  "BSA-68": { "24mm": C, DUB: C, "30mm": P, "square-taper": C, "Campagnolo-UT": C },
  "BSA-73": { "24mm": C, DUB: C, "30mm": P, "square-taper": C },
  "BSA-83": { "24mm": C, DUB: C, "30mm": P },
  T47: { "24mm": C, DUB: C, "30mm": C, "square-taper": P, "Campagnolo-UT": P },
  PF86: { "24mm": C, DUB: C, "30mm": I, "square-taper": I, "Campagnolo-UT": P },
  BB86: { "24mm": C, DUB: C, "30mm": I, "square-taper": I, "Campagnolo-UT": P },
  BB92: { "24mm": C, DUB: C, "30mm": I, "square-taper": I },
  BB386EVO: { "24mm": P, DUB: C, "30mm": C, "square-taper": I, "Campagnolo-UT": P },
  PF30: { "24mm": P, DUB: C, "30mm": C, "square-taper": I, "Campagnolo-UT": P },
  BB30: { "24mm": P, DUB: C, "30mm": C, "square-taper": I, "Campagnolo-UT": P },
  BBright: { "24mm": P, DUB: C, "30mm": C, "square-taper": I },
  "Mid-BMX": { "19mm-BMX": C, "22mm-BMX": C },
  "Euro-BMX": { "19mm-BMX": C, "22mm-BMX": C },
  "Integrated-Motor": { motor: C },
};

const splitOpts = (v: string) => v.split("|").map((s) => s.trim());

/* --------------------------------- rules ---------------------------------- */

type Rule = (s: Selection) => CompatCheck | CompatCheck[] | null;

const ruleSteerer: Rule = ({ frame, fork }) => {
  if (!frame || !fork) return null;
  const id = "steerer", label = "Fork & headset standard", slots: ComponentType[] = ["frame", "fork"];
  const a = frame.compat.steerer, b = fork.compat.steerer;
  if (!a || !b) return missing(id, label, slots, [!a ? "frame head tube standard" : "", !b ? "fork steerer standard" : ""].filter(Boolean));
  if (a === b) return ok(id, label, slots, `Both use a ${a} steerer/head tube.`);
  if (a === "tapered" && b === "straight-1-1/8") return maybe(id, label, slots, "Straight 1-1/8\" fork in a tapered head tube needs a reducer headset (1.5\" → 1-1/8\" lower cup).");
  return bad(id, label, slots, `Frame head tube is ${a} but the fork steerer is ${b}.`);
};

const ruleFrameForkWheel: Rule = ({ frame, fork }) => {
  if (!frame || !fork) return null;
  const id = "frame-fork-wheel", label = "Frame & fork wheel size", slots: ComponentType[] = ["frame", "fork"];
  const a = frame.compat.wheelSizes, b = fork.compat.wheelSizes;
  if (!a?.length || !b?.length) return missing(id, label, slots, ["supported wheel sizes"]);
  const common = a.filter((x) => b.some((y) => sameWheel(x, y)));
  return common.length ? ok(id, label, slots, `Shared wheel size: ${common.join(", ")}.`) : bad(id, label, slots, `Frame takes ${a.join("/")} but fork takes ${b.join("/")}.`);
};

const ruleFrameForkBrake: Rule = ({ frame, fork }) => {
  if (!frame || !fork) return null;
  const id = "frame-fork-brake", label = "Frame & fork brake interface", slots: ComponentType[] = ["frame", "fork"];
  const a = frame.compat.brakeInterface, b = fork.compat.brakeInterface;
  if (!a || !b) return missing(id, label, slots, ["brake interface"]);
  if (a === b) return ok(id, label, slots, `Both are ${a === "none" ? "brakeless" : a + " brake"} designs.`);
  if (a === "none" || b === "none") return maybe(id, label, slots, "One part is brakeless; check that removable brake mounts are available where you need a brake.");
  return bad(id, label, slots, `Frame uses ${a} brakes but the fork uses ${b} brakes.`);
};

const ruleBB: Rule = ({ frame, crankset }) => {
  if (!frame || !crankset) return null;
  const id = "bottom-bracket", label = "Bottom bracket & crank spindle", slots: ComponentType[] = ["frame", "crankset"];
  const bb = frame.compat.bbStandard, sp = crankset.compat.spindle;
  if (!bb || !sp) return missing(id, label, slots, [!bb ? "frame BB standard" : "", !sp ? "crank spindle" : ""].filter(Boolean));
  const st = BB_MATRIX[bb]?.[sp] ?? I;
  if (st === C) return ok(id, label, slots, `${sp} spindle fits a ${bb} shell with the matching bottom bracket.`);
  if (st === P) return maybe(id, label, slots, `${sp} spindle in a ${bb} shell needs a conversion bottom bracket — check availability.`);
  return bad(id, label, slots, `${sp} crank spindles cannot be fitted to a ${bb} shell.`);
};

function brakeMountCheck(holder: Component, brakes: Component, where: "frame" | "fork"): CompatCheck {
  const id = `brake-mount-${where}`, label = where === "frame" ? "Rear brake mount" : "Front brake mount", slots: ComponentType[] = [where, "brakes"];
  const iface = holder.compat.brakeInterface, mount = holder.compat.brakeMount;
  const bIface = brakes.compat.brakeInterface, bMount = brakes.compat.brakeMount;
  if (!iface || !bIface) return missing(id, label, slots, ["brake interface"]);
  if (iface === "none") return maybe(id, label, slots, `The ${where} is designed brakeless. Fit only if removable brake mounts are supplied.`);
  if (iface !== bIface) return bad(id, label, slots, `The ${where} needs ${iface} brakes; selected brakes are ${bIface}.`);
  if (!mount || !bMount) return missing(id, label, slots, ["brake mount type"]);
  if (mount === bMount) return ok(id, label, slots, `${mount} on both ${where} and caliper.`);
  if (bMount === "flat-mount" && mount === "post-mount") return maybe(id, label, slots, "Flat-mount caliper on a post-mount " + where + " requires a flat-to-post adapter.");
  if (bMount === "post-mount" && mount === "flat-mount") return bad(id, label, slots, `Post-mount calipers do not bolt onto a flat-mount ${where}.`);
  return bad(id, label, slots, `${bMount} brakes do not fit a ${mount} ${where}.`);
}
const ruleBrakeMounts: Rule = ({ frame, fork, brakes }) => {
  if (!brakes) return null;
  const out: CompatCheck[] = [];
  if (frame) out.push(brakeMountCheck(frame, brakes, "frame"));
  if (fork) out.push(brakeMountCheck(fork, brakes, "fork"));
  return out;
};

const ruleLeverCaliper: Rule = ({ shifters, brakes }) => {
  if (!shifters || !brakes) return null;
  const lever = shifters.compat.brakeType;
  if (lever == null) return null; // flat-bar shifters: brakes carry their own levers
  const id = "lever-caliper", label = "Brake lever & caliper", slots: ComponentType[] = ["shifters", "brakes"];
  const cal = brakes.compat.brakeType;
  if (!cal) return missing(id, label, slots, ["caliper type"]);
  if (lever === cal) return ok(id, label, slots, `Integrated ${lever} levers match the calipers.`);
  if (lever === "hydraulic-disc" || cal === "hydraulic-disc") return bad(id, label, slots, "Hydraulic and cable-actuated brakes cannot be mixed between lever and caliper.");
  if (lever === "rim-caliper" && cal === "mechanical-disc") {
    const roadPull = brakes.discipline.some((d) => d === "road" || d === "gravel");
    return roadPull ? ok(id, label, slots, "Road-pull cable levers work with road mechanical disc calipers.") : maybe(id, label, slots, "Road levers with MTB (long-pull) mechanical calipers need a pull-ratio adapter (e.g. a travel agent).");
  }
  if (cal === "v-brake") return maybe(id, label, slots, "V-brakes need long-pull levers; drop-bar levers require a pull-ratio adapter or mini-V brakes.");
  return bad(id, label, slots, `${lever} levers are not designed for ${cal} calipers.`);
};

const ruleRotor: Rule = ({ brakes, wheelset }) => {
  if (!brakes || !wheelset) return null;
  const id = "rotor", label = "Brake & wheel interface", slots: ComponentType[] = ["brakes", "wheelset"];
  const bI = brakes.compat.brakeInterface, wI = wheelset.compat.brakeInterface;
  if (!bI || !wI) return missing(id, label, slots, ["brake interface"]);
  if (bI !== wI) return bad(id, label, slots, bI === "disc" ? "Disc brakes need hubs with rotor mounts — these are rim-brake wheels." : "Rim brakes need a braking track — these wheels are disc-specific.");
  if (bI !== "disc") return ok(id, label, slots, "Rim brakes with rim-brake wheels.");
  const b = brakes.compat.rotorMount, w = wheelset.compat.rotorMount;
  if (!b || !w) return missing(id, label, slots, [!b ? "rotor mount" : "", !w ? "hub rotor interface" : ""].filter(Boolean));
  if (b === w) return ok(id, label, slots, `${b} rotors on ${w} hubs.`);
  if (b === "6-bolt" && w === "centerlock") return maybe(id, label, slots, "6-bolt rotors on Center Lock hubs need an adapter.");
  return bad(id, label, slots, "Center Lock rotors cannot be mounted on 6-bolt hubs.");
};

const ruleRotorSize: Rule = ({ frame, brakes }) => {
  if (!frame || !brakes || brakes.compat.brakeInterface !== "disc") return null;
  const max = frame.compat.maxRotorMm, r = brakes.compat.rotorMm;
  if (max == null || r == null) return null;
  const id = "rotor-size", label = "Rotor size", slots: ComponentType[] = ["frame", "brakes"];
  return r <= max ? ok(id, label, slots, `${r} mm rotors within the ${max} mm frame limit.`) : bad(id, label, slots, `${r} mm rotors exceed the frame's ${max} mm maximum.`);
};

function axleCheck(holder: Component, wheel: Component, end: "rear" | "front"): CompatCheck {
  const slot: ComponentType = end === "rear" ? "frame" : "fork";
  const id = `axle-${end}`, label = end === "rear" ? "Rear axle / hub spacing" : "Front axle / hub spacing", slots: ComponentType[] = [slot, "wheelset"];
  const need = end === "rear" ? holder.compat.rearAxle : holder.compat.frontAxle;
  const have = end === "rear" ? wheel.compat.rearAxle : wheel.compat.frontAxle;
  if (!need || !have) return missing(id, label, slots, [!need ? `${slot} axle standard` : "", !have ? "hub axle standard" : ""].filter(Boolean));
  const opts = splitOpts(have);
  if (opts.includes(need)) return ok(id, label, slots, `Hub supports ${need}.`);
  if ((need === "130QR" && opts.includes("135QR")) || (need === "135QR" && opts.includes("130QR"))) return maybe(id, label, slots, `130/135 mm QR mismatch — steel frames can sometimes be spaced; otherwise the hub must be re-spaced.`);
  return bad(id, label, slots, `${slot === "frame" ? "Frame" : "Fork"} needs ${need}; hub offers ${opts.join(" / ")}.`);
}

const ruleWheelFrame: Rule = ({ frame, fork, wheelset }) => {
  if (!wheelset) return null;
  const out: CompatCheck[] = [];
  const ws = wheelset.compat.wheelSize;
  for (const holder of [frame, fork]) {
    if (!holder) continue;
    const slot = holder.type as ComponentType;
    const id = `wheel-size-${slot}`, label = `Wheel size (${slot})`, slots: ComponentType[] = [slot, "wheelset"];
    const sizes = holder.compat.wheelSizes;
    if (!ws || !sizes?.length) out.push(missing(id, label, slots, ["wheel size"]));
    else if (sizes.some((s) => sameWheel(s, ws))) out.push(ok(id, label, slots, `${ws} wheels fit.`));
    else out.push(bad(id, label, slots, `${slot === "frame" ? "Frame" : "Fork"} is designed for ${sizes.join("/")}, not ${ws}.`));
    const hi = holder.compat.brakeInterface, wi = wheelset.compat.brakeInterface;
    if (hi && wi && hi !== "none" && wi !== "none" && hi !== wi) out.push(bad(`wheel-brake-${slot}`, `Brake interface (${slot})`, slots, `${slot === "frame" ? "Frame" : "Fork"} uses ${hi} brakes; these are ${wi}-brake wheels.`));
  }
  if (frame) out.push(axleCheck(frame, wheelset, "rear"));
  if (fork) out.push(axleCheck(fork, wheelset, "front"));
  return out;
};

const ruleFreehub: Rule = ({ cassette, wheelset }) => {
  if (!cassette || !wheelset) return null;
  const id = "freehub", label = "Freehub body", slots: ComponentType[] = ["cassette", "wheelset"];
  const need = cassette.compat.freehub, opts = wheelset.compat.freehubOptions;
  if (!need || !opts?.length) return missing(id, label, slots, [!need ? "cassette freehub" : "", !opts?.length ? "available freehub bodies" : ""].filter(Boolean));
  if (opts.includes(need)) {
    const sp = cassette.compat.speeds ?? 0;
    if (need === "HG-road" && sp > 0 && sp < 11) return ok(id, label, slots, `HG road freehub available; ${sp}-speed cassettes need a 1.85 mm spacer on an 11-speed body.`);
    return ok(id, label, slots, `${need} freehub body available for this wheelset.`);
  }
  const alt: Partial<Record<Freehub, Freehub>> = { XD: "XDR", XDR: "XD" };
  if (need === "XD" && opts.includes("XDR")) return maybe(id, label, slots, "XD cassette on an XDR body requires the 1.85 mm spacer.");
  if (need === "HG-MTB" && opts.includes("HG-road")) return maybe(id, label, slots, "MTB HG cassettes generally fit an 11-speed HG road body with a spacer — verify body length.");
  if (need === "HG-road" && opts.includes("HG-MTB") && (cassette.compat.speeds ?? 12) < 11) return ok(id, label, slots, "8–10-speed road cassettes fit an HG MTB body.");
  void alt;
  return bad(id, label, slots, `Cassette needs a ${need} freehub; wheelset offers ${opts.join(", ")}.`);
};

const ruleSpeeds: Rule = (s) => {
  const out: CompatCheck[] = [];
  const pairs: Array<[ComponentType, ComponentType, CompatStatus]> = [
    ["shifters", "rear-derailleur", I],
    ["rear-derailleur", "cassette", I],
    ["cassette", "chain", I],
    ["shifters", "front-derailleur", P],
    ["chain", "crankset", P],
  ];
  for (const [a, b, sev] of pairs) {
    const A = s[a], B = s[b];
    if (!A || !B) continue;
    const id = `speeds-${a}-${b}`, label = "Drivetrain speeds", slots: ComponentType[] = [a, b];
    const x = A.compat.speeds, y = B.compat.speeds;
    if (x == null || y == null) { out.push(missing(id, label, slots, ["speed count"])); continue; }
    if (x === y) { out.push(ok(id, label, slots, `${A.name} and ${B.name} are both ${x}-speed.`)); continue; }
    if ((x === 1) !== (y === 1)) { out.push(bad(id, label, slots, "Single-speed and geared drivetrain parts are mixed.")); continue; }
    if (sev === P && Math.abs(x - y) <= 1) out.push(maybe(id, label, slots, `${x}-speed vs ${y}-speed — usually works but shifting quality may suffer.`));
    else out.push(bad(id, label, slots, `${A.name} is ${x}-speed but ${B.name} is ${y}-speed.`));
  }
  return out;
};

const ruleProtocol: Rule = ({ shifters, "rear-derailleur": rd, "front-derailleur": fd }) => {
  const out: CompatCheck[] = [];
  if (shifters && rd) {
    const id = "protocol-rd", label = "Shifter & rear derailleur system", slots: ComponentType[] = ["shifters", "rear-derailleur"];
    const a = shifters.compat.protocol, b = rd.compat.protocol;
    if (!a || !b || a === "unknown" || b === "unknown") out.push(missing(id, label, slots, ["actuation system / pull ratio"]));
    else if (a === b) out.push(ok(id, label, slots, `Same actuation system (${a}).`));
    else out.push(bad(id, label, slots, `Shifter system (${a}) does not match the derailleur (${b}) — pull ratio or electronic protocol differ.`));
  }
  if (shifters && fd) {
    const id = "protocol-fd", label = "Shifter & front derailleur", slots: ComponentType[] = ["shifters", "front-derailleur"];
    const a = shifters.compat, b = fd.compat;
    if (a.electronic == null || b.electronic == null) out.push(missing(id, label, slots, ["actuation type"]));
    else if (a.electronic !== b.electronic) out.push(bad(id, label, slots, "Electronic and mechanical front shifting cannot be mixed."));
    else if (a.protocol === b.protocol) out.push(ok(id, label, slots, "Front shifting system matches."));
    else out.push(maybe(id, label, slots, "Front derailleur from a different system — cable pull may differ; verify."));
  }
  return out;
};

const ruleCapacity: Rule = ({ "rear-derailleur": rd, cassette }) => {
  if (!rd || !cassette) return null;
  const id = "rd-capacity", label = "Derailleur capacity", slots: ComponentType[] = ["rear-derailleur", "cassette"];
  const max = rd.compat.maxCog, big = cassette.compat.maxCog;
  if (max == null || big == null) return missing(id, label, slots, ["max cog size"]);
  if (big <= max) return ok(id, label, slots, `${big}T largest cog within the ${max}T derailleur limit.`);
  if (big - max <= 2) return maybe(id, label, slots, `${big}T cog exceeds the rated ${max}T by ${big - max}T — may work with B-tension adjustment; outside manufacturer spec.`);
  return bad(id, label, slots, `${big}T cog exceeds the derailleur's ${max}T maximum.`);
};

const ruleChainrings: Rule = ({ crankset, "front-derailleur": fd, shifters }) => {
  if (!crankset) return null;
  const id = "chainrings", label = "Chainrings & front shifting", slots: ComponentType[] = ["crankset", "front-derailleur"];
  const n = crankset.compat.chainrings;
  if (n == null) return missing(id, label, slots, ["chainring count"]);
  if (n === 1 && fd) return bad(id, label, slots, "A 1x crankset has no front shifting — remove the front derailleur.");
  if (n > 1 && !fd) return maybe(id, label, slots, `${n}x crankset selected without a front derailleur.`);
  if (n > 1 && fd) {
    const cap = fd.compat.chainrings;
    if (cap == null) return missing(id, label, slots, ["front derailleur chainring capacity"]);
    if (cap < n) return bad(id, label, slots, `${cap}x front derailleur cannot shift a ${n}x crankset.`);
    if (shifters && shifters.compat.chainrings != null && shifters.compat.chainrings < n) return maybe(id, label, ["crankset", "shifters"], `Shifter set is designed for ${shifters.compat.chainrings}x — a left-hand shifter for ${n}x is needed.`);
    return ok(id, label, slots, `${n}x crankset with matching front derailleur.`);
  }
  return ok(id, label, ["crankset"], "1x drivetrain — no front derailleur needed.");
};

const ruleFDMount: Rule = ({ frame, "front-derailleur": fd }) => {
  if (!frame || !fd) return null;
  const id = "fd-mount", label = "Front derailleur mount", slots: ComponentType[] = ["frame", "front-derailleur"];
  const f = frame.compat.frontDerailleurMount, d = fd.compat.frontDerailleurMount;
  if (!f || !d) return missing(id, label, slots, ["front derailleur mount"]);
  if (f === "none") return bad(id, label, slots, "Frame has no front derailleur mount (1x-only).");
  if (f === d) return ok(id, label, slots, `${d} front derailleur mount.`);
  if (d === "braze-on" && f === "clamp") return maybe(id, label, slots, "Braze-on derailleur on a round seat tube needs a clamp band adapter.");
  return bad(id, label, slots, `${d} derailleur does not fit a ${f} frame mount.`);
};

const ruleElectronic: Rule = ({ frame, shifters, "rear-derailleur": rd, "front-derailleur": fd }) => {
  if (!frame) return null;
  const parts = [shifters, rd, fd].filter(Boolean) as Component[];
  if (!parts.length) return null;
  const id = "electronic", label = "Shifting system routing", slots: ComponentType[] = ["frame", ...parts.map((p) => p.type)];
  const sup = frame.compat.drivetrainSupport;
  const electronic = parts.some((p) => p.compat.electronic);
  const wired = parts.some((p) => p.compat.protocol?.startsWith("shimano-di2"));
  if (!sup?.length) return missing(id, label, slots, ["frame drivetrain routing support"]);
  if (!electronic) {
    return sup.includes("mechanical") ? ok(id, label, slots, "Frame supports mechanical cable routing.") : bad(id, label, slots, "Frame is electronic-only — no routing for mechanical shift cables.");
  }
  if (wired) {
    return sup.includes("electronic-wired") ? ok(id, label, slots, "Frame supports internal Di2 wiring and battery.") : bad(id, label, slots, "Shimano Di2 needs internal wire routing and a battery mount; this frame lists mechanical routing only.");
  }
  return ok(id, label, slots, "Wireless electronic shifting needs no frame routing.");
};

const ruleUDH: Rule = ({ frame, "rear-derailleur": rd }) => {
  if (!frame || !rd || !rd.compat.requiresUDH) return null;
  const id = "udh", label = "Universal Derailleur Hanger", slots: ComponentType[] = ["frame", "rear-derailleur"];
  const u = frame.compat.udh;
  if (u == null) return missing(id, label, slots, ["UDH status of the frame"]);
  return u ? ok(id, label, slots, "Frame uses UDH — direct-mount Transmission derailleur fits.") : bad(id, label, slots, "This derailleur mounts only to a UDH frame.");
};

const ruleTireWheel: Rule = ({ tires, wheelset }) => {
  if (!tires || !wheelset) return null;
  const out: CompatCheck[] = [];
  const slots: ComponentType[] = ["tires", "wheelset"];
  const t = tires.compat.wheelSize, w = wheelset.compat.wheelSize;
  if (!t || !w) out.push(missing("tire-size", "Tyre & rim diameter", slots, ["wheel diameter"]));
  else if (sameWheel(t, w)) out.push(ok("tire-size", "Tyre & rim diameter", slots, `${t} tyre on ${w} rim (ISO ${ISO[w]}).`));
  else out.push(bad("tire-size", "Tyre & rim diameter", slots, `${t} tyre does not fit a ${w} rim.`));
  if (tires.compat.tubeless && wheelset.compat.tubeless === false) out.push(maybe("tubeless", "Tubeless setup", slots, "Tubeless-ready tyre on a non-tubeless rim — run it with an inner tube."));
  const rim = wheelset.compat.internalRimMm, width = tires.compat.tireWidthMm;
  if (rim && width) {
    if (rim > width * 0.9) out.push(maybe("rim-width", "Tyre / rim width ratio", slots, `${width} mm tyre is narrow for a ${rim} mm internal rim — check the rim maker's minimum tyre width.`));
    else if (rim < width * 0.3) out.push(maybe("rim-width", "Tyre / rim width ratio", slots, `${width} mm tyre on a ${rim} mm internal rim may feel unstable at low pressure.`));
  }
  return out;
};

const ruleClearance: Rule = ({ frame, fork, tires }) => {
  if (!tires || (!frame && !fork)) return null;
  const id = "clearance", label = "Tyre clearance", slots: ComponentType[] = ["tires", ...(frame ? ["frame" as const] : []), ...(fork ? ["fork" as const] : [])];
  const w = tires.compat.tireWidthMm;
  const limits = [frame?.compat.maxTireMm, fork?.compat.maxTireMm].filter((x): x is number => x != null);
  if (w == null || !limits.length) return missing(id, label, slots, [w == null ? "tyre width" : "frame/fork maximum tyre width"]);
  const max = Math.min(...limits);
  const sizes = [frame?.compat.wheelSizes, fork?.compat.wheelSizes].flat().filter(Boolean) as WheelSize[];
  const tw = tires.compat.wheelSize;
  if (tw && sizes.length && !sizes.some((s) => sameWheel(s, tw))) return bad(id, label, slots, `${tw} tyres are not a supported wheel size for this frame/fork.`);
  if (w <= max - 2) return ok(id, label, slots, `${w} mm tyre within the ${max} mm clearance.`);
  if (w <= max) return maybe(id, label, slots, `${w} mm tyre is at the ${max} mm limit — real width varies with rim width; check for mud clearance.`);
  return bad(id, label, slots, `${w} mm tyre exceeds the ${max} mm maximum clearance.`);
};

const ruleSeatpost: Rule = ({ frame, seatpost }) => {
  if (!frame || !seatpost) return null;
  const id = "seatpost", label = "Seatpost diameter", slots: ComponentType[] = ["frame", "seatpost"];
  const f = frame.compat.seatpostDiameter, p = seatpost.compat.postDiameter;
  if (!f || !p) return missing(id, label, slots, [!f ? "frame seat tube diameter" : "", !p ? "seatpost diameter" : ""].filter(Boolean));
  if (f === p) return ok(id, label, slots, f.startsWith("aero:") ? "Matching proprietary seatpost." : `${p} mm post in a ${f} mm seat tube.`);
  if (f.startsWith("aero:")) return bad(id, label, slots, "This frame uses a proprietary seatpost; only the matching post fits.");
  if (p.startsWith("aero:")) return bad(id, label, slots, "Proprietary seatpost cannot be used in a round seat tube.");
  const fn = parseFloat(f), pn = parseFloat(p);
  if (pn < fn) return maybe(id, label, slots, `${p} mm post in a ${f} mm seat tube requires a shim.`);
  return bad(id, label, slots, `${p} mm post is too large for a ${f} mm seat tube.`);
};

const ruleStem: Rule = ({ fork, stem, handlebar }) => {
  const out: CompatCheck[] = [];
  if (fork && stem) {
    const id = "stem-steerer", label = "Stem & steerer", slots: ComponentType[] = ["fork", "stem"];
    const a = fork.compat.steererTopMm, b = stem.compat.stemSteererMm;
    if (a == null || b == null) out.push(missing(id, label, slots, ["steerer clamp diameter"]));
    else if (a === b) out.push(ok(id, label, slots, `${b} mm steerer clamp.`));
    else out.push(bad(id, label, slots, `Stem clamps ${b} mm; steerer is ${a} mm.`));
  }
  if (stem && handlebar) {
    const id = "bar-clamp", label = "Handlebar clamp", slots: ComponentType[] = ["stem", "handlebar"];
    const a = stem.compat.barClampMm, b = handlebar.compat.barClampMm;
    if (a == null || b == null) out.push(missing(id, label, slots, ["bar clamp diameter"]));
    else if (a === b) out.push(ok(id, label, slots, `${a} mm bar clamp.`));
    else if (b < a) out.push(maybe(id, label, slots, `${b} mm bar in a ${a} mm stem needs a shim.`));
    else out.push(bad(id, label, slots, `${b} mm handlebar will not fit a ${a} mm stem clamp.`));
  }
  return out;
};

const rulePedals: Rule = ({ crankset, pedals }) => {
  if (!crankset || !pedals) return null;
  const id = "pedal-thread", label = "Pedal thread", slots: ComponentType[] = ["crankset", "pedals"];
  const a = crankset.compat.pedalThread, b = pedals.compat.pedalThread;
  if (!a || !b) return missing(id, label, slots, ["pedal thread"]);
  return a === b ? ok(id, label, slots, `${a}" pedal thread.`) : bad(id, label, slots, `Crank uses ${a}" threads; pedals are ${b}".`);
};

const RULES: Rule[] = [
  ruleSteerer, ruleFrameForkWheel, ruleFrameForkBrake, ruleBB, ruleBrakeMounts, ruleLeverCaliper, ruleRotor, ruleRotorSize,
  ruleWheelFrame, ruleFreehub, ruleSpeeds, ruleProtocol, ruleCapacity, ruleChainrings, ruleFDMount, ruleElectronic, ruleUDH,
  ruleTireWheel, ruleClearance, ruleSeatpost, ruleStem, rulePedals,
];

export function checkBuild(selection: Selection): CompatReport {
  const checks: CompatCheck[] = [];
  for (const rule of RULES) {
    const r = rule(selection);
    if (!r) continue;
    if (Array.isArray(r)) checks.push(...r);
    else checks.push(r);
  }
  const bySlot: CompatReport["bySlot"] = {};
  const counts: Record<CompatStatus, number> = { compatible: 0, potential: 0, incompatible: 0, insufficient: 0 };
  let overall: CompatStatus | "empty" = checks.length ? "compatible" : "empty";
  for (const c of checks) {
    counts[c.status]++;
    overall = overall === "empty" ? c.status : worst(overall, c.status);
    for (const s of c.slots) bySlot[s] = bySlot[s] ? worst(bySlot[s]!, c.status) : c.status;
  }
  checks.sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]);
  return { checks, overall, bySlot, counts };
}

/** Compatibility of one candidate against an existing selection, considering only checks that involve the candidate's slot. */
export function checkCandidate(selection: Selection, candidate: Component): { status: CompatStatus | "empty"; checks: CompatCheck[] } {
  const slot = candidate.type;
  const next: Selection = { ...selection, [slot]: candidate };
  const { checks } = checkBuild(next);
  const relevant = checks.filter((c) => c.slots.includes(slot));
  let status: CompatStatus | "empty" = relevant.length ? "compatible" : "empty";
  for (const c of relevant) status = status === "empty" ? c.status : worst(status, c.status);
  return { status, checks: relevant };
}
