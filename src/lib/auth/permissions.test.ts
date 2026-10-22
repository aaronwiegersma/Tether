import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  can,
  organizationIdForWrite,
  type Permission,
} from "@/lib/auth/permissions";
import type { Role } from "@/lib/types";

const roles: Role[] = ["owner", "manager", "employee"];

const expected: Record<Permission, Role[]> = {
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

describe("role permissions", () => {
  for (const [permission, allowed] of Object.entries(expected) as [
    Permission,
    Role[],
  ][]) {
    for (const role of roles) {
      it(`${role} ${allowed.includes(role) ? "can" : "cannot"} ${permission}`, () => {
        assert.equal(can(role, permission), allowed.includes(role));
      });
    }
  }
});

describe("organization id for writes", () => {
  it("ignores an organization id supplied by the client", () => {
    const sessionOrg = "11111111-1111-1111-1111-111111111111";
    const submitted = "22222222-2222-2222-2222-222222222222";
    assert.equal(organizationIdForWrite(sessionOrg, submitted), sessionOrg);
    assert.equal(organizationIdForWrite(sessionOrg, null), sessionOrg);
  });
});
