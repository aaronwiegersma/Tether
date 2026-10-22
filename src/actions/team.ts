"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function inviteMember(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "team")) redirect("/settings/team?error=permission");

  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") === "manager" ? "manager" : "employee";
  if (!email.includes("@")) redirect("/settings/team?error=email");

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    organization_id: context.organization.id,
    email,
    role,
    invited_by: context.userId,
  });

  if (error) redirect(`/settings/team?error=${encodeURIComponent(friendlyError(error))}`);
  revalidatePath("/settings/team");
  redirect("/settings/team?done=invited");
}

export async function revokeInvite(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "team")) redirect("/settings/team?error=permission");
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .delete()
    .eq("id", text(formData, "invitation_id"))
    .eq("organization_id", context.organization.id);
  revalidatePath("/settings/team");
  redirect("/settings/team");
}

export async function changeRole(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "team")) redirect("/settings/team?error=permission");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    target_member: text(formData, "member_id"),
    new_role: text(formData, "role"),
  });
  if (error) redirect(`/settings/team?error=${encodeURIComponent(friendlyError(error))}`);
  revalidatePath("/settings/team");
  redirect("/settings/team?done=role");
}

export async function removeMember(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "team")) redirect("/settings/team?error=permission");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    target_member: text(formData, "member_id"),
  });
  if (error) redirect(`/settings/team?error=${encodeURIComponent(friendlyError(error))}`);
  revalidatePath("/settings/team");
  redirect("/settings/team?done=removed");
}

export async function updateOrganizationSettings(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "organization")) redirect("/settings/organization?error=permission");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization", {
    target_org: context.organization.id,
    org_name: text(formData, "name"),
    show_return_location: formData.get("public_return_location") === "on",
  });
  if (error) {
    redirect(`/settings/organization?error=${encodeURIComponent(friendlyError(error))}`);
  }
  revalidatePath("/settings/organization");
  redirect("/settings/organization?done=saved");
}

export async function updateProfile(formData: FormData) {
  const context = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: text(formData, "full_name") })
    .eq("id", context.userId);
  revalidatePath("/settings");
  redirect("/settings?done=saved");
}
