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

  it("snaps fractional steps to clean numbers", () => {
    const tenths = { min: 0, max: 1, step: 0.1 };

    expect(
      Array.from({ length: 11 }, (_, index) => snapValue(index / 10, tenths)),
    ).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(snapValue(0.30000000000000004, tenths)).toBe(0.3);
    expect(snapValue(1.26, { min: 0.25, max: 2, step: 0.5 })).toBe(1.25);
    expect(snapValue(3e-7, { min: 0, max: 1, step: 1e-7 })).toBe(3e-7);
  });

  it("stops at the last whole step, falls back to the minimum and ignores a step that is not positive", () => {
    expect(snapValue(103, { min: 0, max: 103, step: 5 })).toBe(100);
    expect(snapValue(Number.NaN, range)).toBe(40);
    expect(snapValue(120.4, { min: 40, max: 240, step: 0 })).toBe(120.4);
    expect(snapValue(5, { min: 5, max: 5, step: 1 })).toBe(5);
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
