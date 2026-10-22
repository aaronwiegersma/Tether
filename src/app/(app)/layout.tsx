import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireContext();

  return (
    <AppShell
      orgName={context.organization.name}
      fullName={context.fullName}
      email={context.email}
      role={context.role}
      organizations={context.organizations}
      activeOrgId={context.organization.id}
    >
      {children}
    </AppShell>
  );
}
