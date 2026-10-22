import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAwayFromHome } from "@/lib/assets/away";
import { toPublicTag } from "@/lib/assets/public-tag";

describe("away from home", () => {
  it("is away when the current location differs from home", () => {
    assert.equal(
      isAwayFromHome({
        status: "available",
        home_location_id: "home",
        current_location_id: "site",
      }),
      true,
    );
  });

  it("is away when the current location is unknown", () => {
    assert.equal(
      isAwayFromHome({
        status: "checked_out",
        home_location_id: "home",
        current_location_id: null,
      }),
      true,
    );
  });

  it("is home when both locations match, including both empty", () => {
    assert.equal(
      isAwayFromHome({
        status: "available",
        home_location_id: "home",
        current_location_id: "home",
      }),
      false,
    );
    assert.equal(
      isAwayFromHome({
        status: "available",
        home_location_id: null,
        current_location_id: null,
      }),
      false,
    );
  });

  it("does not flag retired or archived tools", () => {
    assert.equal(
      isAwayFromHome({
        status: "retired",
        home_location_id: "home",
        current_location_id: "site",
      }),
      false,
    );
    assert.equal(
      isAwayFromHome({
        status: "available",
        home_location_id: "home",
        current_location_id: "site",
        archived_at: "2026-01-01",
      }),
      false,
    );
  });
});

describe("public tag", () => {
  it("drops price, serial number, assignee, and notes", () => {
    const tag = toPublicTag({
      asset_name: "Drill",
      asset_code: "AST-0001",
      organization_name: "Example Contracting Ltd.",
      status: "checked_out",
      show_return_location: true,
      home_location_name: "Warehouse",
      home_location_color: "#16a34a",
      home_location_icon: "triangle",
      purchase_price: 199,
      serial_number: "SN-1",
      assigned_name: "Riley",
      notes: "Internal",
    });

    assert.equal(tag.home_location?.name, "Warehouse");
    const encoded = JSON.stringify(tag);
    assert.equal(encoded.includes("199"), false);
    assert.equal(encoded.includes("SN-1"), false);
    assert.equal(encoded.includes("Riley"), false);
    assert.equal(encoded.includes("Internal"), false);
    assert.deepEqual(Object.keys(tag).sort(), [
      "asset_code",
      "asset_name",
      "home_location",
      "organization_name",
      "show_return_location",
      "status",
    ]);
  });

  it("hides the return location when the company turns it off", () => {
    const tag = toPublicTag({
      asset_name: "Drill",
      asset_code: "AST-0001",
      organization_name: "Example",
      status: "available",
      show_return_location: false,
      home_location_name: "Warehouse",
    });
    assert.equal(tag.home_location, null);
  });
});
