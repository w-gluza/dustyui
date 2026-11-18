import { describe, expect, it } from "vitest";
import { getShares } from "./getShares.js";

describe("getShares", () => {
  it("keeps whole percentages as they are", () => {
    expect(getShares([0.38, 0.26, 0.21], 1)).toEqual(["38%", "26%", "21%"]);
    expect(getShares([100, 50], 200)).toEqual(["50%", "25%"]);
  });

  it("makes equal thirds add up to the whole", () => {
    expect(getShares([1, 1, 1], 3)).toEqual(["34%", "33%", "33%"]);
  });

  it("adds up to the whole together with the unfilled rest", () => {
    expect(getShares([1, 1], 3)).toEqual(["34%", "33%"]);
    expect(getShares([0.125, 0.125], 1)).toEqual(["13%", "12%"]);
  });

  it("says less than one percent for a share too small to round up", () => {
    expect(getShares([0.004, 0.5], 1)).toEqual(["<1%", "50%"]);
    expect(getShares([0, 1], 1)).toEqual(["0%", "100%"]);
  });

  it("says more than ninety-nine percent for a share just short of the whole", () => {
    expect(getShares([0.996], 1)).toEqual([">99%"]);
    expect(getShares([0.004, 0.996], 1)).toEqual(["<1%", ">99%"]);
    expect(getShares([1], 1)).toEqual(["100%"]);
  });

  it("reads zero for every share of an empty whole", () => {
    expect(getShares([0, 0], 0)).toEqual(["0%", "0%"]);
    expect(getShares([], 1)).toEqual([]);
  });
});
