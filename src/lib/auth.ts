"use client";
/**
 * Authentication state (Supabase Auth) bridged into the app's existing session store.
 * - status "unconfigured": no auth provider connected → guest-only, data stays on this device.
 * - Roles come from the `profiles` table (server-side, protected by RLS) — never from the client.
 */
import { useEffect } from "react";
import type { AuthError, Session as SbSession, User } from "@supabase/supabase-js";
import { authConfigured, safeNext, siteUrl, supabase } from "./supabase/client";
import { createMemoryStore, useStore } from "./store";
import { sessionStore } from "./state";
import { startSync, stopSync, clearPersonalData } from "./sync";

export interface AuthUser { id: string; email: string | null; name: string; avatarUrl: string | null; providers: string[]; emailConfirmed: boolean; role: "user" | "admin" }
export interface AuthState { status: "loading" | "signed-out" | "signed-in" | "unconfigured"; user: AuthUser | null }

/** in-memory only: the source of truth is the Supabase session cookie */
const authStore = createMemoryStore<AuthState>({ status: authConfigured ? "loading" : "unconfigured", user: null });
export const useAuth = () => useStore(authStore);
export const getAuth = () => authStore.get();

const EPHEMERAL = "velox:auth-ephemeral";
const TAB = "velox:auth-tab";

async function toAuthUser(u: User): Promise<AuthUser> {
  const sb = supabase()!;
  const { data: p } = await sb.from("profiles").select("display_name, avatar_url, role").eq("id", u.id).maybeSingle();
  const meta = u.user_metadata ?? {};
  return {
    id: u.id, email: u.email ?? null,
    name: p?.display_name ?? meta.full_name ?? meta.name ?? (u.email ? u.email.split("@")[0] : "Rider"),
    avatarUrl: p?.avatar_url ?? meta.avatar_url ?? null,
    providers: (u.identities ?? []).map((i) => i.provider),
    emailConfirmed: !!u.email_confirmed_at,
    role: p?.role === "admin" ? "admin" : "user",
  };
}

async function apply(session: SbSession | null) {
  if (!session?.user) {
    if (authStore.get().status === "signed-in") { stopSync(); clearPersonalData(); }
    authStore.set({ status: "signed-out", user: null });
    sessionStore.set({ signedIn: false, name: "", role: "guest" });
    return;
  }
  const user = await toAuthUser(session.user);
  authStore.set({ status: "signed-in", user });
  sessionStore.set({ signedIn: true, name: user.name, role: user.role });
  startSync(user.id);
}

/** Mounted once in the root layout. */
export function AuthBridge() {
  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      // no provider: keep any local developer demo session, but never pretend it is a real account
      authStore.set({ status: "unconfigured", user: null });
      return;
    }
    let cancelled = false;
    (async () => {
      // "Keep me signed in" unchecked → end the session when the browser was closed
      try {
        if (localStorage.getItem(EPHEMERAL) === "1" && !sessionStorage.getItem(TAB)) { await sb.auth.signOut({ scope: "local" }); localStorage.removeItem(EPHEMERAL); }
        sessionStorage.setItem(TAB, "1");
      } catch { /* storage blocked */ }
      const { data } = await sb.auth.getSession();
      if (!cancelled) await apply(data.session);
    })();
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      // defer: Supabase recommends not awaiting other calls inside the callback
      setTimeout(() => { void apply(session); }, 0);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);
  return null;
}

/* ------------------------------- actions -------------------------------- */

export type AuthResult = { ok: true; info?: string } | { ok: false; code: "invalid" | "not-confirmed" | "rate-limited" | "unavailable" | "weak-password" | "error"; message?: string };

function mapError(e: AuthError | null | undefined): AuthResult {
  if (!e) return { ok: true };
  const msg = (e.message || "").toLowerCase();
  if (e.status === 429 || msg.includes("rate limit") || msg.includes("security purposes")) return { ok: false, code: "rate-limited" };
  if (msg.includes("not confirmed")) return { ok: false, code: "not-confirmed" };
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) return { ok: false, code: "invalid" };
  if (msg.includes("password")) return { ok: false, code: "weak-password", message: e.message };
  return { ok: false, code: "error", message: e.message };
}

export async function signInWithPassword(email: string, password: string, remember: boolean): Promise<AuthResult> {
  const sb = supabase(); if (!sb) return { ok: false, code: "unavailable" };
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) try { if (remember) localStorage.removeItem(EPHEMERAL); else localStorage.setItem(EPHEMERAL, "1"); sessionStorage.setItem(TAB, "1"); } catch { /* ignore */ }
  return mapError(error);
}

export async function signUpWithEmail(name: string, email: string, password: string, next = "/account?welcome=1"): Promise<AuthResult> {
  const sb = supabase(); if (!sb) return { ok: false, code: "unavailable" };
  const { error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: siteUrl(`/auth/callback?next=${encodeURIComponent(safeNext(next))}`) } });
  // Supabase returns a generic success for existing addresses, so the UI never reveals whether an email is registered.
  return mapError(error);
}

export async function signInWithGoogle(next = "/account"): Promise<AuthResult> {
  const sb = supabase(); if (!sb) return { ok: false, code: "unavailable" };
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: siteUrl(`/auth/callback?next=${encodeURIComponent(safeNext(next))}`), queryParams: { prompt: "select_account" } } });
  return mapError(error);
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const sb = supabase(); if (!sb) return { ok: false, code: "unavailable" };
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl("/auth/callback?next=/reset-password") });
  const r = mapError(error);
  // never reveal whether the address exists: only rate limiting is surfaced
  return r.ok || r.code !== "rate-limited" ? { ok: true } : r;
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const sb = supabase(); if (!sb) return { ok: false, code: "unavailable" };
  return mapError((await sb.auth.updateUser({ password })).error);
}

export async function updateProfileName(name: string): Promise<AuthResult> {
  const sb = supabase(); const u = authStore.get().user; if (!sb || !u) return { ok: false, code: "unavailable" };
  const clean = name.trim().slice(0, 80);
  const { error } = await sb.from("profiles").update({ display_name: clean, updated_at: new Date().toISOString() }).eq("id", u.id);
  if (error) return { ok: false, code: "error", message: error.message };
  authStore.set({ ...authStore.get(), user: { ...u, name: clean } });
  sessionStore.set((s) => ({ ...s, name: clean }));
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = supabase(); if (!sb) return;
  stopSync();
  await sb.auth.signOut();
  clearPersonalData();
  try { localStorage.removeItem(EPHEMERAL); } catch { /* ignore */ }
}

export async function deleteAccount(): Promise<AuthResult> {
  const sb = supabase(); if (!sb) return { ok: false, code: "unavailable" };
  stopSync();
  const { error } = await sb.rpc("delete_my_account");
  if (error) return { ok: false, code: "error", message: error.message };
  await sb.auth.signOut({ scope: "local" });
  clearPersonalData();
  return { ok: true };
}
