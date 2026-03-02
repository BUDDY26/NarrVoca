"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    async function handleCallback() {
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.session) {
          const { user } = data.session;

          // Upsert profile — runs client-side with the fresh session
          await supabase.from("profiles").upsert(
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

      router.push("/dashboard?lang=en");
    }

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <svg
          className="animate-spin h-8 w-8 text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
