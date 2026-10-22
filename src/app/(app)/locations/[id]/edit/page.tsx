import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/flash";
import { LocationForm } from "@/components/location-form";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit location" };

export default async function EditLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireContext();
  if (!can(context.role, "locations")) redirect("/locations?error=permission");
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, address, description, color, icon")
    .eq("id", id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!location) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${location.name}`} />
      <Flash error={error} />
      <LocationForm location={location} />
    </div>
  );
}
