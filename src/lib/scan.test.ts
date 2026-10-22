import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseScanInput } from "@/lib/scan";

describe("scan parsing", () => {
  it("reads a tag URL", () => {
    assert.deepEqual(
      parseScanInput("https://tools.example.com/tag/abc123def456abc123def456abc123de"),
      { kind: "token", token: "abc123def456abc123def456abc123de" },
    );
  });

  it("reads a bare asset code", () => {
    assert.deepEqual(parseScanInput("ast-0042"), { kind: "code", code: "AST-0042" });
  });

  it("reads a bare public token", () => {
    const token = "a".repeat(64);
    assert.deepEqual(parseScanInput(token), { kind: "token", token });
  });

  it("treats a serial number or name as text search", () => {
    assert.deepEqual(parseScanInput("Milwaukee"), { kind: "text", text: "Milwaukee" });
  });

  it("ignores blank input", () => {
    assert.equal(parseScanInput("   "), null);
  });
});
