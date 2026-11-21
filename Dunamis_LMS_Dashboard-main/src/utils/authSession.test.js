import { afterEach, describe, expect, it } from "vitest";
import { clearAuthSession, persistAuthSession, sessionStateKey } from "./authSession";

describe("clearAuthSession", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("drops session-scoped UI state on sign-out and keeps other preferences", () => {
    persistAuthSession({ token: "t", user: { _id: "u1" } });
    window.localStorage.setItem(sessionStateKey("todayScheduleFilters"), JSON.stringify({ mode: "online" }));
    window.localStorage.setItem("enrolledStudentsView", JSON.stringify("list"));

    clearAuthSession();

    expect(window.localStorage.getItem(sessionStateKey("todayScheduleFilters"))).toBeNull();
    expect(window.localStorage.getItem("token")).toBeNull();
    expect(window.localStorage.getItem("enrolledStudentsView")).toBe(JSON.stringify("list"));
  });
});
