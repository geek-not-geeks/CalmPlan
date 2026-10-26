import { describe, it, expect } from "vitest";
describe("parseSyllabus server fn module", () => {
  it("module loads (regression: server-fn builder API must exist)", async () => {
    const m = await import("@/lib/parseSyllabus.functions");
    expect(typeof m.parseSyllabus).toBe("function");
  });
});
