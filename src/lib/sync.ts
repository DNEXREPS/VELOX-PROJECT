"use client";
/**
 * Account sync: personal stores ⇄ Supabase `user_collections` (one row per user per collection,
 * protected by row-level security — the database only ever returns the signed-in user's rows).
 *
 * - First sign-in on a device: guest data saved on the device is adopted into the account
 *   (merged by id; the account's copy wins on conflicts).
 * - Local data that belongs to a different account is discarded before loading (shared devices).
 * - Changes are pushed with a short debounce; sign-out clears personal data from the device.
 */
import { supabase } from "./supabase/client";
import type { Store } from "./store";
import { buildsStore, compareStore, garageStore, mechanicHistoryStore, settingsStore, upgradePlansStore, wishlistStore } from "./state";

type Collection = "garage" | "builds" | "wishlist" | "compare" | "upgrade_plans" | "mechanic_history" | "settings";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STORES: Record<Collection, Store<any>> = {
  garage: garageStore, builds: buildsStore, wishlist: wishlistStore, compare: compareStore,
  upgrade_plans: upgradePlansStore, mechanic_history: mechanicHistoryStore, settings: settingsStore,
};
const PERSONAL: Collection[] = ["garage", "builds", "wishlist", "compare", "upgrade_plans", "mechanic_history"];
const OWNER_KEY = "velox:v1:data-owner";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";
let status: SyncStatus = "idle";
const statusListeners = new Set<(s: SyncStatus) => void>();
const setStatus = (s: SyncStatus) => { status = s; statusListeners.forEach((l) => l(s)); };
export const getSyncStatus = () => status;
export const onSyncStatus = (fn: (s: SyncStatus) => void) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };

let owner: string | null = null;
let unsubs: Array<() => void> = [];
const timers = new Map<Collection, ReturnType<typeof setTimeout>>();
let applyingRemote = false;

function mergeById<T extends { id?: string; kind?: string }>(remote: T[], local: T[]): T[] {
  const key = (x: T) => x.id ?? `${x.kind}:${(x as { id?: string }).id}`;
  const seen = new Set(remote.map(key));
  return [...remote, ...local.filter((x) => !seen.has(key(x)))];
}

async function push(c: Collection) {
  const sb = supabase(); if (!sb || !owner) return;
  setStatus("syncing");
  const { error } = await sb.from("user_collections").upsert({ owner_id: owner, collection: c, data: STORES[c].get(), updated_at: new Date().toISOString() });
  setStatus(error ? (navigator.onLine ? "error" : "offline") : "synced");
}

function schedule(c: Collection) {
  if (applyingRemote || !owner) return;
  clearTimeout(timers.get(c));
  timers.set(c, setTimeout(() => void push(c), 600));
}

export async function startSync(userId: string) {
  const sb = supabase(); if (!sb) return;
  if (owner === userId) return;
  stopSync();
  owner = userId;
  setStatus("syncing");
  let previousOwner: string | null = null;
  try { previousOwner = localStorage.getItem(OWNER_KEY); } catch { /* ignore */ }
  if (previousOwner && previousOwner !== userId) clearPersonalData(); // never mix two accounts' data

  const { data, error } = await sb.from("user_collections").select("collection, data");
  if (error || owner !== userId) { setStatus("error"); return; }
  const remote = new Map((data ?? []).map((r: { collection: Collection; data: unknown }) => [r.collection, r.data]));

  applyingRemote = true;
  const toPush: Collection[] = [];
  for (const c of Object.keys(STORES) as Collection[]) {
    const local = STORES[c].get();
    const r = remote.get(c);
    if (r === undefined) { if (Array.isArray(local) ? local.length : c === "settings") toPush.push(c); continue; }
    if (Array.isArray(local) && Array.isArray(r)) {
      const merged = mergeById(r as never[], local as never[]);
      STORES[c].set(merged);
      if (merged.length !== r.length) toPush.push(c);
    } else if (c === "settings") {
      STORES[c].set({ ...(r as object), ...(local as object) }); // this device's current preferences win
      toPush.push(c);
    } else STORES[c].set(r);
  }
  applyingRemote = false;
  try { localStorage.setItem(OWNER_KEY, userId); } catch { /* ignore */ }
  for (const c of toPush) await push(c);
  setStatus("synced");
  unsubs = (Object.keys(STORES) as Collection[]).map((c) => STORES[c].subscribe(() => schedule(c)));
}

export function stopSync() {
  unsubs.forEach((u) => u()); unsubs = [];
  timers.forEach((t) => clearTimeout(t)); timers.clear();
  owner = null; setStatus("idle");
}

/** Removes personal data from this device (sign-out, account deletion, account switch). */
export function clearPersonalData() {
  applyingRemote = true;
  for (const c of PERSONAL) STORES[c].reset();
  applyingRemote = false;
  try { localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
}
