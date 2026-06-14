import { describe, it, expect } from "vitest";
import { normalizeEntityId, getTeacherRoleId, getUserDisplayName } from "./roleIdentity";

describe("normalizeEntityId", () => {
  it("handles strings and numbers", () => {
    expect(normalizeEntityId("  abc ")).toBe("abc");
    expect(normalizeEntityId(42)).toBe("42");
  });

  it("extracts an id from an object (_id / id / roleId / userId)", () => {
    expect(normalizeEntityId({ _id: "x1" })).toBe("x1");
    expect(normalizeEntityId({ id: "x2" })).toBe("x2");
    expect(normalizeEntityId({ roleId: "x3" })).toBe("x3");
    expect(normalizeEntityId({ userId: "x4" })).toBe("x4");
  });

  it("returns empty string for nullish (but keeps 0)", () => {
    expect(normalizeEntityId(null)).toBe("");
    expect(normalizeEntityId(undefined)).toBe("");
    expect(normalizeEntityId(0)).toBe("0");
  });
});

describe("getTeacherRoleId", () => {
  it("prefers roleId, falls back to _id", () => {
    expect(getTeacherRoleId({ roleId: "r1", _id: "u1" })).toBe("r1");
    expect(getTeacherRoleId({ _id: "u1" })).toBe("u1");
    expect(getTeacherRoleId(null)).toBe("");
  });
});

describe("getUserDisplayName", () => {
  it("uses a string name when present", () => {
    expect(getUserDisplayName({ name: "  Asha  " })).toBe("Asha");
  });

  it("builds a full name from firstName/lastName", () => {
    expect(getUserDisplayName({ name: { firstName: "Asha", lastName: "Rao" } })).toBe("Asha Rao");
  });

  it("falls back when no name is available", () => {
    expect(getUserDisplayName({}, "Guest")).toBe("Guest");
    expect(getUserDisplayName(undefined)).toBe("User");
  });
});
