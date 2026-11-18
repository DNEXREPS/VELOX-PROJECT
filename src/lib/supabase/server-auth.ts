import "server-only";
/**
 * Server-side authorisation for admin API routes. The browser can hide buttons; only this decides.
 *  1. take the user's access token (Authorization: Bearer … or the Supabase session cookie)
 *  2. validate it with Supabase Auth (getUser — not just decoding the JWT)
 *  3. read the role from `profiles` AS THAT USER (row-level security applies)
 * Database calls made afterwards use the admin's own token, so RLS (`is_admin()`) is enforced again
 * by PostgreSQL. No privileged key is used by the web app.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type AdminContext =
  | { ok: true; userId: string; db: (path: string, init?: { method?: string; body?: unknown; prefer?: string }) => Promise<Response> }
  | { ok: false; response: Response };

const deny = (status: number, error: string): AdminContext => ({ ok: false, response: Response.json({ error }, { status }) });

export async function requireAdmin(request: Request): Promise<AdminContext> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return deny(503, "Accounts are not configured on this server, so administrator actions are unavailable.");
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  let token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  if (!token) token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  if (!token) return deny(401, "Sign in as an administrator.");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return deny(401, "Your session has expired. Sign in again.");
  const base = url.replace(/\/$/, "");
  const db = (path: string, init: { method?: string; body?: unknown; prefer?: string } = {}) =>
    fetch(`${base}/rest/v1/${path}`, {
      method: init.method ?? "GET", cache: "no-store",
      headers: { apikey: anon, authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.prefer ? { prefer: init.prefer } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  const res = await db(`profiles?id=eq.${data.user.id}&select=role`);
  const rows = res.ok ? ((await res.json()) as Array<{ role: string }>) : [];
  if (rows[0]?.role !== "admin") return deny(403, "Administrator role required.");
  return { ok: true, userId: data.user.id, db };
}
