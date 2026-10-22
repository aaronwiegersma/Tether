import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAddAssets, limitMessage, usagePercent } from "@/lib/plans";

describe("plan limits", () => {
  it("allows assets under the free limit", () => {
    assert.equal(canAddAssets(9, 10), true);
    assert.equal(canAddAssets(10, 10), false);
    assert.equal(canAddAssets(8, 10, 3), false);
  });

  it("reports usage and a friendly upgrade message at the cap", () => {
    assert.equal(usagePercent(5, 10), 50);
    assert.equal(limitMessage(3, 10, "Free"), null);
    assert.match(limitMessage(10, 10, "Free") ?? "", /Free plan/);
  });
});
