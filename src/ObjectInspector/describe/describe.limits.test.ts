import { describe as suite, expect, it } from "vitest";
import { getCopyText } from "../getCopyText.js";
import { getMatches } from "../search/getMatches.js";
import { describeValue } from "./describe.js";
import { getNode } from "./getNode.js";
import { GROUP_SIZE } from "./getRanges.js";

suite("describe limits", () => {
  suite("children of one value", () => {
    it("opens a huge typed array as a hundred ranges at most, each level down", () => {
      const node = describeValue(new Uint8Array(3_000_000));
      const top = node.children();
      const middle = top[2]?.children() ?? [];
      const leaf = middle[5]?.children() ?? [];
      const items = leaf[7]?.children() ?? [];

      expect(top.map((range) => range.preview)).toEqual([
        "Items 0 to 999,999",
        "Items 1,000,000 to 1,999,999",
        "Items 2,000,000 to 2,999,999",
        "Properties",
      ]);
      expect(middle).toHaveLength(100);
      expect(middle[5]?.preview).toBe("Items 2,050,000 to 2,059,999");
      expect(leaf[7]?.preview).toBe("Items 2,050,700 to 2,050,799");
      expect(items).toHaveLength(100);
      expect(items[42]?.label).toEqual({ type: "index", index: 2_050_742 });
      expect(items[42]?.id).toBe("$/[2050742]");
      expect(items[42]?.path).toBe("$[2050742]");
    });

    it("reaches the very last item of a huge array", () => {
      const list = new Array<number>(2_500_000).fill(7);
      list[2_499_999] = 8;
      const root = describeValue(list);

      expect(getNode(root, "$/[2499999]")?.preview).toBe("8");
    });

    it("gives a range its own kind, id and the path of the value it belongs to", () => {
      const root = describeValue({ list: new Uint8Array(250) });
      const range = root.children()[0]?.children()[1];

      expect(range?.kind).toBe("range");
      expect(range?.id).toBe("$/.list/~i100-199");
      expect(range?.path).toBe("$.list");
      expect(range?.label).toBeUndefined();
      expect(range?.value).toBeUndefined();
      expect(range?.preview).toBe("Items 100 to 199");
      expect(range?.hasChildren).toBe(true);
    });

    it("shows a list of a hundred items or fewer without ranges", () => {
      const node = describeValue(new Array<number>(GROUP_SIZE).fill(7));

      expect(node.children()).toHaveLength(GROUP_SIZE);
      expect(node.children().at(-1)?.kind).toBe("number");
    });

    it("keeps the id of an item the same however its list is grouped", () => {
      const short = describeValue(new Array<number>(160).fill(1));
      const long = describeValue(new Array<number>(1_600_000).fill(1));

      expect(getNode(short, "$/[150]")?.path).toBe("$[150]");
      expect(getNode(long, "$/[150]")?.path).toBe("$[150]");
    });

    it("shows the holes of a huge sparse array range by range", () => {
      const sparse: string[] = [];
      sparse[5_000_000] = "last";
      const root = describeValue(sparse);

      expect(root.children().map((child) => child.preview)).toEqual([
        "Items 0 to 999,999",
        "Items 1,000,000 to 1,999,999",
        "Items 2,000,000 to 2,999,999",
        "Items 3,000,000 to 3,999,999",
        "Items 4,000,000 to 4,999,999",
        "Items 5,000,000 to 5,000,000",
        "Properties",
      ]);
      expect(getNode(root, "$/[5000000]")?.preview).toBe('"last"');
      expect(
        getNode(root, "$/~i300-399")
          ?.children()
          .map((child) => child.preview),
      ).toEqual(["<100 empty items>"]);
    });

    it("groups the entries of a long map and reads them in any order", () => {
      const numbers = Array.from({ length: 250 }, (_, index) => index);
      const root = describeValue(
        new Map(numbers.map((number) => [`k${number}`, number])),
      );
      const [first, second, third] = root.children();

      expect(root.children().map((range) => range.preview)).toEqual([
        "Entries 0 to 99",
        "Entries 100 to 199",
        "Entries 200 to 249",
      ]);
      expect(third?.children()).toHaveLength(50);
      expect(third?.children()[49]?.preview).toBe('"k249" => 249');
      expect(first?.children()[0]?.preview).toBe('"k0" => 0');
      expect(second?.children()[0]?.id).toBe("$/#100");
    });

    it("groups the items of a long set and the keys of a wide object", () => {
      const numbers = Array.from({ length: 250 }, (_, index) => index);
      const set = describeValue(new Set(numbers));
      const wide = describeValue(
        Object.fromEntries(numbers.map((number) => [`k${number}`, number])),
      );

      expect(set.children()[2]?.preview).toBe("Items 200 to 249");
      expect(set.children()[2]?.children()[49]?.id).toBe("$/#249");
      expect(wide.children()[1]?.preview).toBe("Properties 100 to 199");
      expect(wide.children()[1]?.children()[0]?.id).toBe("$/.k100");
    });

    it("lists the named properties of a list after its items", () => {
      const tagged = Object.assign(new Array<number>(150).fill(1), {
        note: "extra",
      });
      const children = describeValue(tagged).children();

      expect(children.map((child) => child.preview)).toEqual([
        "Items 0 to 99",
        "Items 100 to 149",
        '"extra"',
      ]);
      expect(children[2]?.id).toBe("$/.note");
    });

    it("knows the size of a list, map or set without opening it, and of nothing else", () => {
      expect(describeValue(new Uint8Array(3_000_000)).size).toBe(3_000_000);
      expect(describeValue(new Map([[1, 2]])).size).toBe(1);
      expect(describeValue(new Set([1, 2])).size).toBe(2);
      expect(describeValue({ a: 1 }).size).toBeUndefined();
      expect(describeValue("text").size).toBeUndefined();
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

    it("searches part of a huge list when it is the whole value", () => {
      const list = new Array<string>(3000).fill("plain");
      list[10] = "heron";

      const matches = getMatches(describeValue(list), "heron", 1000);

      expect(matches.ids).toEqual(["$/[10]"]);
      expect(matches.isComplete).toBe(false);
    });

    it("finds an item deep inside ranges by its own id and never matches a range", () => {
      const list = new Array<string>(25_000).fill("plain");
      list[12_345] = "items heron";

      const matches = getMatches(describeValue(list), "items", 500_000);

      expect(matches.ids).toEqual(["$/[12345]"]);
      expect(matches.isComplete).toBe(true);
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
