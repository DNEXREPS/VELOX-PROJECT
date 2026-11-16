"use client";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, Check, CircleHelp, Inbox, X } from "lucide-react";
import { cx, formatOriginal, formatPrice, isVerified, NA, PRICE_TYPE_LABEL, show, SOURCE_TYPE_LABEL, STATUS_LABEL } from "@/lib/format";
import type { PriceEntry, Provenance, VerificationStatus } from "@/lib/types";
import { STATUS_TEXT, type CompatStatus } from "@/lib/compat";
import { settingsStore } from "@/lib/state";
import { useStore } from "@/lib/store";

/* --------------------------------- Button --------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
const btnBase =
  "inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-[background,color,border-color,transform] duration-150 select-none disabled:opacity-40 disabled:pointer-events-none active:translate-y-px whitespace-nowrap";
const btnVariant: Record<Variant, string> = {
  primary: "bg-lime text-ink-950 hover:bg-[#d4f98a]",
  secondary: "border border-line-strong text-fg hover:border-fg/40 hover:bg-white/[0.03]",
  ghost: "text-muted hover:text-fg hover:bg-white/[0.04]",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
};
const btnSize: Record<Size, string> = { sm: "h-8 px-3 text-[13px] rounded-sm", md: "h-10 px-4 text-sm rounded-sm", lg: "h-12 px-6 text-[15px] rounded-sm" };

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...props} />;
}

/* ------------------------------ Section header ----------------------------- */

