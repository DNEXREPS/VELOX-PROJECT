"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Only the public project URL and the public "anon" key are used here —
 * both are designed to be public; all access to personal data is enforced by row-level security
 * in the database. No service-role key or OAuth secret ever reaches the browser.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true when the site owner has connected Supabase Auth */
export const authConfigured = !!(URL && ANON);
/** Google is enabled in the Supabase dashboard; the button is hidden only when explicitly disabled */
export const googleEnabled = authConfigured && process.env.NEXT_PUBLIC_AUTH_GOOGLE !== "false";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!authConfigured) return null;
  if (!client) client = createBrowserClient(URL!, ANON!, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  return client;
}

/** absolute URL of this site for auth redirects (Supabase must allow-list it) */
export function siteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return base + path;
}

/** only same-site relative paths are accepted as post-login destinations (no open redirects) */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
