import { describe as suite, expect, it } from "vitest";
import { describeValue } from "./describe/describe.js";
import { getCopyText } from "./getCopyText.js";

function refuse(): never {
  throw new Error("refused");
}

function getText(...input: Parameters<typeof getCopyText>): string {
  return getCopyText(...input).text;
}

suite("getCopyText", () => {
  it("copies a string as it is, without quotes or shortening", () => {
    const long = "line one\nline two ".repeat(50);

    expect(getText(describeValue(long))).toBe(long);
  });

  it.each([
    [42, "42"],
    [true, "true"],
    [null, "null"],
    [undefined, "undefined"],
    [BigInt(12), "12n"],
  ])("copies the simple value %s as %s", (value, text) => {
    expect(getText(describeValue(value))).toBe(text);
  });

  it("copies an object as indented text", () => {
    const value = {
      name: "Torres del Paine",
      "known for": ["granite towers", "glaciers"],
      size: { hectares: 181_414 },
      empty: [],
    };

    expect(getText(describeValue(value))).toBe(
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

    expect(getText(describeValue(sparse))).toBe(
      ["[", "  <9 empty items>,", '  "last",', "]"].join("\n"),
    );
    expect(getText(describeValue(mixed))).toBe(
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
    expect(getText(describeValue({ slots: new Array<number>(5) }))).toBe(
      ["{", "  slots: [", "    <5 empty items>,", "  ],", "}"].join("\n"),
    );
    expect(getText(describeValue(new Array<number>(1)))).toBe(
      ["[", "  <1 empty item>,", "]"].join("\n"),
    );
  });

  it("keeps extra named properties on an array after its items and holes", () => {
    const tagged: unknown[] & { note?: string } = ["a"];
    tagged.length = 3;
    tagged.note = "extra";

    expect(getText(describeValue(tagged))).toBe(
      ["[", '  "a",', "  <2 empty items>,", '  note: "extra",', "]"].join("\n"),
    );
  });

  it("names the type of anything that is not a plain object or array", () => {
    class Park {
      name = "Tatra";
    }

    expect(getText(describeValue(new Park()))).toBe(
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

    expect(getText(describeValue(value))).toBe(
      ["{", "  costly: (...),", "  self: [Circular $],", "}"].join("\n"),
    );
    expect(runs).toBe(0);
  });

  it("copies a revoked proxy as the row shows it, on its own or nested", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    const alone = describeValue(proxy);
    const nested = describeValue({ before: 1, proxy, after: [proxy] });

    expect(getText(alone)).toBe(alone.preview);
    expect(getText(nested)).toBe(
      [
        "{",
        "  before: 1,",
        `  proxy: ${alone.preview},`,
        "  after: [",
        `    ${alone.preview},`,
        "  ],",
        "}",
      ].join("\n"),
    );
  });

  it("does not read the length of a proxied array through its trap", () => {
    let reads = 0;
    const list = new Proxy(["a", "b"], {
      get(target, key, receiver) {
        if (key === "length") {
          reads += 1;
          throw new Error("no length for you");
        }
        return Reflect.get(target, key, receiver) as unknown;
      },
    });

    expect(getText(describeValue(list))).toBe(
      ["[", '  "a",', '  "b",', "]"].join("\n"),
    );
    expect(getText(describeValue({ list }))).toContain('"b"');
    expect(reads).toBe(0);
  });

  it.each([
    ["refuses to list its keys", { ownKeys: refuse }],
    [
      "refuses to describe its properties",
      { getOwnPropertyDescriptor: refuse },
    ],
    ["refuses to reveal its prototype", { getPrototypeOf: refuse }],
    ["refuses every read", { get: refuse, has: refuse }],
  ])("never throws for a proxied array that %s", (_name, handler) => {
    const sparse: number[] = [1];
    sparse[2] = 3;
    const list = new Proxy(sparse, handler);

    expect(() => getText(describeValue(list))).not.toThrow();
    expect(() => getText(describeValue({ list, after: true }))).not.toThrow();
    expect(getText(describeValue({ list, after: true }))).toContain(
      "after: true",
    );
  });

  it("stops at the limit with an ellipsis and still closes every bracket", () => {
    const value = { rows: [1, 2, 3, 4, 5], after: true };

    expect(getText(describeValue(value), 4)).toBe(
      ["{", "  rows: Array(5) [1, 2, 3, 4, 5],", "  after: true,", "}"].join(
        "\n",
      ),
    );
    expect(getText(describeValue([[1], [2], [3]]), 3)).toBe(
      ["[", "  [", "    1,", "  ],", "  …", "]"].join("\n"),
    );
  });

  it("does not open a list far larger than the limit", () => {
    const root = describeValue({ huge: new Float64Array(100_000) });
    const text = getText(root);

    expect(text.split("\n")).toHaveLength(3);
    expect(text).toContain("huge: Float64Array(100000)");
  });

  it("copies deeply nested values without overflowing the stack", () => {
    let deep: unknown = "bottom";
    for (let level = 0; level < 4000; level++) {
      deep = { inner: deep };
    }

    expect(getText(describeValue(deep), 10_000, Infinity)).toContain(
      'inner: "bottom"',
    );
  });
});
