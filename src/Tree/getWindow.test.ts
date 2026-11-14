import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { getWindow, getWindowItems, type WindowItem } from "./getWindow.js";

const base = { rowHeight: 20, overscan: 2, limit: 500 };

function rowIndexes(items: readonly WindowItem[]): number[] {
  return items.flatMap((item) => (item.type === "row" ? [item.index] : []));
}

function describeItems(items: readonly WindowItem[]): string[] {
  return items.map((item) =>
    item.type === "row" ? `row ${item.index}` : `${item.id} ${item.rowCount}`,
  );
}

describe("getWindow", () => {
  it("covers the rows in view plus the overscan on both sides", () => {
    expect(getWindow({ ...base, rowCount: 1000, from: 200, to: 400 })).toEqual({
      start: 8,
      end: 22,
    });
  });

  it("stops at the first and last row", () => {
    expect(getWindow({ ...base, rowCount: 10, from: -500, to: 5000 })).toEqual({
      start: 0,
      end: 10,
    });
  });

  it("is empty when the view is far past the last row", () => {
    expect(getWindow({ ...base, rowCount: 10, from: 9000, to: 9500 })).toEqual({
      start: 10,
      end: 10,
    });
  });

  it("never holds more rows than the limit", () => {
    expect(
      getWindow({ ...base, rowCount: 100_000, from: 0, to: 1e9, limit: 50 }),
    ).toEqual({ start: 0, end: 50 });
  });

  it.each([
    ["no rows", { rowCount: 0, rowHeight: 20 }],
    ["a zero row height", { rowCount: 10, rowHeight: 0 }],
    ["an unknown row height", { rowCount: 10, rowHeight: Number.NaN }],
  ])("is empty with %s", (_name, input) => {
    expect(getWindow({ ...base, from: 0, to: 100, ...input })).toEqual({
      start: 0,
      end: 0,
    });
  });

  it("starts at the first row when the view position is unknown", () => {
    expect(
      getWindow({ ...base, rowCount: 100, from: Number.NaN, to: Number.NaN }),
    ).toEqual({ start: 0, end: 0 });
  });
});

describe("getWindowItems", () => {
  it("puts a gap before and after the rows in the window", () => {
    expect(describeItems(getWindowItems({ start: 3, end: 5 }, 10, 4))).toEqual([
      "start 3",
      "row 3",
      "row 4",
      "end 5",
    ]);
  });

  it("always starts with the start gap, even when it is empty", () => {
    expect(describeItems(getWindowItems({ start: 0, end: 2 }, 2, 0))).toEqual([
      "start 0",
      "row 0",
      "row 1",
    ]);
  });

  it("keeps a pinned row that is above the window, in its own place", () => {
    expect(describeItems(getWindowItems({ start: 6, end: 8 }, 10, 2))).toEqual([
      "start 2",
      "row 2",
      "middle 3",
      "row 6",
      "row 7",
      "end 2",
    ]);
  });

  it("keeps a pinned row that is below the window, in its own place", () => {
    expect(describeItems(getWindowItems({ start: 1, end: 3 }, 10, 7))).toEqual([
      "start 1",
      "row 1",
      "row 2",
      "middle 4",
      "row 7",
      "end 2",
    ]);
  });

  it("leaves out the middle gap when the pinned row touches the window", () => {
    expect(describeItems(getWindowItems({ start: 3, end: 5 }, 10, 2))).toEqual([
      "start 2",
      "row 2",
      "row 3",
      "row 4",
      "end 5",
    ]);
  });

  it("ignores a pinned row that does not exist", () => {
    expect(rowIndexes(getWindowItems({ start: 0, end: 2 }, 5, -1))).toEqual([
      0, 1,
    ]);
    expect(rowIndexes(getWindowItems({ start: 0, end: 2 }, 5, 9))).toEqual([
      0, 1,
    ]);
  });

  it("cuts a window that reaches past the rows", () => {
    expect(describeItems(getWindowItems({ start: 3, end: 50 }, 5, 0))).toEqual([
      "start 0",
      "row 0",
      "middle 2",
      "row 3",
      "row 4",
    ]);
  });
});

describe("generated windows", () => {
  const anyInput = fc.record({
    rowCount: fc.integer({ min: 0, max: 200_000 }),
    rowHeight: fc.double({ min: 0.5, max: 200, noNaN: true }),
    from: fc.double({ min: -1e7, max: 1e7, noNaN: true }),
    size: fc.double({ min: 0, max: 5000, noNaN: true }),
    overscan: fc.integer({ min: 0, max: 30 }),
    limit: fc.integer({ min: 1, max: 500 }),
    pinned: fc.integer({ min: -1, max: 200_000 }),
  });

  it("accounts for every row exactly once, in order, within the limit", () => {
    fc.assert(
      fc.property(anyInput, ({ size, pinned, ...input }) => {
        const rowWindow = getWindow({ ...input, to: input.from + size });
        const items = getWindowItems(rowWindow, input.rowCount, pinned);
        const rows = rowIndexes(items);

        let next = 0;
        for (const item of items) {
          if (item.type === "row") {
            expect(item.index).toBe(next);
            next += 1;
          } else {
            expect(item.rowCount).toBeGreaterThanOrEqual(0);
            next += item.rowCount;
          }
        }
        expect(next).toBe(input.rowCount);
        expect(rows.length).toBeLessThanOrEqual(input.limit + 1);
        if (pinned >= 0 && pinned < input.rowCount) {
          expect(rows).toContain(pinned);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("includes every row that is in view when the limit allows it", () => {
    fc.assert(
      fc.property(anyInput, ({ size, ...input }) => {
        const to = input.from + size;
        const { start, end } = getWindow({ ...input, to, limit: 1e9 });
        const firstInView = Math.max(
          0,
          Math.floor(input.from / input.rowHeight),
        );
        const lastInView = Math.min(
          input.rowCount - 1,
          Math.ceil(to / input.rowHeight) - 1,
        );
        if (firstInView <= lastInView) {
          expect(start).toBeLessThanOrEqual(firstInView);
          expect(end).toBeGreaterThan(lastInView);
        }
      }),
      { numRuns: 500 },
    );
  });
});
