import Link from "next/link";
import { acceptInvitation } from "@/actions/auth";
import { AuthScreen } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Invitation" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_invitation", { invite_token: token });
  const preview = data as {
    organization_name?: string;
    email?: string;
    role?: string;
    expired?: boolean;
  } | null;
  const user = await getUserId();

  return (
    <AuthScreen
      title={preview?.organization_name ? `Join ${preview.organization_name}` : "Invitation"}
      subtitle={
        preview?.expired
          ? "This invitation has expired or was already used."
          : preview?.email
            ? `Sign in as ${preview.email} to join as ${preview.role}.`
            : "This invitation link is not valid."
      }
    >
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {preview && !preview.expired && user ? (
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="w-full" size="lg">
            Accept invitation
          </Button>
        </form>
      ) : null}
      {preview && !preview.expired && !user ? (
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href={`/login?next=/invite/${token}`}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/signup?email=${encodeURIComponent(preview.email || "")}&next=/invite/${token}`}>
              Create account
            </Link>
          </Button>
        </div>
      ) : null}
    </AuthScreen>
  );
}
