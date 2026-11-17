import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth / email-link callback (PKCE). Exchanges the one-time `code` for a session cookie on the
 * server, then redirects to a same-site path only (no open redirects). Used by Google sign-in,
 * email confirmation and password recovery links.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : "/account";
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/$/, "");
  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) return fail("unconfigured");
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return fail("provider");
  if (!code) return fail("missing-code");

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => { for (const { name, value, options } of list) cookieStore.set(name, value, options); },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("exchange");
  return NextResponse.redirect(`${origin}${next}`);
}
