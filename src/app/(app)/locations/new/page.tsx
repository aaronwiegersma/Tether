import { redirect } from "next/navigation";
import { Flash } from "@/components/flash";
import { LocationForm } from "@/components/location-form";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";

export const metadata = { title: "Add location" };

export default async function NewLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireContext();
  if (!can(context.role, "locations")) redirect("/locations?error=permission");
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="Add a location" description="Give it a colour and a shape so it is easy to spot on a label." />
      <Flash error={error} />
      <LocationForm />
    </div>
  );
}
