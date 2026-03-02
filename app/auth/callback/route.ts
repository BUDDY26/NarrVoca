// app/auth/callback/route.ts
// Handles Supabase auth redirects:
//   - Email verification (PKCE: ?code=XXX  |  Implicit: handled client-side via URL hash)
//   - Google OAuth callback
//
// NOTE: For PKCE email verification to work, the PKCE code verifier must be accessible.
// Since this app uses the browser-side supabase client (lib/supabase.ts), the verifier
// lives in localStorage. exchangeCodeForSession() will succeed when the Supabase project
// uses Implicit flow, or when the user's browser stored the verifier cookie.
// If your project uses PKCE and exchange fails, install @supabase/ssr for full support.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_NEXTAUTH_URL ??
    requestUrl.origin;

  if (code) {
    // Anon client for session exchange
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { user } = data.session;

      // Upsert profile via service role (bypasses RLS)
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await adminSupabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? "",
          first_name: user.user_metadata?.first_name ?? null,
          last_name: user.user_metadata?.last_name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }
  }

  // Always redirect to dashboard — client-side supabase picks up session
  // from URL hash for implicit flow or from the exchange above for PKCE.
  return NextResponse.redirect(`${siteUrl}/dashboard`);
}
