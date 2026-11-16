"use client";
import { useEffect, useState } from "react";
import type { AIStatus } from "@/lib/ai/types";
import { cx } from "@/lib/format";

export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/ai/status").then((r) => r.json()).then((s) => alive && setStatus(s)).catch(() => alive && setStatus(null));
    return () => { alive = false; };
  }, []);
  return status;
}

export function AIStatusBadge({ capability, status }: { capability: "language" | "imageGeneration"; status: AIStatus | null }) {
  if (!status) return <span className="inline-flex items-center gap-2 rounded-full border hairline px-3 py-1 text-xs text-subtle">Checking AI provider…</span>;
  const s = status[capability];
  return (
    <span className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", s.connected ? "border-lime/30 text-lime" : "border-warn/30 text-warn")} title={s.reason ?? undefined}>
      <span className={cx("h-1.5 w-1.5 rounded-full", s.connected ? "bg-lime" : "bg-warn")} />
      {s.connected ? `AI connected · ${s.provider}` : capability === "language" ? "AI provider not connected — local engine only" : "Image generation not connected"}
    </span>
  );
}
