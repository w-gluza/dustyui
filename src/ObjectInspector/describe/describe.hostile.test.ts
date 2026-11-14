import { describe as suite, expect, it } from "vitest";
import { describeValue, type InspectorNode } from "./describe.js";

function readEverything(node: InspectorNode): void {
  void node.kind;
  void node.typeName;
  void node.preview;
  void node.childCount;
  node.children().forEach(readEverything);
}

function refuse(): never {
  throw new Error("refused");
}

suite("describe with hostile values", () => {
  it("marks a proxy that refuses to list its keys and still shows its siblings", () => {
    const hostile = new Proxy({}, { ownKeys: refuse });
    const root = describeValue({ before: 1, hostile, after: 2 });
    const [before, broken, after] = root.children();

    expect(broken?.kind).toBe("uninspectable");
    expect(broken?.preview).toBe("Could not be read: refused");
    expect(broken?.childCount).toBe(0);
    expect(before?.preview).toBe("1");
    expect(after?.preview).toBe("2");
  });

  it("marks only the one property a proxy refuses to describe", () => {
    const hostile = new Proxy(
      { fine: 1, broken: 2 },
      {
        getOwnPropertyDescriptor(target, key) {
          return key === "broken"
            ? refuse()
            : Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    const kinds = describeValue(hostile)
      .children()
      .map((child) => child.kind);

    expect(kinds).toEqual(["number", "uninspectable"]);
  });

  it("marks a proxy that refuses to reveal its prototype", () => {
    const hostile = new Proxy({}, { getPrototypeOf: refuse });

    expect(describeValue(hostile).kind).toBe("uninspectable");
  });

  it("marks a revoked proxy", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    const node = describeValue({ proxy }).children()[0];

    expect(node?.kind).toBe("uninspectable");
    expect(() => readEverything(describeValue({ proxy }))).not.toThrow();
  });

  it("copes with a thrown value that cannot be turned into text", () => {
    const unprintable = {
      get message(): string {
        return refuse();
      },
      toString: refuse,
    };
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw unprintable;
        },
      },
    );

    expect(describeValue(hostile).preview).toBe(
      "Could not be read: unknown error",
    );
  });

  it("never runs a getter that would throw", () => {
    const value = {
      get broken(): never {
        return refuse();
      },
    };

    expect(() => readEverything(describeValue(value))).not.toThrow();
    expect(describeValue(value).children()[0]?.kind).toBe("getter");
  });

  it("ignores custom text conversion on the value", () => {
    const value = {
      toString: refuse,
      valueOf: refuse,
      toJSON: refuse,
      get [Symbol.toStringTag](): string {
        return refuse();
      },
    };

    expect(() => readEverything(describeValue(value))).not.toThrow();
    expect(describeValue(value).kind).toBe("object");
  });

  it("does not run a getter standing in for the constructor", () => {
    const prototype = Object.defineProperty({}, "constructor", { get: refuse });
    const value: object = Object.create(prototype);

    expect(describeValue(value).typeName).toBeUndefined();
  });

  it("is not fooled by an object that only inherits from a built-in", () => {
    const fakes = [Map, Set, Date, RegExp].map(
      (builtIn) => Object.create(builtIn.prototype) as object,
    );

    for (const fake of fakes) {
      expect(() => readEverything(describeValue(fake))).not.toThrow();
      expect(describeValue(fake).kind).toBe("object");
    }
  });

  it("ignores overridden iteration on a map or set subclass", () => {
    class HostileMap extends Map<string, number> {
      override forEach = refuse;
      override entries = refuse;
      override get size(): number {
        return refuse();
      }
    }
    const node = describeValue(new HostileMap([["a", 1]]));

    expect(node.kind).toBe("map");
    expect(node.preview).toBe(
      'Map(1) {"a" => 1, forEach: ƒ refuse(), entries: ƒ refuse()}',
    );
  });

  it("does not trust getters shadowing a regular expression's flags", () => {
    const pattern = Object.defineProperty(/a/g, "flags", { get: refuse });
    Object.defineProperty(pattern, "source", { get: refuse });

    expect(describeValue(pattern).preview).toBe("/a/g");
  });

  it("does not trust a getter shadowing a function's name", () => {
    const fn = Object.defineProperty(() => {}, "name", { get: refuse });

    expect(describeValue(fn).preview).toBe("ƒ ()");
  });

  it.each([
    "__proto__",
    "constructor",
    "",
    "\ud800",
    "a\nb",
    "k".repeat(10_000),
  ])("handles the awkward key %j", (key) => {
    const value: object = Object.defineProperty({}, key, {
      value: 1,
      enumerable: true,
    });
    const root = describeValue(value);

    expect(root.children()[0]?.label).toEqual({ type: "property", key });
    expect(root.preview).not.toContain("\n");
    expect(root.preview.length).toBeLessThan(100);
  });

  it("recognises a built-in type behind a class of its own", () => {
    class Register extends Map<string, number> {}
    class Stamp extends Date {}

    expect(describeValue(new Register([["a", 1]])).kind).toBe("map");
    expect(describeValue(new Stamp(0)).kind).toBe("date");
  });

  it("recognises a typed array whose prototype was replaced", () => {
    const bytes = new Uint8Array(3);
    Object.setPrototypeOf(bytes, Object.prototype);

    expect(describeValue(bytes).kind).toBe("array");
    expect(describeValue(new DataView(new ArrayBuffer(2))).kind).toBe("object");
  });

  it("shows a map as a plain object once its prototype is replaced with the plain one", () => {
    const map = new Map([[1, 2]]);
    Object.setPrototypeOf(map, Object.prototype);

    expect(describeValue(map).kind).toBe("object");
    expect(describeValue(map).childCount).toBe(0);
  });
});
