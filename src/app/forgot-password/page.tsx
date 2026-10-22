import Link from "next/link";
import { ResetForm } from "@/components/auth-forms";
import { AuthScreen } from "@/components/auth-screen";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthScreen title="Reset password" subtitle="We'll email you a link if the account exists.">
      <ResetForm />
      <p className="mt-4 text-sm">
        <Link href="/login" className="underline">Back to sign in</Link>
      </p>
    </AuthScreen>
  );
}
