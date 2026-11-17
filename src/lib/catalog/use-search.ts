"use client";
import { useEffect, useState } from "react";
import type { SearchHit } from "@/lib/search";

export type RemoteHit = Omit<SearchHit, "tokens" | "titleTokens">;

/** Debounced global search against /api/search; stale requests are cancelled. */
export function useRemoteSearch(q: string, limit = 12, delayMs = 150) {
  const [state, setState] = useState<{ hits: RemoteHit[]; loading: boolean; error: boolean; for: string }>({ hits: [], loading: false, error: false, for: "" });
  useEffect(() => {
    const term = q.trim();
    if (!term) { setState({ hits: [], loading: false, error: false, for: "" }); return; }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: false }));
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&limit=${limit}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: { hits: RemoteHit[] }) => setState({ hits: d.hits, loading: false, error: false, for: term }))
        .catch((e) => { if ((e as Error).name !== "AbortError") setState({ hits: [], loading: false, error: true, for: term }); });
    }, delayMs);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, limit, delayMs]);
  return state;
}
