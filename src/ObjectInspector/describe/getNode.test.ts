import { describe as suite, expect, it } from "vitest";
import { describe } from "./describe.js";
import { getNode } from "./getNode.js";
import { getAncestorIds } from "./getPath.js";

suite("getNode and getAncestorIds", () => {
  it("lists every ancestor from the root down", () => {
    expect(getAncestorIds("$/.animals/[1]/.commonName")).toEqual([
      "$",
      "$/.animals",
      "$/.animals/[1]",
    ]);
    expect(getAncestorIds("$")).toEqual([]);
  });

  it("finds a node by id, including keys that contain a slash", () => {
    const root = describe({ "a/b": { c: 1 }, a: { b: 2 } });

    expect(getNode(root, "$/.a~1b/.c")?.path).toBe('$["a/b"].c');
    expect(getNode(root, "$/.a/.b")?.path).toBe("$.a.b");
    expect(getNode(root, "$")).toBe(root);
  });

  it("returns nothing for an id that is not in the value", () => {
    const root = describe({ a: 1 });

    expect(getNode(root, "$/.missing")).toBeUndefined();
    expect(getNode(root, "elsewhere")).toBeUndefined();
  });
});
