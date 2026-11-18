import { describe, expect, it } from "vitest";
import {
  angleValue,
  ARC_END,
  ARC_START,
  isOnRing,
  pointAngle,
  snapValue,
  turnBetween,
  turnedValue,
  valueAngle,
} from "./dialGeometry.js";

const range = { min: 40, max: 240, step: 1 };

describe("dial geometry", () => {
  it("ignores the middle of the dial and accepts the ring", () => {
    expect(isOnRing({ x: 100, y: 100 }, 200)).toBe(false);
    expect(isOnRing({ x: 100, y: 70 }, 200)).toBe(false);
    expect(isOnRing({ x: 100, y: 10 }, 200)).toBe(true);
  });

  it("measures angles clockwise from the top", () => {
    expect(pointAngle({ x: 100, y: 0 }, 200)).toBeCloseTo(0);
    expect(pointAngle({ x: 200, y: 100 }, 200)).toBeCloseTo(90);
    expect(pointAngle({ x: 0, y: 100 }, 200)).toBeCloseTo(-90);
  });

  it("takes the short way round between two angles", () => {
    expect(turnBetween(10, 30)).toBe(20);
    expect(turnBetween(170, -170)).toBe(20);
    expect(turnBetween(-170, 170)).toBe(-20);
  });

  it("turns the whole arc into the whole range and stops at both ends", () => {
    expect(turnedValue(40, ARC_END - ARC_START, range)).toBe(240);
    expect(turnedValue(140, 30, range)).toBeCloseTo(160);
    expect(turnedValue(230, 90, range)).toBe(240);
    expect(turnedValue(50, -90, range)).toBe(40);
  });

  it("snaps to the nearest step counted from the minimum", () => {
    expect(snapValue(120.4, range)).toBe(120);
    expect(snapValue(47, { min: 40, max: 240, step: 5 })).toBe(45);
    expect(snapValue(500, range)).toBe(240);
  });

  it("places the marker along the arc", () => {
    expect(valueAngle(40, range)).toBe(ARC_START);
    expect(valueAngle(140, range)).toBe(0);
    expect(valueAngle(240, range)).toBe(ARC_END);
    expect(valueAngle(5, { min: 5, max: 5, step: 1 })).toBe(ARC_START);
  });

  it("turns an angle on the arc back into its value and clamps the gap at the bottom", () => {
    expect(angleValue(ARC_START, range)).toBe(40);
    expect(angleValue(0, range)).toBe(140);
    expect(angleValue(90, range)).toBe(200);
    expect(angleValue(180, range)).toBe(240);
    expect(angleValue(-170, range)).toBe(40);
  });
});
