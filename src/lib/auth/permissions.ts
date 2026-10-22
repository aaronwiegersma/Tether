import type { Role } from "@/lib/types";

export type Permission =
  | "billing"
  | "team"
  | "organization"
  | "locations"
  | "assets"
  | "approve"
  | "view"
  | "checkout"
  | "request"
  | "report";

const grants: Record<Permission, Role[]> = {
  billing: ["owner"],
  team: ["owner"],
  organization: ["owner"],
  locations: ["owner", "manager"],
  assets: ["owner", "manager"],
  approve: ["owner", "manager"],
  view: ["owner", "manager", "employee"],
  checkout: ["owner", "manager", "employee"],
  request: ["owner", "manager", "employee"],
  report: ["owner", "manager", "employee"],
};

export function can(role: Role, permission: Permission) {
  return grants[permission].includes(role);
}

/**
 * Writes always use the organization from the signed-in session.
 * A value posted from the browser is ignored.
 */
export function organizationIdForWrite(
  sessionOrgId: string,
  submittedOrgId?: string | null,
) {
  if (!sessionOrgId) {
    throw new Error("forbidden");
  }
  void submittedOrgId;
  return sessionOrgId;
}
