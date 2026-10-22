import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return filesIn(full);
    return [full];
  });
}

describe("service role boundary", () => {
  it("never references the service role key inside the app source", () => {
    const root = path.join(process.cwd(), "src");
    const offenders = filesIn(root).filter((file) => {
      if (file.endsWith(".test.ts")) return false;
      const text = readFileSync(file, "utf8");
      return text.includes("SUPABASE_SERVICE_ROLE_KEY") || text.includes("service_role");
    });
    assert.deepEqual(offenders, []);
  });
});
