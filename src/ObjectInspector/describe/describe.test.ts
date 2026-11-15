import { describe as suite, expect, it } from "vitest";
import { describeValue, type InspectorNode } from "./describe.js";
import { getNode } from "./getNode.js";

function opened(value: unknown): InspectorNode {
  const node = describeValue(value);
  node.children();
  return node;
}

function childrenOf(value: unknown): readonly InspectorNode[] {
  return describeValue(value).children();
}

function summary(node: InspectorNode): [string, string, string] {
  return [node.id, node.kind, node.preview];
}

suite("describe", () => {
  suite("primitives", () => {
    it.each([
      ["text", "string", '"text"'],
      ["", "string", '""'],
      [42, "number", "42"],
      [-0, "number", "-0"],
      [Number.NaN, "number", "NaN"],
      [Number.POSITIVE_INFINITY, "number", "Infinity"],
      [10n, "bigint", "10n"],
      [true, "boolean", "true"],
      [null, "null", "null"],
      [undefined, "undefined", "undefined"],
      [Symbol("id"), "symbol", "Symbol(id)"],
    ])("describes %s as a %s leaf", (value, kind, preview) => {
      const node = describeValue(value);

      expect(node.kind).toBe(kind);
      expect(node.preview).toBe(preview);
      expect(node.hasChildren).toBe(false);
      expect(node.children()).toEqual([]);
    });

    it("cuts a long string and marks the cut", () => {
      const node = describeValue("a".repeat(200));

      expect(node.preview).toBe(`"${"a".repeat(80)}…"`);
    });

    it("keeps a multi-line string on one line", () => {
      expect(describeValue("first\nsecond").preview).toBe('"first\\nsecond"');
    });
  });

  suite("objects", () => {
    it("lists properties in definition order with their own previews", () => {
      const root = describeValue({
        name: "Yellowstone",
        animals: ["bison", "wolf"],
      });

      expect(root.kind).toBe("object");
      expect(root.preview).toBe("{…}");
      root.children();
      expect(root.preview).toBe('{name: "Yellowstone", animals: Array(2)}');
      expect(root.children().map(summary)).toEqual([
        ["$/.name", "string", '"Yellowstone"'],
        ["$/.animals", "array", 'Array(2) ["bison", "wolf"]'],
      ]);
    });

    it("gives each node a readable path", () => {
      const root = describeValue({ parks: [{ "common name": "Bison" }] });
      const park = root.children()[0]?.children()[0];

      expect(park?.path).toBe("$.parks[0]");
      expect(park?.children()[0]?.path).toBe('$.parks[0]["common name"]');
    });

    it("names the class of an instance and leaves plain objects unnamed", () => {
      class Park {
        name = "Yellowstone";
      }

      expect(describeValue(new Park()).typeName).toBe("Park");
      expect(opened(new Park()).preview).toBe('Park {name: "Yellowstone"}');
      expect(opened({}).preview).toBe("{}");
    });

    it("describes an object without a prototype", () => {
      const bare = Object.assign(Object.create(null) as object, { a: 1 });
      const node = opened(bare);

      expect(node.kind).toBe("object");
      expect(node.typeName).toBeUndefined();
      expect(node.preview).toBe("{a: 1}");
    });

    it("previews at most five members and marks the rest", () => {
      const node = opened({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 });

      expect(node.preview).toBe("{a: 1, b: 2, c: 3, d: 4, e: 5, …}");
      expect(node.children()).toHaveLength(6);
    });

    it("quotes keys that are not identifiers", () => {
      expect(opened({ "two words": 1, "": 2 }).preview).toBe(
        '{"two words": 1, "": 2}',
      );
    });

    it("hides properties that are not enumerable", () => {
      const value = Object.defineProperty({ shown: 1 }, "hidden", { value: 2 });

      expect(childrenOf(value).map((child) => child.label)).toEqual([
        { type: "property", key: "shown" },
      ]);
    });

    it("lists symbol keys after string keys", () => {
      const tag = Symbol("tag");
      const children = childrenOf({ [tag]: 1, name: "x" });

      expect(children.map((child) => child.label)).toEqual([
        { type: "property", key: "name" },
        { type: "symbol", key: tag },
      ]);
      expect(children[1]?.path).toBe("$[Symbol(tag)]");
    });
  });

  suite("arrays", () => {
    it("labels items by index", () => {
      const children = childrenOf(["bison", "wolf"]);

      expect(children.map((child) => child.label)).toEqual([
        { type: "index", index: 0 },
        { type: "index", index: 1 },
      ]);
      expect(children.map((child) => child.id)).toEqual(["$/[0]", "$/[1]"]);
    });

    it("reports the full length of a sparse array and shows its holes as one row each", () => {
      const sparse: unknown[] = [];
      sparse[60] = "last";
      const node = describeValue(sparse);
      const [hole, last] = node.children();

      expect(node.preview).toBe("Array(61) [<5 empty items>, …]");
      expect(node.children()).toHaveLength(2);
      expect(hole?.kind).toBe("hole");
      expect(hole?.preview).toBe("<60 empty items>");
      expect(hole?.label).toBeUndefined();
      expect(hole?.path).toBe("$[0]");
      expect(hole?.hasChildren).toBe(false);
      expect(last?.label).toEqual({ type: "index", index: 60 });
    });

    it("shows holes before, between and after the items of an array", () => {
      const sparse: unknown[] = [];
      sparse[1] = "a";
      sparse[4] = "b";
      sparse.length = 6;
      const tagged = Object.assign(new Array<number>(2), { note: "x" });

      expect(
        describeValue(sparse)
          .children()
          .map((child) => child.preview),
      ).toEqual([
        "<1 empty item>",
        '"a"',
        "<2 empty items>",
        '"b"',
        "<1 empty item>",
      ]);
      expect(
        describeValue(tagged)
          .children()
          .map((child) => child.preview),
      ).toEqual(["<2 empty items>", '"x"']);
      expect(
        describeValue([1, 2])
          .children()
          .map((child) => child.kind),
      ).toEqual(["number", "number"]);
    });

    it("shows extra properties set on an array", () => {
      const tagged = Object.assign([1], { note: "x" });

      expect(childrenOf(tagged).map((child) => child.label)).toEqual([
        { type: "index", index: 0 },
        { type: "property", key: "note" },
      ]);
    });

    it("describes a typed array as an array with its own name", () => {
      const node = describeValue(new Uint8Array([1, 2]));

      expect(node.kind).toBe("array");
      expect(node.preview).toBe("Uint8Array(2) [1, 2]");
    });

    it("distinguishes an index from a string key that looks like one", () => {
      const ids = childrenOf({ 0: "object key", list: ["array item"] }).map(
        (child) => child.id,
      );

      expect(ids).toEqual(["$/.0", "$/.list"]);
    });
  });

  suite("collections and built-ins", () => {
    it("describes map entries with a key and a value each", () => {
      const node = describeValue(new Map<unknown, unknown>([["a", 1]]));
      const entry = node.children()[0];

      expect(node.preview).toBe('Map(1) {"a" => 1}');
      expect(entry?.kind).toBe("entry");
      expect(entry?.preview).toBe('"a" => 1');
      expect(entry?.children().map(summary)).toEqual([
        ["$/#0/key", "string", '"a"'],
        ["$/#0/value", "number", "1"],
      ]);
    });

    it("lets a map use objects as keys", () => {
      const key = { id: 1 };
      const entry = describeValue(new Map([[key, "x"]])).children()[0];

      expect(entry?.children()[0]?.value).toBe(key);
      expect(entry?.children()[0]?.children()).toHaveLength(1);
    });

    it("describes set items by position", () => {
      const node = describeValue(new Set(["a", "b"]));

      expect(node.preview).toBe('Set(2) {"a", "b"}');
      expect(node.children().map((child) => child.id)).toEqual([
        "$/#0",
        "$/#1",
      ]);
    });

    it.each([
      [
        new Date("2026-11-14T10:00:00.000Z"),
        "date",
        "2026-11-14T10:00:00.000Z",
      ],
      [new Date(Number.NaN), "date", "Invalid Date"],
      [/ab+c/giu, "regexp", "/ab+c/giu"],
      [new TypeError("boom"), "error", "TypeError: boom"],
      [new Error(""), "error", "Error"],
    ])("describes %s as %s", (value, kind, preview) => {
      const node = describeValue(value);

      expect(node.kind).toBe(kind);
      expect(node.preview).toBe(preview);
    });

    it("tells functions and classes apart", () => {
      function greet() {}
      class Park {}

      expect(describeValue(greet).preview).toBe("ƒ greet()");
      expect(describeValue(() => {}).preview).toBe("ƒ ()");
      expect(describeValue(Park).preview).toBe("class Park");
      expect(describeValue(greet).kind).toBe("function");
    });
  });

  suite("circular references", () => {
    it("stops at a value that contains itself and points back to it", () => {
      const park: Record<string, unknown> = { name: "Yellowstone" };
      park.self = park;
      const self = describeValue(park).children()[1];

      expect(self?.kind).toBe("circular");
      expect(self?.preview).toBe("[Circular $]");
      expect(self?.hasChildren).toBe(false);
    });

    it("points back to the exact ancestor in a longer cycle", () => {
      const animal: Record<string, unknown> = {};
      const park = { animals: [animal] };
      animal.park = park.animals;
      const back = describeValue(park)
        .children()[0]
        ?.children()[0]
        ?.children()[0];

      expect(back?.preview).toBe("[Circular $.animals]");
    });

    it("shows the same object twice when it is shared and not circular", () => {
      const shared = { id: 1 };
      const kinds = childrenOf({ first: shared, second: shared }).map(
        (child) => child.kind,
      );

      expect(kinds).toEqual(["object", "object"]);
    });

    it("detects a map that contains itself", () => {
      const map = new Map<string, unknown>();
      map.set("self", map);
      const value = describeValue(map).children()[0]?.children()[1];

      expect(value?.kind).toBe("circular");
    });
  });

  suite("getters", () => {
    it("shows a getter without running it", () => {
      let runs = 0;
      const value = {
        get expensive() {
          runs++;
          return 1;
        },
      };
      const root = describeValue(value);
      const getter = root.children()[0];

      expect(getter?.kind).toBe("getter");
      expect(getter?.preview).toBe("(...)");
      expect(root.preview).toBe("{expensive: (...)}");
      expect(runs).toBe(0);
    });
  });

  suite("identity and laziness", () => {
    it("keeps ids distinct for keys that contain the separator", () => {
      const ids = new Set<string>();
      const walk = (node: InspectorNode) => {
        ids.add(node.id);
        node.children().forEach(walk);
      };
      const root = describeValue({
        "a/.b": 1,
        a: { b: 2 },
        "a~1.b": 3,
        "~": 4,
      });
      walk(root);

      expect(ids.size).toBe(6);
    });

    it("gives the same id to the same place after the data is replaced", () => {
      const before = describeValue({ park: { name: "Yellowstone" } });
      const after = describeValue({ park: { name: "Zion", area: 593 } });

      expect(after.children()[0]?.children()[0]?.id).toBe(
        before.children()[0]?.children()[0]?.id,
      );
    });

    it("reads nothing from a value until it is asked to", () => {
      let reads = 0;
      const watched = new Proxy(
        { a: 1 },
        {
          ownKeys(target) {
            reads++;
            return Reflect.ownKeys(target);
          },
          getPrototypeOf(target) {
            reads++;
            return Reflect.getPrototypeOf(target);
          },
        },
      );
      const node = describeValue({ watched }).children()[0];

      expect(reads).toBe(0);
      expect(node?.children()).toHaveLength(1);
      expect(reads).toBeGreaterThan(0);
    });

    it("builds children once and returns the same list afterwards", () => {
      const root = describeValue({ a: { b: 1 } });

      expect(root.children()).toBe(root.children());
    });

    it("walks ten thousand levels deep without overflowing the stack", () => {
      let value: Record<string, unknown> = {};
      for (let depth = 0; depth < 10_000; depth++) {
        value = { child: value };
      }

      let node: InspectorNode | undefined = describeValue(value);
      let levels = 0;
      while (node?.children().length) {
        expect(node.preview).toBe("{child: {…}}");
        node = node.children()[0];
        levels++;
      }

      expect(levels).toBe(10_000);
    });

    it("reaches the last of a hundred thousand items through its ranges", () => {
      const node = describeValue(Array.from({ length: 100_000 }, (_, i) => i));

      expect(node.children()).toHaveLength(10);
      expect(getNode(node, "$/[99999]")?.preview).toBe("99999");
    });
  });
});
