import { redirect } from "next/navigation";
import { AssetForm } from "@/components/asset-form";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { limitMessage } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add tool" };

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireContext();
  if (!can(context.role, "assets")) redirect("/assets?error=permission");
  const { error } = await searchParams;
  const supabase = await createClient();
  const orgId = context.organization.id;
  const [{ data: locations }, { data: members }, { data: categories }] = await Promise.all([
    supabase.from("locations").select("id, name, color, icon").eq("organization_id", orgId).is("archived_at", null).order("name"),
    supabase.from("organization_members").select("user_id, profile:profiles(id, full_name)").eq("organization_id", orgId),
    supabase.from("asset_categories").select("id, name").eq("organization_id", orgId).order("name"),
  ]);

  const people = (members ?? []).map((member) => {
    const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
    return { id: profile?.id || member.user_id, full_name: profile?.full_name || "Unnamed" };
  });

  return (
    <div>
      <PageHeader title="Add a tool" description="The ID and public tag are created for you." />
      <Flash error={error} />
      {limitMessage(context.assetCount, context.assetLimit, context.plan) ? (
        <p className="mb-4 text-sm text-amber-800">{limitMessage(context.assetCount, context.assetLimit, context.plan)}</p>
      ) : null}
      <AssetForm
        mode="create"
        locations={locations ?? []}
        people={people}
        categories={categories ?? []}
      />
    </div>
  );
}
