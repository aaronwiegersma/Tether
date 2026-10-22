import { redirect } from "next/navigation";
import { changeRole, inviteMember, removeMember, revokeInvite } from "@/actions/team";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { fieldClass, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const context = await requireContext();
  if (!can(context.role, "team")) redirect("/settings?error=permission");
  const flash = await searchParams;
  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, role, user_id, profile:profiles(full_name, email)")
      .eq("organization_id", context.organization.id),
    supabase
      .from("invitations")
      .select("id, email, role, token, expires_at, accepted_at")
      .eq("organization_id", context.organization.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader title="Team" description="Invite people with a link. They must sign up with the same email." />
      <Flash error={flash.error} done={flash.done} />
      <form action={inviteMember} className="mb-6 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_160px_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <select id="role" name="role" className={fieldClass} defaultValue="employee">
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <Button type="submit" className="self-end">Create invite</Button>
      </form>

      <h2 className="mb-2 font-medium">People</h2>
      <ul className="mb-6 divide-y divide-border rounded-xl border border-border">
        {members?.map((member) => {
          const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
          return (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{profile?.full_name || "Unnamed"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <form action={changeRole} className="flex items-center gap-2">
                <input type="hidden" name="member_id" value={member.id} />
                <select name="role" defaultValue={member.role} className={fieldClass} aria-label="Role">
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
                <Button type="submit" variant="outline">Save</Button>
              </form>
              {member.user_id !== context.userId ? (
                <form action={removeMember}>
                  <input type="hidden" name="member_id" value={member.id} />
                  <Button type="submit" variant="ghost">Remove</Button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

      <h2 className="mb-2 font-medium">Pending invitations</h2>
      {(invitations ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No open invitations.</p>
      ) : (
        <ul className="space-y-3">
          {invitations?.map((invite) => (
            <li key={invite.id} className="rounded-xl border border-border p-4">
              <p className="font-medium">{invite.email}</p>
              <p className="text-sm text-muted-foreground">{invite.role}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={`${getAppUrl()}/invite/${invite.token}`} label="Copy invite link" />
                <form action={revokeInvite}>
                  <input type="hidden" name="invitation_id" value={invite.id} />
                  <Button type="submit" variant="outline">Revoke</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
