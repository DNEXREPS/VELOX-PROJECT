"use client";
/**
 * Tiny persistent store (localStorage) built on useSyncExternalStore.
 * Server render and first client render use the initial value, so there is no hydration mismatch;
 * persisted state is applied immediately after hydration.
 */
import { useSyncExternalStore } from "react";

export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (fn: () => void) => () => void;
  initial: T;
  reset: () => void;
}

const PREFIX = "velox:v1:";

export function createStore<T>(key: string, initial: T): Store<T> {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw) state = { ...(typeof initial === "object" && !Array.isArray(initial) ? initial : {}), ...JSON.parse(raw) } as T;
      if (raw && Array.isArray(initial)) state = JSON.parse(raw) as T;
    } catch {
      /* storage blocked or corrupt — keep defaults */
    }
  };

  const persist = () => {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(state));
    } catch {
      /* quota exceeded or blocked */
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === PREFIX + key) {
        loaded = false;
        load();
        listeners.forEach((l) => l());
      }
    });
  }

  return {
    initial,
    get: () => {
      load();
      return state;
    },
    set: (next) => {
      load();
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      persist();
      listeners.forEach((l) => l());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset: () => {
      state = initial;
      try {
        window.localStorage.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
      listeners.forEach((l) => l());
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

/** true after hydration — use to avoid flashing empty states for persisted data */
const noop = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** In-memory store (no persistence) — for state whose source of truth lives elsewhere, e.g. the auth session cookie. */
export function createMemoryStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    initial,
    get: () => state,
    set: (next) => { state = typeof next === "function" ? (next as (p: T) => T)(state) : next; listeners.forEach((l) => l()); },
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    reset: () => { state = initial; listeners.forEach((l) => l()); },
  };
}
