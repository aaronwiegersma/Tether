import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AppContext, PlanTier, Role } from "@/lib/types";

export const ORG_COOKIE = "toolbox_org";

type MembershipRow = {
  role: Role;
  organization:
    | {
        id: string;
        name: string;
        slug: string;
        public_return_location: boolean;
      }
    | {
        id: string;
        name: string;
        slug: string;
        public_return_location: boolean;
      }[]
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getUserId() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
}

export async function getContext(): Promise<AppContext | null> {
  const user = await getUserId();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      "role, organization:organizations(id, name, slug, public_return_location)",
    )
    .eq("user_id", user.id);

  const organizations = ((memberships ?? []) as MembershipRow[])
    .map((membership) => {
      const organization = one(membership.organization);
      if (!organization) return null;
      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        publicReturnLocation: organization.public_return_location,
        role: membership.role,
      };
    })
    .filter((organization): organization is NonNullable<typeof organization> =>
      Boolean(organization),
    );

  if (organizations.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  const organization =
    organizations.find((item) => item.id === preferred) ?? organizations[0];

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, asset_limit")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const { count } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .is("archived_at", null);

  return {
    userId: user.id,
    email: profile?.email || user.email,
    fullName: profile?.full_name || "",
    role: organization.role,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      publicReturnLocation: organization.publicReturnLocation,
    },
    organizations: organizations.map(({ id, name, role }) => ({ id, name, role })),
    plan: (subscription?.plan as PlanTier) || "free",
    assetLimit: subscription?.asset_limit ?? 10,
    assetCount: count ?? 0,
  };
}

export async function requireContext() {
  const user = await getUserId();
  if (!user) redirect("/login");
  const context = await getContext();
  if (!context) redirect("/onboarding");
  return context;
}

export async function requireUser() {
  const user = await getUserId();
  if (!user) redirect("/login");
  return user;
}
