import { describe as suite, expect, it } from "vitest";
import { describeValue } from "./describe.js";
import { getNode, getNodeTrail } from "./getNode.js";
import { getChildId, getPropertiesId, getRangeId, ROOT_ID } from "./getPath.js";

const tag = Symbol("tag");
const value = {
  "a/b": 1,
  animals: Array.from({ length: 250 }, (_, index) => ({ index })),
  byName: new Map([["puma", 1]]),
  seen: new Set(["x", "y"]),
  [tag]: true,
};
const animals = getChildId(ROOT_ID, { type: "property", key: "animals" });

suite("ids built by hand match the ids of the rows", () => {
  it("builds the id of a property, an item, a symbol key, a map entry and a set item", () => {
    const root = describeValue(value);
    const byName = getChildId(ROOT_ID, { type: "property", key: "byName" });
    const entry = getChildId(byName, { type: "entry", index: 0 });
    const seen = getChildId(ROOT_ID, { type: "property", key: "seen" });

    expect(
      [
        getChildId(ROOT_ID, { type: "property", key: "a/b" }),
        getChildId(animals, { type: "index", index: 123 }),
        getChildId(ROOT_ID, { type: "symbol", key: tag, position: 0 }),
        getChildId(entry, { type: "entryKey" }),
        getChildId(entry, { type: "entryValue" }),
        getChildId(seen, { type: "item", index: 1 }),
      ].map((id) => getNode(root, id)?.path),
    ).toEqual([
      '$["a/b"]',
      "$.animals[123]",
      "$[Symbol(tag)]",
      "$.byName[entry 0].key",
      "$.byName[entry 0].value",
      "$.seen[item 1]",
    ]);
  });

  it("builds the id of a range from its first position and the one after its last", () => {
    const root = describeValue(value);
    const range = getRangeId(animals, "items", 100, 200);

    expect(range).toBe("$/.animals/~i100-199");
    expect(getNode(root, range)?.preview).toBe("Items 100 to 199");
  });

  it("builds the id of the properties row of a very long list", () => {
    const root = describeValue(new Uint8Array(100_001));

    expect(getNode(root, getPropertiesId(ROOT_ID))?.preview).toBe("Properties");
  });

  it("lists the rows to open on the way to a value, ranges included", () => {
    const item = getChildId(animals, { type: "index", index: 123 });

    expect(
      getNodeTrail(describeValue(value), item).map((node) => node.id),
    ).toEqual([ROOT_ID, animals, getRangeId(animals, "items", 100, 200), item]);
  });
});
