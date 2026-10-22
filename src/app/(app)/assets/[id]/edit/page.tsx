import { notFound, redirect } from "next/navigation";
import { AssetForm } from "@/components/asset-form";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit tool" };

export default async function EditAssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireContext();
  if (!can(context.role, "assets")) redirect("/assets?error=permission");
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const orgId = context.organization.id;
  const { data: asset } = await supabase
    .from("assets")
    .select("id, name, description, manufacturer, model, serial_number, purchase_date, home_location_id, current_location_id, assigned_user_id, status, tracking_method, notes, category:asset_categories(name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!asset) notFound();

  const [{ data: locations }, { data: members }, { data: categories }, { data: financial }] = await Promise.all([
    supabase.from("locations").select("id, name, color, icon").eq("organization_id", orgId).is("archived_at", null).order("name"),
    supabase.from("organization_members").select("user_id, profile:profiles(id, full_name)").eq("organization_id", orgId),
    supabase.from("asset_categories").select("id, name").eq("organization_id", orgId).order("name"),
    supabase.from("asset_financials").select("purchase_price").eq("asset_id", id).maybeSingle(),
  ]);

  const people = (members ?? []).map((member) => {
    const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
    return { id: profile?.id || member.user_id, full_name: profile?.full_name || "Unnamed" };
  });
  const category = Array.isArray(asset.category) ? asset.category[0] : asset.category;

  return (
    <div>
      <PageHeader title={`Edit ${asset.name}`} description="The asset ID and public tag stay the same." />
      <Flash error={error} />
      <AssetForm
        mode="edit"
        locations={locations ?? []}
        people={people}
        categories={categories ?? []}
        asset={asset}
        price={financial?.purchase_price}
        categoryName={category?.name}
      />
    </div>
  );
}
