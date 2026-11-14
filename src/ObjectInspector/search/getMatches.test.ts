import fc from "fast-check";
import { describe as suite, expect, it } from "vitest";
import { describe } from "../describe/describe.js";
import { getNode } from "../describe/getNode.js";
import { getAncestorIds } from "../describe/getPath.js";
import { getHighlightParts } from "./getHighlightParts.js";
import { getMatches } from "./getMatches.js";
import { getSearchStatus } from "./getSearchStatus.js";

const park = {
  name: "Torres del Paine",
  country: "Chile",
  established: 1959,
  animals: [
    { commonName: "Guanaco", nameInSpanish: "guanaco" },
    { commonName: "Puma", nameInSpanish: "puma" },
  ],
};

function search(value: unknown, text: string, limit = 1000) {
  return getMatches(describe(value), text, limit);
}

suite("getMatches", () => {
  it("finds keys and values, ignoring case, in the order the tree shows them", () => {
    expect(search(park, "NAME").ids).toEqual([
      "$/.name",
      "$/.animals/[0]/.commonName",
      "$/.animals/[0]/.nameInSpanish",
      "$/.animals/[1]/.commonName",
      "$/.animals/[1]/.nameInSpanish",
    ]);
    expect(search(park, "puma").ids).toEqual([
      "$/.animals/[1]/.commonName",
      "$/.animals/[1]/.nameInSpanish",
    ]);
  });

  it("finds numbers by their digits", () => {
    expect(search(park, "1959").ids).toEqual(["$/.established"]);
  });

  it("does not match a container by the summary of what is inside it", () => {
    expect(search({ outer: { inner: "needle" } }, "needle").ids).toEqual([
      "$/.outer/.inner",
    ]);
  });

  it("finds text past the point where the row cuts a long string short", () => {
    const value = { note: `${"a".repeat(500)} needle` };

    expect(describe(value).children()[0]?.preview).not.toContain("needle");
    expect(search(value, "needle").ids).toEqual(["$/.note"]);
  });

  it.each(["", "   "])("finds nothing for the blank query %j", (text) => {
    expect(search(park, text)).toEqual({ ids: [], isComplete: true });
  });

  it("ignores spaces around the query", () => {
    expect(search(park, "  chile ").ids).toEqual(["$/.country"]);
  });

  it("stops at the limit and says the search is incomplete", () => {
    const rows = Array.from({ length: 15 }, (_, index) => ({ id: index }));
    const result = search({ rows, last: "id card" }, "id", 21);

    expect(result.isComplete).toBe(false);
    expect(result.ids).toEqual(
      Array.from({ length: 9 }, (_, index) => `$/.rows/[${index}]/.id`),
    );
  });

  it("searches a list as large as the limit", () => {
    const rows = Array.from({ length: 1000 }, (_, index) => `row ${index}`);

    expect(search({ rows }, "row 999", 1002)).toEqual({
      ids: ["$/.rows/[999]"],
      isComplete: true,
    });
  });

  it("skips a list larger than the limit and says the search is incomplete", () => {
    const huge = new Float64Array(5000);

    expect(search({ huge, after: "needle" }, "needle", 1000)).toEqual({
      ids: ["$/.after"],
      isComplete: false,
    });
    expect(search({ huge, after: "needle" }, "0", 1000).ids).toEqual([]);
  });

  it("never runs a getter and survives values that refuse to be read", () => {
    let runs = 0;
    const value = {
      get costly() {
        runs += 1;
        return "needle";
      },
      refuses: new Proxy(
        {},
        {
          ownKeys() {
            throw new Error("no");
          },
        },
      ),
      plain: "needle",
    };

    expect(search(value, "needle").ids).toEqual(["$/.plain"]);
    expect(runs).toBe(0);
  });

  it("finishes on a value that contains itself", () => {
    const loop: Record<string, unknown> = { name: "needle" };
    loop.self = loop;

    expect(search(loop, "needle")).toEqual({
      ids: ["$/.name"],
      isComplete: true,
    });
  });

  it("returns only ids that lead to a node whose key or value holds the query", () => {
    fc.assert(
      fc.property(
        fc.jsonValue({ maxDepth: 4 }),
        fc.string({ minLength: 1, maxLength: 2 }),
        (value, text) => {
          const root = describe(value);
          const { ids, isComplete } = getMatches(root, text, 100_000);

          expect(isComplete).toBe(true);
          expect(new Set(ids).size).toBe(ids.length);
          for (const id of ids) {
            expect(getNode(root, id)?.id).toBe(id);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

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

suite("getHighlightParts", () => {
  it("splits the text around every match, keeping the original letters", () => {
    expect(getHighlightParts("Guanaco guanaco", "GUA")).toEqual([
      { text: "Gua", isMatch: true },
      { text: "naco ", isMatch: false },
      { text: "gua", isMatch: true },
      { text: "naco", isMatch: false },
    ]);
  });

  it("returns the whole text when nothing matches or the query is blank", () => {
    expect(getHighlightParts("Puma", "x")).toEqual([
      { text: "Puma", isMatch: false },
    ]);
    expect(getHighlightParts("Puma", " ")).toEqual([
      { text: "Puma", isMatch: false },
    ]);
  });

  it("leaves text alone when lower-casing changes its length", () => {
    expect(getHighlightParts("İstanbul", "i")).toEqual([
      { text: "İstanbul", isMatch: false },
    ]);
  });

  it("always adds back up to the original text", () => {
    fc.assert(
      fc.property(fc.string(), fc.string({ maxLength: 3 }), (text, query) => {
        const parts = getHighlightParts(text, query);

        expect(parts.map((part) => part.text).join("")).toBe(text);
      }),
      { numRuns: 500 },
    );
  });
});

suite("getSearchStatus", () => {
  const some = { ids: ["a", "b", "c"], isComplete: true };

  it("says nothing for a blank query", () => {
    expect(getSearchStatus(" ", some, -1)).toBe("");
  });

  it("counts the matches before one is chosen", () => {
    expect(getSearchStatus("x", some, -1)).toBe("3 matches");
    expect(getSearchStatus("x", { ids: ["a"], isComplete: true }, -1)).toBe(
      "1 match",
    );
  });

  it("says which match is current", () => {
    expect(getSearchStatus("x", some, 1)).toBe("2 of 3");
  });

  it("says when there are none", () => {
    expect(getSearchStatus("x", { ids: [], isComplete: true }, -1)).toBe(
      "No matches",
    );
  });

  it("says when only part of the value was searched", () => {
    expect(
      getSearchStatus("x", { ids: ["a", "b"], isComplete: false }, -1),
    ).toBe("2 matches in the part that was searched");
    expect(getSearchStatus("x", { ids: [], isComplete: false }, -1)).toBe(
      "No matches in the part that was searched",
    );
  });
});
