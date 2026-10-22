"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, organizationIdForWrite } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { LOCATION_COLORS } from "@/lib/assets/constants";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function saveLocation(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "locations")) redirect("/locations?error=permission");

  const organizationId = organizationIdForWrite(
    context.organization.id,
    text(formData, "organization_id"),
  );
  const id = text(formData, "location_id");
  const name = text(formData, "name");
  const color = LOCATION_COLORS.includes(text(formData, "color") as (typeof LOCATION_COLORS)[number])
    ? text(formData, "color")
    : "#2563eb";
  const icon = text(formData, "icon") || "circle";
  const payload = {
    organization_id: organizationId,
    name,
    address: text(formData, "address") || null,
    description: text(formData, "description") || null,
    color,
    icon,
  };

  if (name.length < 1) redirect(id ? `/locations/${id}/edit?error=name` : "/locations/new?error=name");

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("locations")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) redirect(`/locations/${id}/edit?error=${encodeURIComponent(friendlyError(error))}`);
  } else {
    const { data, error } = await supabase.from("locations").insert(payload).select("id").single();
    if (error || !data) redirect(`/locations/new?error=${encodeURIComponent(friendlyError(error))}`);
    await supabase.from("asset_activity").insert({
      organization_id: organizationId,
      actor_id: context.userId,
      action_type: "location_created",
      summary: `Added location ${name}`,
      new_value: { name, color, icon },
    });
    revalidatePath("/locations");
    redirect(`/locations/${data.id}`);
  }

  await supabase.from("asset_activity").insert({
    organization_id: organizationId,
    actor_id: context.userId,
    action_type: "location_changed",
    summary: `Updated location ${name}`,
    new_value: { name, color, icon },
  });
  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  redirect(`/locations/${id}?done=saved`);
}

export async function archiveLocation(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "locations")) redirect("/locations?error=permission");
  const id = text(formData, "location_id");
  const supabase = await createClient();
  await supabase
    .from("locations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", context.organization.id);
  revalidatePath("/locations");
  redirect("/locations?done=archived");
}
