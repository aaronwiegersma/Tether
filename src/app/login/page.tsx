import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { AuthScreen } from "@/components/auth-screen";
import { getUserId } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getUserId()) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <AuthScreen title="Sign in" subtitle="Use the email for your Toolbox account.">
      <LoginForm next={next} />
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline">Forgot password</Link>
        {" · "}
        <Link href="/signup" className="underline">Create an account</Link>
      </p>
    </AuthScreen>
  );
}
