/**
 * Procedurally drawn technical bicycle illustration.
 * VELOX does not bundle manufacturer photography; each model gets a consistent
 * line drawing derived from its category so the catalogue stays honest and lightweight.
 */
import type { CategoryId, Suspension } from "@/lib/types";

type Bar = "drop" | "flare" | "riser" | "swept" | "bmx" | "flat";
interface Geo {
  R: number; tire: number; cs: number; drop: number; st: number; sa: number; ha: number; stack: number; reach: number; ht: number;
  bar: Bar; suspFork?: boolean; rearSus?: boolean; battery?: boolean; fold?: boolean; post?: number; stemRise?: number; aero?: boolean;
}

const BASE: Record<string, Geo> = {
  road: { R: 112, tire: 5, cs: 142, drop: 22, st: 178, sa: 73.5, ha: 73, stack: 190, reach: 140, ht: 50, bar: "drop", post: 34 },
  aero: { R: 112, tire: 5, cs: 140, drop: 22, st: 172, sa: 74, ha: 73, stack: 182, reach: 145, ht: 46, bar: "drop", post: 30, aero: true },
  gravel: { R: 114, tire: 9, cs: 148, drop: 26, st: 172, sa: 73, ha: 71, stack: 205, reach: 134, ht: 60, bar: "flare", post: 36 },
  mtb: { R: 118, tire: 13, cs: 146, drop: 8, st: 150, sa: 76, ha: 65, stack: 210, reach: 160, ht: 46, bar: "riser", suspFork: true, post: 42 },
  urban: { R: 112, tire: 8, cs: 150, drop: 24, st: 176, sa: 72, ha: 70, stack: 228, reach: 120, ht: 70, bar: "swept", post: 34 },
  folding: { R: 66, tire: 8, cs: 112, drop: 6, st: 110, sa: 70, ha: 72, stack: 130, reach: 150, ht: 40, bar: "flat", fold: true, post: 120, stemRise: 150 },
  bmx: { R: 74, tire: 12, cs: 106, drop: -6, st: 70, sa: 70, ha: 74.5, stack: 110, reach: 160, ht: 40, bar: "bmx", post: 30 },
  other: { R: 112, tire: 7, cs: 140, drop: 22, st: 176, sa: 73, ha: 72, stack: 200, reach: 132, ht: 56, bar: "flat", post: 34 },
};

function geometryFor(category: CategoryId, sub?: string, suspension?: Suspension): Geo {
  let g: Geo;
  if (category === "road") g = { ...BASE[sub === "aero" || sub === "time-trial" || sub === "triathlon" ? "aero" : "road"] };
  else if (category === "electric") {
    g = sub === "e-mtb" ? { ...BASE.mtb } : sub === "e-road" || sub === "e-gravel" ? { ...BASE.gravel } : sub === "e-folding" ? { ...BASE.folding } : { ...BASE.urban };
    g.battery = true;
  } else g = { ...(BASE[category] ?? BASE.other) };
  if (suspension === "full" && category !== "bmx") { g.rearSus = true; g.suspFork = true; }
  if (suspension === "front" && category !== "bmx") g.suspFork = true;
  if (suspension === "rigid" && category === "mtb") g.suspFork = false;
  return g;
}

const rad = (d: number) => (d * Math.PI) / 180;
/** Round to 0.1 px so server (Node) and browser trig produce identical SVG attributes (no hydration drift). */
const q = (n: number) => Math.round(n * 10) / 10;

function readable(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#D7DDE3";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.32 ? "#D7DDE3" : hex;
}