export function SectionHeader({ eyebrow, title, children, className, action }: { eyebrow?: string; title: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cx("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h2 className="display text-[clamp(2rem,4.2vw,3.5rem)]">{title}</h2>
        {children && <div className="mt-4 text-[15px] leading-relaxed text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, action }: { eyebrow: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="border-b hairline">
      <div className="container-x flex flex-col gap-8 pb-10 pt-14 md:flex-row md:items-end md:justify-between md:pb-14 md:pt-20">
        <div className="max-w-3xl animate-fade-up">
          <p className="eyebrow mb-5 flex items-center gap-3"><span className="inline-block h-px w-6 bg-lime" />{eyebrow}</p>
          <h1 className="display text-[clamp(2.4rem,6vw,5rem)]">{title}</h1>
          {children && <div className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-[17px]">{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

/* --------------------------------- Badges --------------------------------- */

const statusTone: Record<VerificationStatus, string> = {
  "verified-official": "text-ok border-ok/30",
  "verified-distributor": "text-ok border-ok/30",
  "cross-verified": "text-ok border-ok/25",
  community: "text-info border-info/30",
  unverified: "text-muted border-line-strong",
  historical: "text-info border-info/25",
  discontinued: "text-warn border-warn/30",
  archived: "text-subtle border-line",
};

export function StatusBadge({ status, demo, className }: { status: VerificationStatus; demo?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]", statusTone[status], className)} title={demo ? "Demonstration seed data — not yet checked against an official source" : undefined}>
      <span className={cx("h-1 w-1 rounded-full bg-current")} />
      {STATUS_LABEL[status]}
      {demo && !isVerified(status) && <span className="text-subtle">· Demo</span>}
    </span>
  );
}

export function ProvenanceLine({ p, detailed }: { p: Provenance; detailed?: boolean }) {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge status={p.status} demo={p.demo} />
        {p.confidence && <span className="label-tech">Confidence: {p.confidence}</span>}
        <span className="label-tech">Updated {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
        {p.originalManufacturer && <span className="label-tech normal-case tracking-normal">Maker: {p.originalManufacturer}</span>}
      </div>
      {(detailed || p.sources.length <= 1) && p.sources.length > 0 && (
        <ul className="space-y-1">
          {p.sources.map((s, i) => (
            <li key={i} className="flex flex-wrap gap-x-2">
              <span className="label-tech">{s.type ? SOURCE_TYPE_LABEL[s.type] : "Source"}</span>
              {s.url ? <a className="link-u text-muted hover:text-fg" href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a> : <span>{s.label}</span>}
              {s.retrievedAt && <span className="text-subtle">· retrieved {s.retrievedAt}</span>}
            </li>
          ))}
        </ul>
      )}
      {!detailed && p.sources.length > 1 && <span className="label-tech">{p.sources.length} sources</span>}
      {p.reviewerNotes && <p className="max-w-xl text-subtle">Reviewer notes: {p.reviewerNotes}</p>}
    </div>
  );
}

export function Price({ price, className, showType = true }: { price: PriceEntry | null | undefined; className?: string; showType?: boolean }) {
  const { currency } = useStore(settingsStore);
  if (!price) return <span className={cx("text-muted", className)}>{NA}</span>;
  return (
    <span className={cx("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="tabular font-medium">{formatPrice(price, currency)}</span>
      {showType && !(price.amount === 0 && price.note) && (
        <span className={cx("font-mono text-[10px] uppercase tracking-[0.08em]", price.type === "estimated" ? "text-warn/80" : "text-subtle")} title={price.note ?? undefined}>
          {price.original && !(currency === "USD" && price.original.currency === "USD") ? `${formatOriginal(price.original)} ${PRICE_TYPE_LABEL[price.type]} · converted` : PRICE_TYPE_LABEL[price.type]}
        </span>
      )}
    </span>
  );
}

const compatTone: Record<CompatStatus, string> = {
  compatible: "text-ok bg-ok/[0.08] border-ok/25",
  potential: "text-warn bg-warn/[0.08] border-warn/25",
  incompatible: "text-bad bg-bad/[0.08] border-bad/25",
  insufficient: "text-info bg-info/[0.08] border-info/25",
};
const compatIcon: Record<CompatStatus, ReactNode> = {
  compatible: <Check className="h-3 w-3" strokeWidth={2.5} />,
  potential: <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />,
  incompatible: <X className="h-3 w-3" strokeWidth={2.5} />,
  insufficient: <CircleHelp className="h-3 w-3" strokeWidth={2.5} />,
};
export function CompatBadge({ status, className, short }: { status: CompatStatus; className?: string; short?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium", compatTone[status], className)}>
      {compatIcon[status]}
      {short ? STATUS_TEXT[status].split(" ")[0] : STATUS_TEXT[status]}
    </span>
  );
}
export const compatDot: Record<CompatStatus, string> = { compatible: "bg-ok", potential: "bg-warn", incompatible: "bg-bad", insufficient: "bg-info" };

export function Tag({ children, className, active }: { children: ReactNode; className?: string; active?: boolean }) {
  return <span className={cx("inline-flex items-center rounded-sm border px-2 py-0.5 text-xs", active ? "border-lime/40 text-lime" : "border-line text-muted", className)}>{children}</span>;
}

/* ------------------------------ Form controls ------------------------------ */

export function Field({ label, hint, children, className, htmlFor }: { label: string; hint?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="label-tech">{label}</label>
      {children}
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={!!active}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-[13px] transition-colors",
        active ? "border-lime bg-lime/10 text-lime" : "border-line text-muted hover:border-line-strong hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cx("inline-flex rounded-sm border hairline p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx("h-8 rounded-[2px] px-3 text-[13px] transition-colors", value === o.value ? "bg-ink-700 text-fg" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------- Specs / empty / misc -------------------------- */

export function SpecRows({ rows, className }: { rows: Array<[string, unknown]>; className?: string }) {
  return (
    <dl className={cx("divide-y divide-line border-y hairline", className)}>
      {rows.map(([k, v], i) => {
        const val = show(v);
        return (
          <div key={`${i}-${k}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className={cx("tabular", val === NA ? "text-subtle italic" : "text-fg")}>{val}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-dashed hairline px-6 py-16 text-center">
      <div className="text-subtle">{icon ?? <Inbox className="h-7 w-7" strokeWidth={1.25} />}</div>
      <div>
        <p className="text-base font-medium">{title}</p>
        {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-tech">{label}</span>
      <span className="tabular text-xl font-medium tracking-tight md:text-2xl">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={cx("flex items-start gap-2 text-xs leading-relaxed text-subtle", className)}>
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
      Each record shows its source and verification status. Official imports carry the manufacturer’s published specs and price (USD prices are converted to IDR and labelled); older seed records are unverified and their prices are VELOX estimates. Confirm with the manufacturer or an authorised dealer before buying.
    </p>
  );
}
