import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { AuthScreen } from "@/components/auth-screen";
import { getUserId } from "@/lib/auth/session";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  if (await getUserId()) redirect("/onboarding");
  const params = await searchParams;

  return (
    <AuthScreen title="Create your account" subtitle="Then you'll name the company you want to track.">
      <SignupForm next={params.next} email={params.email} />
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </AuthScreen>
  );
}