export function BikeGraphic({
  category, subcategory, suspension, color, className, detail = true, title, disc = true,
}: {
  category: CategoryId; subcategory?: string; suspension?: Suspension; color?: string; className?: string; detail?: boolean; title?: string; disc?: boolean;
}) {
  const g = geometryFor(category, subcategory, suspension);
  const frame = readable(color);
  const ground = 330;
  const ra = { x: 0, y: ground - g.R };
  const bb = { x: ra.x + g.cs, y: ra.y + g.drop };
  const seatTop = { x: bb.x - g.st * Math.cos(rad(g.sa)), y: bb.y - g.st * Math.sin(rad(g.sa)) };
  const htTop = { x: bb.x + g.reach, y: bb.y - g.stack };
  const dir = { x: Math.cos(rad(g.ha)), y: Math.sin(rad(g.ha)) };
  const htBot = { x: htTop.x + dir.x * g.ht, y: htTop.y + dir.y * g.ht };
  const t = (ra.y - htBot.y) / dir.y;
  const crown = { x: htBot.x + dir.x * 10, y: htBot.y + dir.y * 10 };
  const fa = { x: htBot.x + dir.x * t + 14, y: ra.y };
  const saddle = { x: seatTop.x - (g.post ?? 34) * Math.cos(rad(g.sa)), y: seatTop.y - (g.post ?? 34) * Math.sin(rad(g.sa)) };
  const stemLen = g.bar === "bmx" ? 18 : 34;
  const rise = g.stemRise ?? (g.bar === "bmx" ? 0 : 6);
  const stemEnd = { x: htTop.x + stemLen, y: htTop.y - rise - (g.bar === "riser" ? 6 : 0) };
  const ttJoin = { x: seatTop.x + (htTop.x - seatTop.x) * 0.04, y: seatTop.y + 10 };

  // centre horizontally
  const minX = ra.x - g.R - 8;
  const maxX = fa.x + g.R + 8;
  const width = maxX - minX;
  const offX = (600 - width) / 2 - minX;

  const p = (pt: { x: number; y: number }) => `${(pt.x + offX).toFixed(1)},${pt.y.toFixed(1)}`;
  const L = (a: { x: number; y: number }, b: { x: number; y: number }, w = 4.5, stroke = frame, extra?: object) => (
    <line x1={q(a.x + offX)} y1={q(a.y)} x2={q(b.x + offX)} y2={q(b.y)} stroke={stroke} strokeWidth={w} strokeLinecap="round" {...extra} />
  );

  const wheel = (c: { x: number; y: number }, key: string) => (
    <g key={key}>
      <circle cx={q(c.x + offX)} cy={q(c.y)} r={g.R} fill="none" stroke="#2A323B" strokeWidth={g.tire + 4} />
      <circle cx={q(c.x + offX)} cy={q(c.y)} r={g.R} fill="none" stroke="#11161B" strokeWidth={g.tire} />
      <circle cx={q(c.x + offX)} cy={q(c.y)} r={g.R - g.tire / 2 - (g.aero ? 22 : 7)} fill="none" stroke="#3A444F" strokeWidth={g.aero ? 1.2 : 1.6} />
      {g.aero && <circle cx={q(c.x + offX)} cy={q(c.y)} r={g.R - g.tire / 2 - 11} fill="none" stroke="#3A444F" strokeWidth={20} opacity={0.35} />}
      {detail && Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r0 = 6, r1 = g.R - g.tire / 2 - (g.aero ? 22 : 7);
        return <line key={i} x1={q(c.x + offX + Math.cos(a) * r0)} y1={q(c.y + Math.sin(a) * r0)} x2={q(c.x + offX + Math.cos(a + 0.18) * r1)} y2={q(c.y + Math.sin(a + 0.18) * r1)} stroke="#2E3740" strokeWidth={0.8} />;
      })}
      <circle cx={q(c.x + offX)} cy={q(c.y)} r={5} fill="#0B0E11" stroke="#59636E" strokeWidth={1.5} />
      {disc && category !== "bmx" && <circle cx={q(c.x + offX)} cy={q(c.y)} r={g.R * 0.2} fill="none" stroke="#4A5560" strokeWidth={1.5} strokeDasharray="3 2" />}
    </g>
  );

  const chainringR = category === "bmx" ? 15 : 20;
  const cogR = category === "bmx" ? 6 : 11;

  const bar = () => {
    const s = stemEnd;
    switch (g.bar) {
      case "drop":
      case "flare":
        return <path d={`M${p(s)} q 22 -2 26 14 q 4 18 -14 26 l -8 0`} fill="none" stroke={frame} strokeWidth={3.5} strokeLinecap="round" />;
      case "riser":
        return <path d={`M${p({ x: s.x - 6, y: s.y + 4 })} l 10 -10 l 8 0`} fill="none" stroke={frame} strokeWidth={4} strokeLinecap="round" />;
      case "swept":
        return <path d={`M${p(s)} q 6 -10 -6 -14 l -18 -2`} fill="none" stroke={frame} strokeWidth={3.5} strokeLinecap="round" />;
      case "bmx":
        return <path d={`M${p(s)} l -6 -44 l -14 0 M${p({ x: s.x - 3, y: s.y - 22 })} l -12 0`} fill="none" stroke={frame} strokeWidth={3.5} strokeLinecap="round" />;
      default:
        return <path d={`M${p(s)} l 4 -6 l 12 0`} fill="none" stroke={frame} strokeWidth={3.5} strokeLinecap="round" />;
    }
  };

  const shockA = { x: bb.x - 14, y: bb.y - 42 };
  const shockB = { x: seatTop.x + (htTop.x - seatTop.x) * 0.35, y: seatTop.y + (htTop.y - seatTop.y) * 0.35 + 22 };
  const pivot = { x: bb.x - 6, y: bb.y - 26 };
  const ssJoin = g.rearSus ? { x: seatTop.x + 16, y: seatTop.y + 52 } : { x: seatTop.x + 6, y: seatTop.y + 14 };

  return (
    <svg viewBox="0 0 600 360" className={className} role="img" aria-label={title ?? `${category} bicycle illustration`}>
      {title && <title>{title}</title>}
      <line x1={q(20)} y1={q(ground + 0.5)} x2={q(580)} y2={q(ground + 0.5)} stroke="#1D242B" strokeWidth={1} />
      {wheel(ra, "r")}
      {wheel(fa, "f")}
      {/* drivetrain */}
      <circle cx={q(bb.x + offX)} cy={q(bb.y)} r={chainringR} fill="none" stroke="#C5F36A" strokeWidth={2.5} />
      <circle cx={q(ra.x + offX)} cy={q(ra.y)} r={cogR} fill="none" stroke="#C5F36A" strokeWidth={1.5} opacity={0.8} />
      <line x1={q(bb.x + offX)} y1={q(bb.y - chainringR)} x2={q(ra.x + offX)} y2={q(ra.y - cogR)} stroke="#C5F36A" strokeWidth={1} opacity={0.55} />
      <line x1={q(bb.x + offX)} y1={q(bb.y + chainringR)} x2={q(ra.x + offX)} y2={q(ra.y + cogR)} stroke="#C5F36A" strokeWidth={1} opacity={0.55} />
      {/* rear triangle */}
      {g.rearSus ? (
        <>
          {L(pivot, ra, 4)}
          {L(ra, ssJoin, 3.5)}
          {L(ssJoin, { x: ssJoin.x + 18, y: ssJoin.y - 4 }, 4)}
          <line x1={q(shockA.x + offX)} y1={q(shockA.y)} x2={q(shockB.x + offX)} y2={q(shockB.y)} stroke="#C5F36A" strokeWidth={7} strokeLinecap="round" opacity={0.9} />
          <line x1={q(shockA.x + offX)} y1={q(shockA.y)} x2={q(shockB.x + offX)} y2={q(shockB.y)} stroke="#0B0E11" strokeWidth={2} strokeLinecap="round" />
        </>
      ) : (
        <>
          {L(bb, ra, 3.5)}
          {L(ra, ssJoin, 3)}
        </>
      )}
      {/* main triangle */}
      {g.fold ? (
        <>
          {L(bb, htBot, 7)}
          <circle cx={q((bb.x + htBot.x) / 2 + offX)} cy={q((bb.y + htBot.y) / 2)} r={6} fill="#0B0E11" stroke="#C5F36A" strokeWidth={1.5} />
          {L(bb, seatTop, 5)}
        </>
      ) : (
        <>
          {L(bb, seatTop, 5)}
          {L(ttJoin, htTop, 5)}
          {L(bb, htBot, g.aero ? 8 : 6)}
        </>
      )}
      {g.battery && <line x1={q(bb.x + offX + (htBot.x - bb.x) * 0.15)} y1={q(bb.y + (htBot.y - bb.y) * 0.15)} x2={q(bb.x + offX + (htBot.x - bb.x) * 0.72)} y2={q(bb.y + (htBot.y - bb.y) * 0.72)} stroke="#3B4652" strokeWidth={13} strokeLinecap="round" />}
      {g.battery && <rect x={q(bb.x + offX - 16)} y={q(bb.y - 14)} width={30} height={26} rx={5} fill="#232B33" stroke="#4A5560" />}
      {L(htTop, htBot, 7)}
      {/* fork */}
      {g.suspFork ? (
        <>
          <line x1={q(crown.x + offX)} y1={q(crown.y)} x2={q(crown.x + offX + dir.x * (t * 0.45))} y2={q(crown.y + dir.y * (t * 0.45))} stroke="#AAB3BC" strokeWidth={7} strokeLinecap="round" />
          <line x1={q(crown.x + offX + dir.x * (t * 0.42))} y1={q(crown.y + dir.y * (t * 0.42))} x2={q(fa.x + offX - 4)} y2={q(fa.y)} stroke="#1F262E" strokeWidth={10} strokeLinecap="round" />
          <line x1={q(crown.x + offX + dir.x * (t * 0.42))} y1={q(crown.y + dir.y * (t * 0.42))} x2={q(fa.x + offX - 4)} y2={q(fa.y)} stroke={frame} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        </>
      ) : (
        <path d={`M${p(htBot)} L${p({ x: htBot.x + dir.x * t * 0.8, y: htBot.y + dir.y * t * 0.8 })} Q${p({ x: fa.x - 2, y: fa.y - 16 })} ${p(fa)}`} fill="none" stroke={frame} strokeWidth={4} strokeLinecap="round" />
      )}
      {/* seatpost + saddle */}
      {L(seatTop, saddle, 3, "#7B8590")}
      <path d={`M${p({ x: saddle.x - 22, y: saddle.y - 1 })} q 18 -6 40 0 l -10 4 q -14 2 -30 -4 z`} fill="#1A2027" stroke="#7B8590" strokeWidth={1.4} />
      {/* stem + bar */}
      {L(htTop, stemEnd, 3.5, "#9AA4AE")}
      {bar()}
      {/* crank + pedal */}
      {L(bb, { x: bb.x + 18, y: bb.y + 26 }, 3.5, "#9AA4AE")}
      <rect x={q(bb.x + offX + 10)} y={q(bb.y + 24)} width={16} height={4} rx={1} fill="#9AA4AE" />
    </svg>
  );
}
