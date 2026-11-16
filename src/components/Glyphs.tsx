import type { ComponentType } from "@/lib/types";
import { cx } from "@/lib/format";

/** Consistent technical line glyphs for each component type. */
export function ComponentGlyph({ type, className }: { type: ComponentType; className?: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const body = (() => {
    switch (type) {
      case "frame": return <path {...s} d="M10 34 L22 16 L40 16 L28 34 Z M22 16 L20 10 M40 16 L42 12" />;
      case "fork": return <path {...s} d="M24 6 L24 16 M18 16 L30 16 M18 16 L14 40 M30 16 L34 40" />;
      case "groupset": return <g {...s}><circle cx="16" cy="28" r="9" /><circle cx="16" cy="28" r="3" /><circle cx="36" cy="22" r="6" /><path d="M16 19 L36 16 M16 37 L36 28" /></g>;
      case "shifters": return <path {...s} d="M14 10 q 10 0 12 10 l 2 18 q -2 4 -6 0 l -4 -16 q -2 -6 -6 -6 z M22 22 l 8 6" />;
      case "front-derailleur": return <path {...s} d="M12 30 q 12 -14 24 0 M14 30 l 0 6 l 20 0 l 0 -6 M24 18 l 0 -8" />;
      case "rear-derailleur": return <g {...s}><circle cx="24" cy="14" r="4" /><circle cx="28" cy="34" r="4" /><path d="M22 18 L18 30 L30 38 M24 10 l 6 -4" /></g>;
      case "crankset": return <g {...s}><circle cx="20" cy="24" r="11" /><circle cx="20" cy="24" r="7" /><path d="M20 24 L38 36 M36 34 l 4 4" /></g>;
      case "cassette": return <g {...s}><circle cx="24" cy="24" r="14" /><circle cx="24" cy="24" r="10" /><circle cx="24" cy="24" r="6" /><circle cx="24" cy="24" r="2" /></g>;
      case "chain": return <g {...s}><rect x="6" y="20" width="12" height="8" rx="4" /><rect x="16" y="20" width="12" height="8" rx="4" /><rect x="26" y="20" width="12" height="8" rx="4" /><rect x="36" y="20" width="6" height="8" rx="3" /></g>;
      case "brakes": return <g {...s}><circle cx="24" cy="24" r="14" /><circle cx="24" cy="24" r="5" /><path d="M30 10 q 10 4 10 14 l -6 0 q 0 -6 -6 -9 z" /></g>;
      case "wheelset": return <g {...s}><circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="12" /><path d="M24 12 L24 36 M12 24 L36 24 M16 16 L32 32 M32 16 L16 32" opacity=".6" /></g>;
      case "tires": return <g {...s}><circle cx="24" cy="24" r="16" strokeWidth="4" /><circle cx="24" cy="24" r="11" /></g>;
      case "handlebar": return <path {...s} d="M8 18 L40 18 M8 18 q -2 10 4 14 l 4 0 M40 18 q 2 10 -4 14 l -4 0 M24 18 l 0 -6" />;
      case "stem": return <path {...s} d="M10 30 L34 22 M10 26 l 0 8 M34 18 l 0 8 M8 34 l 4 0 M32 16 l 4 0" />;
      case "saddle": return <path {...s} d="M6 22 q 16 -8 36 -2 q -4 6 -14 6 q -10 0 -22 -4 z M22 26 l 0 12" />;
      case "seatpost": return <path {...s} d="M24 40 L24 14 M16 12 q 8 -4 16 0 M20 40 l 8 0" />;
      case "pedals": return <g {...s}><rect x="10" y="20" width="22" height="10" rx="2" /><path d="M32 25 L40 25" /></g>;
      default: return <g {...s}><rect x="12" y="12" width="24" height="24" rx="3" /><path d="M18 24 l 12 0 M24 18 l 0 12" /></g>;
    }
  })();
  return <svg viewBox="0 0 48 48" className={className && /\b(h|w|size)-/.test(className) ? className : cx("h-10 w-10", className)} aria-hidden>{body}</svg>;
}

export function BrandMark({ name, color, size = "md", className }: { name: string; color?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
  const dims = size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  return (
    <span className={cx("relative inline-flex shrink-0 items-center justify-center border border-line-strong bg-ink-900 font-mono font-semibold tracking-tight text-fg", dims, className)} aria-hidden>
      {initials}
      <span className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: color ?? "#C5F36A" }} />
    </span>
  );
}

export function VeloxLogo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <path d="M4 7 L16 26 L28 7" fill="none" stroke="#F2F4F5" strokeWidth="2.6" strokeLinejoin="miter" />
        <path d="M11 7 L16 15.5 L21 7" fill="none" stroke="#C5F36A" strokeWidth="2.6" />
      </svg>
      <span className="text-[17px] font-semibold tracking-[0.18em]">VELOX</span>
    </span>
  );
}
