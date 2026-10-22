import { isSupabaseConfigured } from "@/lib/env";

export function SetupNotice() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-medium">Connect Supabase before signing in.</p>
      <p className="mt-1">
        Copy <code>.env.example</code> to <code>.env.local</code>, add the project URL and anon
        key, then run the migration in <code>supabase/migrations</code>.
      </p>
    </div>
  );
}
