import fc from "fast-check";
import { describe as suite, expect, it } from "vitest";
import { describeValue, type InspectorNode } from "./describe.js";

const anyValue = fc.anything({
  maxDepth: 4,
  withBigInt: true,
  withBoxedValues: true,
  withDate: true,
  withMap: true,
  withNullPrototype: true,
  withObjectString: true,
  withSet: true,
  withSparseArray: true,
  withTypedArray: true,
  withUnicodeString: true,
});

const MAX_NODES = 2_000;
const MAX_PREVIEW_LENGTH = 600;

function walk(root: InspectorNode): InspectorNode[] {
  const visited: InspectorNode[] = [];
  const pending = [root];
  for (
    let node = pending.pop();
    node && visited.length < MAX_NODES;
    node = pending.pop()
  ) {
    visited.push(node);
    pending.push(...node.children());
  }
  return visited;
}

function snapshot(root: InspectorNode): unknown[] {
  return walk(root).map((node) => [
    node.id,
    node.path,
    node.kind,
    node.typeName,
    node.preview,
    node.childCount,
  ]);
}

suite("describe, for any value", () => {
  it("never throws and always gives a short single-line preview", () => {
    fc.assert(
      fc.property(anyValue, (value) => {
        for (const node of walk(describeValue(value))) {
          expect(typeof node.kind).toBe("string");
          expect(node.preview).not.toMatch(/[\p{Cc}\u2028\u2029]/u);
          expect(node.preview.length).toBeLessThanOrEqual(MAX_PREVIEW_LENGTH);
        }
      }),
    );
  });

  it("gives every node a different id", () => {
    fc.assert(
      fc.property(anyValue, (value) => {
        const ids = walk(describeValue(value)).map((node) => node.id);

        expect(new Set(ids).size).toBe(ids.length);
      }),
    );
  });

  it("reports as many children as it returns, and returns the same ones each time", () => {
    fc.assert(
      fc.property(anyValue, (value) => {
        for (const node of walk(describeValue(value))) {
          expect(node.children()).toHaveLength(node.childCount);
          expect(node.children()).toBe(node.children());
        }
      }),
    );
  });

  it("labels each property with the key that leads to its value", () => {
    fc.assert(
      fc.property(anyValue, (value) => {
        for (const parent of walk(describeValue(value))) {
          for (const child of parent.children()) {
            const { label } = child;
            if (label?.type === "property" || label?.type === "symbol") {
              const owner = parent.value as Record<PropertyKey, unknown>;
              expect(Object.is(child.value, owner[label.key])).toBe(true);
            }
            if (label?.type === "index" && parent.kind === "array") {
              const owner = parent.value as ArrayLike<unknown>;
              expect(Object.is(child.value, owner[label.index])).toBe(true);
            }
          }
        }
      }),
    );
  });

  it("describes the same value the same way twice", () => {
    fc.assert(
      fc.property(anyValue, (value) => {
        expect(snapshot(describeValue(value))).toEqual(
          snapshot(describeValue(value)),
        );
      }),
    );
  });

  it("gives children only to values that can hold other values", () => {
    const leaves = new Set([
      "string",
      "number",
      "bigint",
      "boolean",
      "null",
      "undefined",
      "symbol",
      "getter",
      "circular",
      "uninspectable",
    ]);
    fc.assert(
      fc.property(anyValue, (value) => {
        for (const node of walk(describeValue(value))) {
          if (leaves.has(node.kind)) {
            expect(node.childCount).toBe(0);
          }
        }
      }),
    );
  });

  it("never runs a getter, wherever it sits", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), anyValue),
        fc.string(),
        (properties, key) => {
          let runs = 0;
          const value: object = Object.defineProperty({ ...properties }, key, {
            enumerable: true,
            configurable: true,
            get() {
              runs++;
              return 1;
            },
          });

          walk(describeValue({ nested: [value], direct: value }));

          expect(runs).toBe(0);
        },
      ),
    );
  });

  it("always ends a cycle, however the value points back at itself", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 6 }),
        fc.nat(),
        (keys, target) => {
          const chain: object[] = keys.map(() => ({}));
          chain.forEach((link, index) => {
            Object.defineProperty(link, keys[index] ?? "", {
              value: chain[index + 1] ?? chain[target % chain.length],
              enumerable: true,
            });
          });

          const nodes = walk(describeValue(chain[0]));

          expect(nodes.length).toBeLessThan(MAX_NODES);
          expect(nodes.at(-1)?.kind).toBe("circular");
        },
      ),
    );
  });
});
