import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAssetCsv } from "@/lib/csv";

describe("asset csv", () => {
  it("parses quoted commas and maps columns", () => {
    const csv = [
      "name,category,home_location,notes",
      'Milwaukee Drill,Power Tools,Warehouse,"Cuts, drills"',
    ].join("\n");

    const result = parseAssetCsv(csv);
    assert.equal(result.error, undefined);
    assert.equal(result.rows[0]?.name, "Milwaukee Drill");
    assert.equal(result.rows[0]?.category, "Power Tools");
    assert.equal(result.rows[0]?.home_location, "Warehouse");
    assert.equal(result.rows[0]?.notes, "Cuts, drills");
  });

  it("requires a name column", () => {
    assert.match(parseAssetCsv("category\nTools").error ?? "", /name/);
  });
});
