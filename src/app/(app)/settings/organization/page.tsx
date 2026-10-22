import { updateOrganizationSettings } from "@/actions/team";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Company" };

export default async function OrganizationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const context = await requireContext();
  if (!can(context.role, "organization")) redirect("/settings?error=permission");
  const flash = await searchParams;

  return (
    <div>
      <PageHeader title="Company" description="These settings apply to everyone in the company." />
      <Flash error={flash.error} done={flash.done} />
      <form action={updateOrganizationSettings} className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" name="name" defaultValue={context.organization.name} required />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="public_return_location"
            defaultChecked={context.organization.publicReturnLocation}
            className="mt-1"
          />
          <span>
            Show “return to” location on public QR and NFC pages. Employee names, prices, and history stay private.
          </span>
        </label>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
