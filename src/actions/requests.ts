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

export async function createRequest(formData: FormData) {
  const context = await requireContext();
  const type = text(formData, "request_type") === "new_tool" ? "new_tool" : "existing_tool";
  const assetId = text(formData, "asset_id");
  const toolName = text(formData, "tool_name");
  const quantity = Math.max(1, Number(text(formData, "quantity") || "1"));
  const cost = text(formData, "estimated_cost");
  const productUrl = text(formData, "product_url");

  if (type === "existing_tool" && !assetId) redirect("/requests/new?error=asset");
  if (type === "new_tool" && !toolName) redirect("/requests/new?error=name");
  if (productUrl && !/^https?:\/\//i.test(productUrl)) {
    redirect("/requests/new?error=url");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("asset_requests").insert({
    organization_id: context.organization.id,
    request_type: type,
    asset_id: type === "existing_tool" ? assetId : null,
    tool_name: type === "new_tool" ? toolName : null,
    description: text(formData, "description") || null,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    location_id: text(formData, "location_id") || null,
    reason: text(formData, "reason") || null,
    product_url: productUrl || null,
    estimated_cost: cost ? Number(cost) : null,
    status: "pending",
    requested_by: context.userId,
  });

  if (error) redirect(`/requests/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  redirect("/requests?done=submitted");
}

export async function reviewRequest(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "approve")) redirect("/requests?error=permission");

  const id = text(formData, "request_id");
  const status = text(formData, "status");
  if (!["approved", "rejected", "fulfilled"].includes(status)) redirect("/requests");

  const supabase = await createClient();
  const { error } = await supabase
    .from("asset_requests")
    .update({
      status,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      review_note: text(formData, "review_note") || null,
    })
    .eq("id", id)
    .eq("organization_id", context.organization.id);

  if (error) redirect(`/requests?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  redirect("/requests?done=reviewed");
}
