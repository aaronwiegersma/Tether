"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_state: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "That email or password is incorrect." };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_state: { error?: string; notice?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const next = String(formData.get("next") || "/onboarding");

  if (password.length < 8) {
    return { error: "Use at least 8 characters for the password." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: friendlyError(error) };
  if (!data.session) {
    return {
      notice: "Check your email to confirm the account, then come back to sign in.",
    };
  }

  redirect(next.startsWith("/") ? next : "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _state: { error?: string; notice?: string } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/settings`,
  });
  if (error) return { error: "We could not send the reset email." };
  return { notice: "If that email has an account, a reset link is on its way." };
}

export async function createOrganization(
  _state: { error?: string } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const name = String(formData.get("name") || "");
  const ownerName = String(formData.get("full_name") || "");
  const { data, error } = await supabase.rpc("create_organization", {
    org_name: name,
    owner_name: ownerName,
  });

  if (error || !data) {
    return { error: friendlyError(error) };
  }

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect("/dashboard");
}

export async function switchOrganization(formData: FormData) {
  const organizationId = String(formData.get("organization_id") || "");
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getClaims();
  const userId = user?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/dashboard");
}

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") || "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    invite_token: token,
  });
  if (error || !data) {
    redirect(`/invite/${token}?error=${encodeURIComponent(friendlyError(error))}`);
  }
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
