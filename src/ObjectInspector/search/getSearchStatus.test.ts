import { describe as suite, expect, it } from "vitest";
import { getSearchStatus } from "./getSearchStatus.js";

suite("getSearchStatus", () => {
  const some = { ids: ["a", "b", "c"], isComplete: true };

  it("says nothing for a blank query", () => {
    expect(getSearchStatus(" ", some, -1)).toBe("");
  });

  it("counts the matches before one is chosen", () => {
    expect(getSearchStatus("x", some, -1)).toBe("3 matches");
    expect(getSearchStatus("x", { ids: ["a"], isComplete: true }, -1)).toBe(
      "1 match",
    );
  });

  it("says which match is current", () => {
    expect(getSearchStatus("x", some, 1)).toBe("2 of 3");
  });

  it("says when there are none", () => {
    expect(getSearchStatus("x", { ids: [], isComplete: true }, -1)).toBe(
      "No matches",
    );
  });

  it("says when only part of the value was searched", () => {
    expect(
      getSearchStatus("x", { ids: ["a", "b"], isComplete: false }, -1),
    ).toBe("2 matches, searched in part");
    expect(getSearchStatus("x", { ids: [], isComplete: false }, -1)).toBe(
      "No matches, searched in part",
    );
  });
});
