import { describe as suite, expect, it } from "vitest";
import { getCopyText } from "../getCopyText.js";
import { getMatches } from "../search/getMatches.js";
import { describeValue } from "./describe.js";
import { CHILD_LIMIT } from "./getChildren.js";

suite("describe limits", () => {
  suite("children of one value", () => {
    it("lists the first items of a huge typed array and counts the rest", () => {
      const node = describeValue(new Uint8Array(3_000_000));
      const children = node.children();
      const rest = children.at(-1);

      expect(node.childCount).toBe(CHILD_LIMIT + 1);
      expect(children[CHILD_LIMIT - 1]?.label).toEqual({
        type: "index",
        index: CHILD_LIMIT - 1,
      });
      expect(rest?.kind).toBe("rest");
      expect(rest?.label).toEqual({ type: "rest" });
      expect(rest?.preview).toBe("2,900,000 more not shown");
      expect(rest?.childCount).toBe(0);
      expect(rest?.id).toBe("$/rest");
    });

    it("does the same for a huge array without holes", () => {
      const node = describeValue(new Array<number>(250_000).fill(7));

      expect(node.childCount).toBe(CHILD_LIMIT + 1);
      expect(node.children().at(-1)?.preview).toBe("150,000 more not shown");
    });

    it("adds no rest row at exactly the limit", () => {
      const node = describeValue(new Array<number>(CHILD_LIMIT).fill(7));

      expect(node.childCount).toBe(CHILD_LIMIT);
      expect(node.children().at(-1)?.kind).toBe("number");
    });

    it("still finds the items of a huge array that is mostly holes", () => {
      const sparse: string[] = [];
      sparse[5_000_000] = "last";

      const node = describeValue(sparse);

      expect(node.childCount).toBe(2);
      expect(node.children()[0]?.preview).toBe("<5,000,000 empty items>");
      expect(node.children()[1]?.preview).toBe('"last"');
    });

    it("counts the rest of a huge map, set and object", () => {
      const size = CHILD_LIMIT + 5;
      const numbers = Array.from({ length: size }, (_, index) => index);
      const map = describeValue(
        new Map(numbers.map((number) => [number, number])),
      );
      const set = describeValue(new Set(numbers));
      const object = describeValue(
        Object.fromEntries(numbers.map((number) => [`k${number}`, number])),
      );

      for (const node of [map, set, object]) {
        expect(node.childCount).toBe(CHILD_LIMIT + 1);
        expect(node.children().at(-1)?.preview).toBe("5 more not shown");
      }
    });
  });

  suite("text that reaches the page", () => {
    it("shortens the name of a class", () => {
      const Long = { ["N".repeat(5000)]: class {} }["N".repeat(5000)];
      const node = describeValue(Long ? new Long() : undefined);

      expect(node.typeName).toHaveLength(81);
      expect(node.preview.length).toBeLessThan(100);
    });

    it("shortens the name in an array or error made by a long-named class", () => {
      const name = "N".repeat(5000);
      const List = { [name]: class extends Array<number> {} }[name];
      const Failure = { [name]: class extends Error {} }[name];

      expect(describeValue(List ? new List() : []).preview.length).toBeLessThan(
        100,
      );
      expect(
        describeValue(Failure ? new Failure("no") : undefined).preview.length,
      ).toBeLessThan(100);
      expect(
        describeValue({ inner: Failure ? new Failure("no") : undefined })
          .preview.length,
      ).toBeLessThan(120);
    });

    it("shows a huge whole number by its first hex digits", () => {
      const node = describeValue(-(16n ** 1_000_000n));

      expect(node.preview).toBe("-0x1000000000000000…n (1,000,001 hex digits)");
    });

    it("shows a whole number of ordinary size in full", () => {
      expect(describeValue(10n ** 59n).preview).toBe(`1${"0".repeat(59)}n`);
      expect(describeValue(-12n).preview).toBe("-12n");
    });
  });

  suite("search", () => {
    it("stops reading text when the character budget runs out", () => {
      const root = describeValue(["heron", "x".repeat(100), "heron"]);

      const matches = getMatches(root, "heron", 1000, 20);

      expect(matches.ids).toEqual(["$/[0]", "$/[2]"]);
      expect(matches.isComplete).toBe(false);
    });

    it("reports a value with a rest row as searched in part", () => {
      const root = describeValue(new Uint8Array(CHILD_LIMIT + 1));

      const matches = getMatches(root, "more", 500_000);

      expect(matches.ids).toEqual([]);
      expect(matches.isComplete).toBe(false);
    });

    it("searches a chain nested tens of thousands deep", () => {
      let deep: unknown = "bottom";
      for (let level = 0; level < 30_000; level++) {
        deep = { inner: deep };
      }

      const matches = getMatches(describeValue(deep), "bottom", 500_000);

      expect(matches.ids).toHaveLength(1);
      expect(matches.isComplete).toBe(true);
    });

    it("still finds a cycle below a value that also appears elsewhere", () => {
      const shared: Record<string, unknown> = { name: "shared" };
      shared.self = shared;
      const root = describeValue({ first: shared, second: shared });

      const second = root.children()[1];
      const first = root.children()[0];

      expect(first?.children()[1]?.kind).toBe("circular");
      expect(second?.kind).toBe("object");
      expect(second?.children()[1]?.kind).toBe("circular");
    });
  });

  suite("copy", () => {
    it("says a copy is whole when nothing was left out", () => {
      expect(getCopyText(describeValue({ a: [1, 2] })).isComplete).toBe(true);
      expect(getCopyText(describeValue("plain")).isComplete).toBe(true);
    });

    it("says a copy is partial when the value limit cut it", () => {
      const copy = getCopyText(describeValue([[1], [2], [3]]), 3);

      expect(copy.isComplete).toBe(false);
      expect(copy.text).toContain("…");
    });

    it("says a copy is partial when a list was too long to open", () => {
      const copy = getCopyText(describeValue({ list: [1, 2, 3, 4] }), 3);

      expect(copy.isComplete).toBe(false);
    });

    it("cuts a long string inside a value at the character budget", () => {
      const copy = getCopyText(
        describeValue({ note: "x".repeat(500), after: true }),
        5000,
        50,
      );

      expect(copy.isComplete).toBe(false);
      expect(copy.text.length).toBeLessThan(120);
      expect(copy.text).toContain('xxx"…');
    });

    it("copies many references to one huge string without failing", () => {
      const huge = "a".repeat(1_000_000);

      const copy = getCopyText(
        describeValue(new Array<string>(600).fill(huge)),
      );

      expect(copy.isComplete).toBe(false);
      expect(copy.text.length).toBeLessThan(7_000_000);
    });

    it("copies a single string whole, however long", () => {
      const huge = "a".repeat(6_000_000);

      const copy = getCopyText(describeValue(huge));

      expect(copy.text).toBe(huge);
      expect(copy.isComplete).toBe(true);
    });
  });
});
