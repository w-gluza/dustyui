import { describe as suite, expect, it } from "vitest";
import { describeValue } from "./describe.js";
import { getNode, getNodeTrail } from "./getNode.js";

function trail(value: unknown, id: string): string[] {
  return getNodeTrail(describeValue(value), id).map((node) => node.id);
}

suite("getNode and getNodeTrail", () => {
  it("lists every row from the root down to the node", () => {
    const value = { animals: [{}, { commonName: "Puma" }] };

    expect(trail(value, "$/.animals/[1]/.commonName")).toEqual([
      "$",
      "$/.animals",
      "$/.animals/[1]",
      "$/.animals/[1]/.commonName",
    ]);
    expect(trail(value, "$")).toEqual(["$"]);
    expect(trail(value, "$/.animals/[7]")).toEqual([]);
  });

  it("passes through the ranges that lead to an item of a long list", () => {
    const list = Array.from({ length: 25_000 }, (_, index) => ({ index }));

    expect(trail(list, "$/[12345]/.index")).toEqual([
      "$",
      "$/~i10000-19999",
      "$/~i12300-12399",
      "$/[12345]",
      "$/[12345]/.index",
    ]);
    expect(getNode(describeValue(list), "$/[12345]")?.path).toBe("$[12345]");
  });

  it("finds a range by its own id", () => {
    const root = describeValue(new Uint8Array(25_000));

    expect(getNode(root, "$/~i12300-12399")?.preview).toBe(
      "Items 12,300 to 12,399",
    );
    expect(trail(new Uint8Array(25_000), "$/~i12300-12399")).toEqual([
      "$",
      "$/~i10000-19999",
      "$/~i12300-12399",
    ]);
  });

  it("finds an entry of a long map, an item of a long set and a key of a wide object", () => {
    const numbers = Array.from({ length: 450 }, (_, index) => index);
    const map = new Map(numbers.map((number) => [number, `v${number}`]));
    const wide = Object.fromEntries(
      numbers.map((number) => [`k${number}`, number]),
    );

    expect(trail(map, "$/#321/value")).toEqual([
      "$",
      "$/~e300-399",
      "$/#321",
      "$/#321/value",
    ]);
    expect(trail(new Set(numbers), "$/#449")).toEqual([
      "$",
      "$/~i400-449",
      "$/#449",
    ]);
    expect(trail(wide, "$/.k205")).toEqual(["$", "$/~p200-299", "$/.k205"]);
  });

  it("finds a node by id, including keys that contain a slash", () => {
    const root = describeValue({ "a/b": { c: 1 }, a: { b: 2 } });

    expect(getNode(root, "$/.a~1b/.c")?.path).toBe('$["a/b"].c');
    expect(getNode(root, "$/.a/.b")?.path).toBe("$.a.b");
    expect(getNode(root, "$")).toBe(root);
  });

  it("returns nothing for an id that is not in the value", () => {
    const root = describeValue({ a: 1 });

    expect(getNode(root, "$/.missing")).toBeUndefined();
    expect(getNode(root, "elsewhere")).toBeUndefined();
  });
});
