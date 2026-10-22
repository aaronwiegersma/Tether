import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const migrationDir = path.join(process.cwd(), "supabase/migrations");
const sql = readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => readFileSync(path.join(migrationDir, file), "utf8"))
  .join("\n");

const tables = [
  "profiles",
  "organizations",
  "organization_members",
  "invitations",
  "plan_definitions",
  "subscriptions",
  "locations",
  "asset_categories",
  "assets",
  "asset_financials",
  "asset_assignments",
  "asset_movements",
  "asset_requests",
  "asset_activity",
  "tracking_devices",
];

describe("row level security coverage", () => {
  for (const table of tables) {
    it(`enables row level security on ${table}`, () => {
      assert.ok(sql.includes(`alter table public.${table} enable row level security`));
    });
  }

  it("does not let anonymous users read tenant tables", () => {
    assert.ok(
      sql.includes("revoke all on all tables in schema public from public, anon, authenticated"),
    );
    assert.equal(sql.includes("grant select on all tables in schema public to anon"), false);
  });

  it("exposes only the redacted tag lookup to anonymous users", () => {
    assert.ok(
      sql.includes("grant execute on function public.get_public_tag(text) to anon, authenticated"),
    );
    assert.ok(
      sql.includes(
        "grant execute on function public.checkout_asset(uuid, uuid, uuid, text) to authenticated",
      ),
    );
    assert.equal(
      sql.includes("grant execute on function public.checkout_asset(uuid, uuid, uuid, text) to anon"),
      false,
    );
    assert.ok(sql.includes("asset_financials"));
    assert.ok(sql.includes("public_return_location"));
  });

  it("keeps hardware device writes closed", () => {
    assert.ok(sql.includes("No insert/update/delete policies on tracking_devices"));
    assert.equal(
      /create policy[\s\S]{0,120}on public\.tracking_devices[\s\S]{0,80}for insert/i.test(sql),
      false,
    );
  });

  it("enforces the asset limit in the database", () => {
    assert.ok(sql.includes("asset_limit_reached"));
    assert.ok(sql.includes("'free', 'Free', 10"));
  });
});
