// All routes under (auth) are user-authenticated and require Supabase at runtime.
// Force-dynamic prevents Next.js from attempting static prerendering during build
// when NEXT_PUBLIC_SUPABASE_URL is not available in the build environment.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
