import Link from "next/link";
import { updateProfile } from "@/actions/team";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";

export const metadata = { title: "Settings" };

const links = [
  ["/settings/organization", "Company", "Name and what a public tag is allowed to show.", "organization"],
  ["/settings/team", "Team", "Invite managers and employees.", "team"],
  ["/settings/labels", "Labels & trackers", "QR labels, NFC stickers, and future hardware.", "view"],
  ["/settings/billing", "Plan", "Asset usage and upgrade options. Payments are not connected yet.", "view"],
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const context = await requireContext();
  const { done } = await searchParams;

  return (
    <div>
      <PageHeader title="Settings" description={`${context.fullName || context.email} · ${context.role}`} />
      <Flash done={done} />
      <form action={updateProfile} className="mb-6 max-w-md space-y-3 rounded-xl border border-border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Your name</Label>
          <Input id="full_name" name="full_name" defaultValue={context.fullName} />
        </div>
        <Button type="submit">Save name</Button>
      </form>
      <div className="grid gap-3">
        {links.map((link) =>
          can(context.role, link[3]) ? (
            <Link key={link[0]} href={link[0]} className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-medium">{link[1]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{link[2]}</p>
            </Link>
          ) : null,
        )}
      </div>
    </div>
  );
}
