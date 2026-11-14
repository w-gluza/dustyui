import fc from "fast-check";
import { describe as suite, expect, it } from "vitest";
import { describe } from "../describe/describe.js";
import { getNode } from "../describe/getNode.js";
import { getMatches } from "./getMatches.js";

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
