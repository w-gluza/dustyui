import { describe as suite, expect, it } from "vitest";
import { describe } from "./describe/describe.js";
import { getCopyText } from "./getCopyText.js";

suite("getCopyText", () => {
  it("copies a string as it is, without quotes or shortening", () => {
    const long = "line one\nline two ".repeat(50);

    expect(getCopyText(describe(long))).toBe(long);
  });

  it.each([
    [42, "42"],
    [true, "true"],
    [null, "null"],
    [undefined, "undefined"],
    [BigInt(12), "12n"],
  ])("copies the simple value %s as %s", (value, text) => {
    expect(getCopyText(describe(value))).toBe(text);
  });

  it("copies an object as indented text", () => {
    const value = {
      name: "Torres del Paine",
      "known for": ["granite towers", "glaciers"],
      size: { hectares: 181_414 },
      empty: [],
    };

    expect(getCopyText(describe(value))).toBe(
      [
        "{",
        '  name: "Torres del Paine",',
        '  "known for": [',
        '    "granite towers",',
        '    "glaciers",',
        "  ],",
        "  size: {",
        "    hectares: 181414,",
        "  },",
        "  empty: [],",
        "}",
      ].join("\n"),
    );
  });

  it("keeps the holes of a sparse array, wherever they are", () => {
    const sparse: unknown[] = [];
    sparse[9] = "last";
    const mixed: unknown[] = ["first"];
    mixed[2] = "third";
    mixed[4] = "fifth";
    mixed.length = 8;

    expect(getCopyText(describe(sparse))).toBe(
      ["[", "  <9 empty items>,", '  "last",', "]"].join("\n"),
    );
    expect(getCopyText(describe(mixed))).toBe(
      [
        "[",
        '  "first",',
        "  <1 empty item>,",
        '  "third",',
        "  <1 empty item>,",
        '  "fifth",',
        "  <3 empty items>,",
        "]",
      ].join("\n"),
    );
  });

  it("keeps the holes of an array that has nothing else", () => {
    expect(getCopyText(describe({ slots: new Array<number>(5) }))).toBe(
      ["{", "  slots: [<5 empty items>],", "}"].join("\n"),
    );
    expect(getCopyText(describe(new Array<number>(1)))).toBe(
      "[<1 empty item>]",
    );
  });

  it("keeps extra named properties on an array after its items and holes", () => {
    const tagged: unknown[] & { note?: string } = ["a"];
    tagged.length = 3;
    tagged.note = "extra";

    expect(getCopyText(describe(tagged))).toBe(
      ["[", '  "a",', "  <2 empty items>,", '  note: "extra",', "]"].join("\n"),
    );
  });

  it("names the type of anything that is not a plain object or array", () => {
    class Park {
      name = "Tatra";
    }

    expect(getCopyText(describe(new Park()))).toBe(
      ["Park {", '  name: "Tatra",', "}"].join("\n"),
    );
  });

  it("marks a getter and a circular reference instead of following them", () => {
    let runs = 0;
    const value: Record<string, unknown> = {
      get costly() {
        runs += 1;
        return 1;
      },
    };
    value.self = value;

    expect(getCopyText(describe(value))).toBe(
      ["{", "  costly: (...),", "  self: [Circular $],", "}"].join("\n"),
    );
    expect(runs).toBe(0);
  });

  it("stops at the limit with an ellipsis and still closes every bracket", () => {
    const value = { rows: [1, 2, 3, 4, 5], after: true };

    expect(getCopyText(describe(value), 4)).toBe(
      ["{", "  rows: Array(5) [1, 2, 3, 4, 5],", "  after: true,", "}"].join(
        "\n",
      ),
    );
    expect(getCopyText(describe([[1], [2], [3]]), 3)).toBe(
      ["[", "  [", "    1,", "  ],", "  …", "]"].join("\n"),
    );
  });

  it("does not open a list far larger than the limit", () => {
    const root = describe({ huge: new Float64Array(100_000) });
    const text = getCopyText(root);

    expect(text.split("\n")).toHaveLength(3);
    expect(text).toContain("huge: Float64Array(100000)");
  });

  it("copies deeply nested values without overflowing the stack", () => {
    let deep: unknown = "bottom";
    for (let level = 0; level < 4000; level++) {
      deep = { inner: deep };
    }

    expect(getCopyText(describe(deep), 10_000)).toContain('inner: "bottom"');
  });
});
