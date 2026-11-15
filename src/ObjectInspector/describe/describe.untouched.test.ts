import fc from "fast-check";
import { describe as suite, expect, it } from "vitest";
import { getCopyText } from "../getCopyText.js";
import { getMatches } from "../search/getMatches.js";
import { describeValue, type InspectorNode } from "./describe.js";

interface Counter {
  runs: number;
}

function count(counter: Counter): () => never {
  return () => {
    counter.runs++;
    throw new Error("user code ran");
  };
}

function read(root: InspectorNode): string[] {
  const seen: string[] = [];
  const pending = [root];
  for (
    let node = pending.pop();
    node && seen.length < 500;
    node = pending.pop()
  ) {
    seen.push(`${node.kind}|${node.typeName ?? ""}|${node.preview}`);
    pending.push(...node.children());
  }
  getMatches(root, "a", 5000);
  getCopyText(root);
  return seen;
}

function inspect(value: unknown): InspectorNode {
  const root = describeValue({ nested: [value], direct: value });
  read(root);
  const direct = root.children()[1];
  if (!direct) {
    throw new Error("missing node");
  }
  return direct;
}

suite("describe never runs code that belongs to the value", () => {
  it("does not read an error's message through a getter", () => {
    const counter = { runs: 0 };
    const error = new RangeError("original");
    Object.defineProperty(error, "message", {
      enumerable: true,
      get: count(counter),
    });

    const node = inspect(error);

    expect(counter.runs).toBe(0);
    expect(node.kind).toBe("error");
    expect(node.preview).toBe("RangeError");
    expect(node.children().map((child) => child.preview)).toContain("(...)");
  });

  it("reads an error's message when it is plain data", () => {
    expect(inspect(new RangeError("too far")).preview).toBe(
      "RangeError: too far",
    );
  });

  it("does not read a constructor through a getter", () => {
    const counter = { runs: 0 };
    class Trap {
      readonly size = 1;
    }
    Object.defineProperty(Trap.prototype, "constructor", {
      get: count(counter),
    });

    const node = inspect(new Trap());

    expect(counter.runs).toBe(0);
    expect(node.typeName).toBeUndefined();
    expect(node.preview).toBe("{size: 1}");
  });

  it("does not read a constructor's name through a getter", () => {
    const counter = { runs: 0 };
    class Named {
      static get name(): string {
        return count(counter)();
      }
    }

    const node = inspect(new Named());

    expect(counter.runs).toBe(0);
    expect(node.typeName).toBeUndefined();
    expect(node.preview).toBe("{}");
  });

  it("shows a date without calling its own methods", () => {
    const counter = { runs: 0 };
    class Stamp extends Date {
      override toISOString = count(counter);
      override getTime = count(counter);
      override toString = count(counter);
      override toJSON = count(counter);
      override valueOf = count(counter);
    }

    const node = inspect(new Stamp(0));

    expect(counter.runs).toBe(0);
    expect(node.kind).toBe("date");
    expect(node.preview).toBe("1970-01-01T00:00:00.000Z");
  });

  it("shows a set and a map without calling their own methods", () => {
    const counter = { runs: 0 };
    class Bag extends Set<number> {
      override get size(): number {
        return count(counter)();
      }
      override forEach = count(counter);
      override values = count(counter);
      override [Symbol.iterator] = count(counter);
    }
    class Index extends Map<string, number> {
      override get size(): number {
        return count(counter)();
      }
      override forEach = count(counter);
      override entries = count(counter);
      override [Symbol.iterator] = count(counter);
    }

    const bag = inspect(new Bag([1, 2]));
    const index = inspect(new Index([["a", 1]]));

    expect(counter.runs).toBe(0);
    expect(bag.kind).toBe("set");
    expect(bag.preview.startsWith("Set(2) {1, 2")).toBe(true);
    expect(index.kind).toBe("map");
    expect(index.preview.startsWith('Map(1) {"a" => 1')).toBe(true);
  });

  it("shows a pattern without calling its own getters", () => {
    const counter = { runs: 0 };
    class Pattern extends RegExp {
      override get source(): string {
        return count(counter)();
      }
      override get flags(): string {
        return count(counter)();
      }
      override get global(): boolean {
        return count(counter)();
      }
      override toString = count(counter);
    }

    const node = inspect(new Pattern("a+", "gi"));

    expect(counter.runs).toBe(0);
    expect(node.kind).toBe("regexp");
    expect(node.preview).toBe("/a+/gi");
  });

  it("shows a typed array without calling its own length", () => {
    const counter = { runs: 0 };
    class Bytes extends Uint8Array {
      override get length(): number {
        return count(counter)();
      }
    }

    const node = inspect(new Bytes(3));

    expect(counter.runs).toBe(0);
    expect(node.kind).toBe("array");
    expect(node.preview).toBe("Bytes(3) [0, 0, 0]");
  });

  it("tells a class from a function without calling the value's toString", () => {
    const counter = { runs: 0 };
    function greet() {
      return "hello";
    }
    class Park {}
    Object.defineProperty(greet, "toString", { value: count(counter) });
    Object.defineProperty(Park, "toString", { value: count(counter) });

    const plain = inspect(greet);
    const park = inspect(Park);

    expect(counter.runs).toBe(0);
    expect(plain.preview).toBe("ƒ greet()");
    expect(park.preview).toBe("class Park");
  });

  it("does not mistake a function whose source starts with the word for a class", () => {
    const classes = (list: string[]) => list;
    const holder = {
      classify() {
        return 1;
      },
    };

    expect(describeValue(classes).preview).toBe("ƒ classes()");
    expect(describeValue(holder.classify).preview).toBe("ƒ classify()");
    expect(describeValue(class {}).preview).toBe("class");
    expect(describeValue(class Park {}).preview).toBe("class Park");
  });

  it("shows characters that reorder or break a line as escapes", () => {
    const root = describeValue({
      "evil\u202Ekey": "user\u202Enimda\nnext\u2066",
    });
    const child = root.children()[0];

    expect(child?.preview).toBe('"user\\u202enimda\\nnext\\u2066"');
    expect(root.preview).toBe(
      '{"evil\\u202ekey": "user\\u202enimda\\nnext\\u2066"}',
    );
  });

  it("does not call conversion hooks", () => {
    const counter = { runs: 0 };
    const value = {
      toString: count(counter),
      toJSON: count(counter),
      valueOf: count(counter),
      [Symbol.toPrimitive]: count(counter),
      get [Symbol.toStringTag](): string {
        return count(counter)();
      },
    };
    const keyed = new Map([[value, value]]);

    inspect(value);
    inspect(keyed);
    inspect(new Set([value]));

    expect(counter.runs).toBe(0);
  });

  it("shows a nested value that cannot be read, inside its parent's preview", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    const root = describeValue({ gone: proxy, kept: 1 });
    root.children();

    expect(root.preview).toMatch(/^\{gone: Could not be read: .+, kept: 1\}$/u);
  });

  it("shows a function whose name cannot be read as uninspectable", () => {
    const guarded = new Proxy(function original() {}, {
      getOwnPropertyDescriptor(target, key) {
        if (key === "name") {
          throw new Error("no name for you");
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    expect(describeValue(guarded).preview).toBe(
      "Could not be read: no name for you",
    );
  });

  it("survives a proxy whose traps fail at random", () => {
    const traps = [
      "getPrototypeOf",
      "ownKeys",
      "getOwnPropertyDescriptor",
      "get",
      "has",
      "isExtensible",
    ] as const;
    const targets = fc.oneof(
      fc.dictionary(fc.string(), fc.anything()),
      fc.array(fc.anything()),
      fc.constant(new Map([[1, 2]])),
      fc.constant(new Set([1])),
      fc.constant(new Date(0)),
      fc.constant(/a/u),
      fc.constant(new Error("x")),
      fc.constant(function named() {}),
    );

    fc.assert(
      fc.property(
        targets,
        fc.subarray([...traps]),
        fc.integer({ min: 0, max: 6 }),
        (target, failing, allowed) => {
          let calls = 0;
          const handler: Record<string, (...input: never[]) => unknown> = {};
          for (const trap of failing) {
            const forward = Reflect[trap] as (...input: never[]) => unknown;
            handler[trap] = (...input) => {
              calls++;
              if (calls > allowed) {
                throw new Error("trap failed");
              }
              return forward(...input);
            };
          }
          const proxy = new Proxy(target, handler);

          expect(() =>
            read(describeValue({ proxy, list: [proxy] })),
          ).not.toThrow();
        },
      ),
    );
  });
});
