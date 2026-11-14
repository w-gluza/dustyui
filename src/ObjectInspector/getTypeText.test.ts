import { describe as suite, expect, it } from "vitest";
import { describeValue } from "./describe/describe.js";
import { getTypeText } from "./getTypeText.js";

suite("getTypeText", () => {
  it("names plain values by their type", () => {
    const values: [unknown, string][] = [
      ["a", "String"],
      [1, "Number"],
      [1n, "BigInt"],
      [true, "Boolean"],
      [null, "null"],
      [undefined, "undefined"],
      [Symbol("s"), "Symbol"],
      [() => 1, "Function"],
      [[1], "Array"],
      [{ a: 1 }, "Object"],
      [new Map(), "Map"],
      [new Set(), "Set"],
      [new Date(0), "Date"],
      [/a/u, "RegExp"],
      [new RangeError("far"), "RangeError"],
      [new Uint8Array(1), "Uint8Array"],
    ];

    for (const [value, text] of values) {
      expect(getTypeText(describeValue(value))).toBe(text);
    }
  });

  it("uses the class name when a class made the value", () => {
    class Park {}

    expect(getTypeText(describeValue(new Park()))).toBe("Park");
  });

  it("explains rows that are not values in plain words", () => {
    const self: Record<string, unknown> = {
      get later() {
        return 1;
      },
    };
    self.self = self;
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    const root = describeValue({
      self,
      entries: new Map([[1, 2]]),
      gone: proxy,
      holes: new Array<number>(2),
    });
    const [selfNode, entries, gone, holes] = root.children();

    expect(selfNode?.children().map(getTypeText)).toEqual([
      "Getter (not run)",
      "Circular reference",
    ]);
    expect(entries?.children().map(getTypeText)).toEqual(["Map entry"]);
    expect(gone ? getTypeText(gone) : "").toBe("Could not be read");
    expect(holes?.children().map(getTypeText)).toEqual(["Empty items"]);
  });
});
