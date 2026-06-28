import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("v2 architecture boundaries", () => {
  test("gateway does not import SQLite or service repositories", () => {
    const source = readFileSync("services/gateway/src/server.ts", "utf8");
    expect(source.includes("bun:sqlite")).toBe(false);
    expect(source.includes("../auth")).toBe(false);
    expect(source.includes("../social")).toBe(false);
    expect(source.includes("../realtime")).toBe(false);
    expect(source.includes("../platform")).toBe(false);
  });

  test("services do not import each other directly", () => {
    const serviceFiles = files("services").filter((file) => file.endsWith(".ts") && !file.includes("_lib"));
    for (const file of serviceFiles) {
      const source = readFileSync(file, "utf8");
      expect(source.includes("../auth")).toBe(false);
      expect(source.includes("../social")).toBe(false);
      expect(source.includes("../realtime")).toBe(false);
      expect(source.includes("../platform")).toBe(false);
      expect(source.includes("../browser")).toBe(false);
    }
  });

  test("shared package remains contract-only", () => {
    const sharedFiles = files("packages/shared/src").filter((file) => file.endsWith(".ts"));
    for (const file of sharedFiles) {
      const source = readFileSync(file, "utf8");
      expect(source.includes("bun:sqlite")).toBe(false);
      expect(source.includes("Bun.serve")).toBe(false);
      expect(source.includes("fetch(")).toBe(false);
    }
  });
});
