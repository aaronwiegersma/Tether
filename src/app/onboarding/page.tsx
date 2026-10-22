import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { AuthScreen } from "@/components/auth-screen";
import { createClient } from "@/lib/supabase/server";
import { getContext, requireUser } from "@/lib/auth/session";

export const metadata = { title: "Create your company" };

export default async function OnboardingPage() {
  await requireUser();
  const context = await getContext();
  if (context) redirect("/dashboard");

  const supabase = await createClient();
  const user = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AuthScreen
      title="Name your company"
      subtitle="Tools, locations, and people stay inside this company."
    >
      <OnboardingForm defaultName={profile?.full_name || ""} />
    </AuthScreen>
  );
}
