import { describe as suite, expect, it } from "vitest";
import { getCopyText } from "../getCopyText.js";
import { getMatches } from "../search/getMatches.js";
import { describeValue, type InspectorNode } from "./describe.js";
import { getNodeTrail } from "./getNode.js";

interface Reads {
  keys: number;
  descriptors: number;
}

function watch<Target extends object>(target: Target, reads: Reads): Target {
  return new Proxy(target, {
    ownKeys(inner) {
      reads.keys++;
      return Reflect.ownKeys(inner);
    },
    getOwnPropertyDescriptor(inner, key) {
      reads.descriptors++;
      return Reflect.getOwnPropertyDescriptor(inner, key);
    },
  });
}

function showCollapsed(node: InspectorNode): string {
  void node.kind;
  void node.typeName;
  void node.hasChildren;
  void node.size;
  return node.preview;
}

suite("describe reads only what is open", () => {
  it("does not list the contents of collapsed inner arrays when the outer one opens", () => {
    const reads = { keys: 0, descriptors: 0 };
    const inner = Array.from({ length: 50 }, () =>
      watch(new Array<number>(100_000).fill(7), reads),
    );

    const rows = describeValue(inner).children();
    const previews = rows.map(showCollapsed);

    expect(previews[0]).toBe("Array(100000) [7, 7, 7, 7, 7, …]");
    expect(reads.keys).toBe(0);
    expect(reads.descriptors).toBeLessThanOrEqual(inner.length * 10);
  });

  it("reads the same handful of entries for a huge collapsed list as for a short one", () => {
    const short = { keys: 0, descriptors: 0 };
    const huge = { keys: 0, descriptors: 0 };

    showCollapsed(describeValue(watch(new Array<number>(100).fill(1), short)));
    showCollapsed(
      describeValue(watch(new Array<number>(3_000_000).fill(1), huge)),
    );

    expect(huge).toEqual(short);
    expect(huge.keys).toBe(0);
  });

  it("previews a huge typed array from its first five items", () => {
    expect(describeValue(new Uint8Array(3_000_000)).preview).toBe(
      "Uint8Array(3000000) [0, 0, 0, 0, 0, …]",
    );
  });

  it("previews a map and a set from their first five entries", () => {
    const numbers = Array.from({ length: 100_000 }, (_, index) => index);

    expect(describeValue(new Set(numbers)).preview).toBe(
      "Set(100000) {0, 1, 2, 3, 4, …}",
    );
    expect(
      describeValue(new Map(numbers.map((number) => [number, number]))).preview,
    ).toBe("Map(100000) {0 => 0, 1 => 1, 2 => 2, 3 => 3, 4 => 4, …}");
  });

  it("does not list the keys of a collapsed object", () => {
    const reads = { keys: 0, descriptors: 0 };
    const node = describeValue(watch({ a: 1, b: 2 }, reads));

    expect(showCollapsed(node)).toBe("{…}");
    expect(node.hasChildren).toBe(true);
    expect(reads.keys).toBe(0);

    node.children();

    expect(reads.keys).toBe(1);
    expect(node.preview).toBe("{a: 1, b: 2}");
  });

  it("lists the keys of an object once, however often it is read afterwards", () => {
    const reads = { keys: 0, descriptors: 0 };
    const node = describeValue(watch({ a: { b: 1 } }, reads));

    node.children();
    node.children();
    void node.preview;
    getMatches(node, "b", 1000);
    getCopyText(node);

    expect(reads.keys).toBe(1);
  });

  it("finds out that an object is empty only when it is opened", () => {
    class Park {}

    for (const [value, before, after] of [
      [{}, "{…}", "{}"],
      [new Park(), "Park {…}", "Park {}"],
      [[], "Array(0) []", "Array(0) []"],
      [new Date(0), "1970-01-01T00:00:00.000Z", "1970-01-01T00:00:00.000Z"],
    ] as const) {
      const node = describeValue(value);

      expect(node.preview).toBe(before);
      expect(node.hasChildren).toBe(true);
      expect(node.children()).toEqual([]);
      expect(node.hasChildren).toBe(false);
      expect(node.preview).toBe(after);
    }
  });

  it("creates a hundred rows at most for each range that is opened", () => {
    const root = describeValue(new Uint8Array(3_000_000));
    let created = 0;
    let node: InspectorNode | undefined = root;

    while (node?.hasChildren) {
      const children: readonly InspectorNode[] = node.children();
      expect(children.length).toBeLessThanOrEqual(100);
      created += children.length;
      node = children.findLast((child) => child.preview !== "Properties");
    }

    expect(node?.id).toBe("$/[2999999]");
    expect(created).toBe(304);
  });

  it("does not look for named properties on a list too long to scan", () => {
    const reads = { keys: 0, descriptors: 0 };
    const node = describeValue(
      watch(new Array<number>(200_000).fill(1), reads),
    );

    node.children()[0]?.children()[0]?.children();

    expect(reads.keys).toBe(0);
    expect(reads.descriptors).toBeLessThan(120);
  });

  it("reads a map from its start again only when asked to go backwards", () => {
    const numbers = Array.from({ length: 1000 }, (_, index) => index);
    const root = describeValue(new Set(numbers));
    const ranges = root.children();

    expect(ranges[9]?.children()[99]?.preview).toBe("999");
    expect(ranges[0]?.children()[0]?.preview).toBe("0");
    expect(ranges[5]?.children()[0]?.preview).toBe("500");
  });

  it("copies the real values of a long list and none of its ranges", () => {
    const list = Array.from({ length: 250 }, (_, index) => index);

    const copy = getCopyText(describeValue({ list }));
    const lines = copy.text.split("\n");

    expect(copy.isComplete).toBe(true);
    expect(lines).toHaveLength(254);
    expect(lines[1]).toBe("  list: [");
    expect(lines[2]).toBe("    0,");
    expect(lines[251]).toBe("    249,");
    expect(copy.text).not.toContain("Items");
  });

  it("copies the first values of a huge list when it is the whole value", () => {
    const copy = getCopyText(describeValue(new Uint8Array(3_000_000)), 50);
    const lines = copy.text.split("\n");

    expect(copy.isComplete).toBe(false);
    expect(lines[0]).toBe("Uint8Array [");
    expect(lines).toHaveLength(52);
    expect(lines.at(-2)).toBe("  …");
    expect(lines.at(-1)).toBe("]");
  });

  suite("named properties of a list too long to scan", () => {
    const tag = Symbol("tag");

    function tagged(): Uint8Array {
      return Object.assign(new Uint8Array(100_001), {
        note: "needle",
        [tag]: "needle too",
      });
    }

    it("offers them behind a row of their own, read only when it is opened", () => {
      const reads = { keys: 0, descriptors: 0 };
      const root = describeValue(
        watch(new Array<number>(100_001).fill(1), reads),
      );
      const properties = root.children().at(-1);

      expect(properties?.kind).toBe("range");
      expect(properties?.preview).toBe("Properties");
      expect(properties?.id).toBe("$/~p");
      expect(properties?.path).toBe("$");
      expect(properties?.hasChildren).toBe(true);
      expect(properties?.size).toBeUndefined();
      expect(reads.keys).toBe(0);

      expect(properties?.children()).toEqual([]);
      expect(reads.keys).toBe(1);
      expect(properties?.hasChildren).toBe(false);
      expect(properties?.size).toBe(1);
    });

    it("lists string and symbol keys once opened, under their usual ids", () => {
      const root = describeValue(tagged());
      const properties = root.children().at(-1);

      expect(
        properties
          ?.children()
          .map((child) => [child.id, child.path, child.preview]),
      ).toEqual([
        ["$/.note", "$.note", '"needle"'],
        ["$/@0", "$[Symbol(tag)]", '"needle too"'],
      ]);
      expect(getNodeTrail(root, "$/.note").map((node) => node.id)).toEqual([
        "$",
        "$/~p",
        "$/.note",
      ]);
    });

    it("cannot find a named property by id before the row is opened", () => {
      expect(getNodeTrail(describeValue(tagged()), "$/.note")).toEqual([]);
    });

    it("says a search is incomplete until they are read, then finds them", () => {
      const root = describeValue(tagged());

      expect(getMatches(root, "needle", 500_000)).toEqual({
        ids: [],
        isComplete: false,
      });

      root.children().at(-1)?.children();

      expect(getMatches(root, "needle", 500_000)).toEqual({
        ids: ["$/.note", "$/@0"],
        isComplete: true,
      });
    });

    it("says a copy is partial until they are read, then includes them", () => {
      const root = describeValue(tagged());
      const before = getCopyText(root, 200_000);

      root.children().at(-1)?.children();
      const after = getCopyText(root, 200_000);

      expect(before.isComplete).toBe(false);
      expect(before.text).not.toContain("needle");
      expect(after.isComplete).toBe(true);
      expect(after.text.split("\n").slice(-3)).toEqual([
        '  note: "needle",',
        '  Symbol(tag): "needle too",',
        "]",
      ]);
    });

    it("keeps reading them straight away for a list short enough to scan", () => {
      const short = Object.assign(new Uint8Array(100_000), { note: "needle" });

      expect(getMatches(describeValue(short), "needle", 500_000)).toEqual({
        ids: ["$/.note"],
        isComplete: true,
      });
    });
  });
});
