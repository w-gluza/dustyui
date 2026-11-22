import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ObjectInspector } from "../index.js";
import { announcements, resetAnnouncer } from "../test/announcements.js";

const park = {
  name: "Yellowstone",
  established: 1872,
  open: true,
  animals: ["bison", "wolf"],
};

function rowTexts(): string[] {
  return [...document.querySelectorAll('[role="treeitem"]')].map(
    (row) => row.textContent ?? "",
  );
}

function tokenColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const { color } = getComputedStyle(probe);
  probe.remove();
  return color;
}

function valueColour(text: string): string {
  const value = [...document.querySelectorAll("[data-kind]")].find(
    (element) => element.textContent === text,
  );
  return value ? getComputedStyle(value).color : "";
}

describe("ObjectInspector", () => {
  it("shows the value open one level, with a key and a preview per row", async () => {
    const screen = await render(<ObjectInspector label="Park" value={park} />);

    await expect
      .element(screen.getByRole("tree", { name: "Park" }))
      .toBeVisible();
    expect(rowTexts()).toEqual([
      "{…}",
      'name: "Yellowstone"',
      "established: 1872",
      "open: true",
      'animals: Array(2) ["bison", "wolf"]',
    ]);
  });

  it("shows a primitive as a single row", async () => {
    await render(<ObjectInspector label="Answer" value={42} />);

    expect(rowTexts()).toEqual(["42"]);
  });

  it("opens a nested value with the keyboard", async () => {
    await render(<ObjectInspector label="Park" value={park} />);
    await userEvent.tab();

    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{ArrowRight}");

    expect(rowTexts().slice(-2)).toEqual(['0: "bison"', '1: "wolf"']);
  });

  it("jumps to a property by typing its name", async () => {
    await render(<ObjectInspector label="Park" value={park} />);
    await userEvent.tab();

    await userEvent.keyboard("o");

    expect(document.activeElement?.textContent).toBe("open: true");
  });

  it("starts closed when asked to", async () => {
    await render(
      <ObjectInspector label="Park" value={park} defaultExpanded={[]} />,
    );

    expect(rowTexts()).toHaveLength(1);
  });

  it("colours each kind of value with its theme token", async () => {
    await render(
      <ObjectInspector
        label="Kinds"
        value={{ text: "a", count: 1, flag: true, run() {} }}
      />,
    );

    expect(valueColour('"a"')).toBe(tokenColour("--dusty-syntax-string"));
    expect(valueColour("1")).toBe(tokenColour("--dusty-syntax-number"));
    expect(valueColour("true")).toBe(tokenColour("--dusty-syntax-boolean"));
    expect(valueColour("ƒ run()")).toBe(tokenColour("--dusty-syntax-function"));
    expect(tokenColour("--dusty-syntax-string")).not.toBe(
      tokenColour("--dusty-syntax-number"),
    );
  });

  it("shows a getter without running it and a circular reference without looping", async () => {
    let runs = 0;
    const value: Record<string, unknown> = {
      get expensive() {
        runs++;
        return 1;
      },
    };
    value.self = value;

    await render(<ObjectInspector label="Tricky" value={value} />);

    expect(rowTexts().slice(1)).toEqual([
      "expensive: (...)",
      "self: [Circular $]",
    ]);
    expect(runs).toBe(0);
  });

  it("shows a value it cannot read as a row and keeps the rest", async () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("refused");
        },
      },
    );

    const screen = await render(
      <ObjectInspector label="Hostile" value={{ before: 1, hostile }} />,
    );

    expect(rowTexts().slice(1)).toEqual(["before: 1", "hostile: {…}"]);

    await screen.getByRole("treeitem", { name: /^hostile/u }).click();

    expect(rowTexts().slice(1)).toEqual([
      "before: 1",
      "hostile: Could not be read: refused",
    ]);
    await expect
      .element(screen.getByRole("treeitem", { name: /^hostile/u }))
      .not.toHaveAttribute("aria-expanded");
  });

  it("keeps the same rows open when the value is replaced", async () => {
    const screen = await render(<ObjectInspector label="Park" value={park} />);
    await screen.getByRole("treeitem", { name: /^animals/u }).click();
    expect(rowTexts()).toContain('0: "bison"');

    await screen.rerender(
      <ObjectInspector
        label="Park"
        value={{ ...park, animals: ["elk", "bear", "moose"] }}
      />,
    );

    expect(rowTexts().slice(-3)).toEqual([
      '0: "elk"',
      '1: "bear"',
      '2: "moose"',
    ]);
  });

  describe("search", () => {
    beforeEach(resetAnnouncer);

    const parks = {
      name: "Torres del Paine",
      country: "Chile",
      animals: [
        { commonName: "Guanaco", diet: "grass" },
        { commonName: "Puma", diet: "guanaco" },
      ],
    };

    function marked(): string[] {
      return [...document.querySelectorAll("mark")].map(
        (mark) => mark.textContent ?? "",
      );
    }

    function selectedText(): string {
      return (
        document.querySelector('[role="treeitem"][aria-selected="true"]')
          ?.textContent ?? ""
      );
    }

    it("has no search field unless asked for", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} />,
      );

      expect(screen.getByRole("searchbox").query()).toBeNull();
    });

    it("counts the matches and marks them in the rows that are showing", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );

      await screen.getByRole("searchbox", { name: "Search" }).fill("guanaco");

      await expect.element(screen.getByText("2 matches")).toBeVisible();
      expect(marked()).toEqual([]);
      expect(rowTexts()).toHaveLength(4);

      await screen.getByRole("searchbox").fill("chi");
      await expect.element(screen.getByText("1 match")).toBeVisible();
      expect(marked()).toEqual(["Chi"]);
    });

    it("opens the way to a match on Enter and selects it, keeping focus in the field", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );
      const field = screen.getByRole("searchbox");
      await field.fill("guanaco");
      await expect.element(screen.getByText("2 matches")).toBeVisible();

      await userEvent.keyboard("{Enter}");

      await expect.element(screen.getByText("1 of 2")).toBeVisible();
      expect(selectedText()).toBe('commonName: "Guanaco"');
      expect(marked()).toEqual(["Guanaco"]);
      expect(document.activeElement).toBe(field.element());

      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByText("2 of 2")).toBeVisible();
      expect(selectedText()).toBe('diet: "guanaco"');
    });

    it("wraps around in both directions", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );
      await screen.getByRole("searchbox").fill("guanaco");
      await expect.element(screen.getByText("2 matches")).toBeVisible();

      await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
      await expect.element(screen.getByText("2 of 2")).toBeVisible();

      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByText("1 of 2")).toBeVisible();
    });

    it("moves between matches with the buttons", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );
      await screen.getByRole("searchbox").fill("commonName");
      await expect.element(screen.getByText("2 matches")).toBeVisible();

      await screen.getByRole("button", { name: "Next match" }).click();
      expect(selectedText()).toBe('commonName: "Guanaco"');

      await screen.getByRole("button", { name: "Next match" }).click();
      expect(selectedText()).toBe('commonName: "Puma"');

      await screen.getByRole("button", { name: "Previous match" }).click();
      expect(selectedText()).toBe('commonName: "Guanaco"');
    });

    it("says when nothing matches and marks the buttons unavailable", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );
      const next = screen.getByRole("button", { name: "Next match" });
      await expect.element(next).toHaveAttribute("aria-disabled", "true");

      await screen.getByRole("searchbox").fill("zebra");

      await expect.element(screen.getByText("No matches")).toBeVisible();
      await expect.element(next).toHaveAttribute("aria-disabled", "true");
      await next.click({ force: true });
      expect(selectedText()).toBe("");
    });

    it("announces the result once typing pauses", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );

      await screen.getByRole("searchbox").click();
      for (const letter of "guanaco") {
        await userEvent.keyboard(letter);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      await expect.poll(() => announcements()).toEqual(["2 matches"]);

      await userEvent.keyboard("{Enter}");
      await expect
        .poll(() =>
          announcements().filter((text) => text.startsWith("Match 1 of 2: $")),
        )
        .toHaveLength(1);
    });

    it("lets the tree keep working from the match after Tab", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={parks} searchable />,
      );
      await screen.getByRole("searchbox").fill("puma");
      await expect.element(screen.getByText("1 match")).toBeVisible();
      await userEvent.keyboard("{Enter}");
      expect(selectedText()).toBe('commonName: "Puma"');

      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();

      expect(document.activeElement?.textContent).toBe('commonName: "Puma"');
    });

    it("finds a row deep in a very long list and brings it into view", async () => {
      const rows = Array.from({ length: 50_000 }, (_, index) => `row ${index}`);
      const screen = await render(
        <>
          <style>
            {".scroller { max-block-size: 300px; overflow: auto; }"}
          </style>
          <ObjectInspector
            label="Rows"
            value={{ rows }}
            className="scroller"
            searchable
          />
        </>,
      );

      await screen.getByRole("searchbox").fill("row 43210");
      await expect.element(screen.getByText("1 match")).toBeVisible();
      await userEvent.keyboard("{Enter}");

      await expect
        .element(screen.getByRole("treeitem", { name: /43210/u }))
        .toBeInViewport();
      expect(
        document.querySelectorAll('[role="treeitem"]').length,
      ).toBeLessThan(80);
    });
  });

  describe("details", () => {
    beforeEach(resetAnnouncer);
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const long = "A long description. ".repeat(20);
    const details = { name: "Tatra", notes: { text: long }, tags: ["a", "b"] };

    function facts(): Record<string, string> {
      const terms = [...document.querySelectorAll("dt")];
      return Object.fromEntries(
        terms.map((term) => [
          term.textContent ?? "",
          term.nextElementSibling?.textContent ?? "",
        ]),
      );
    }

    function stubClipboard() {
      return vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    }

    it("has no details unless asked for", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={details} />,
      );

      expect(screen.getByRole("region").query()).toBeNull();
    });

    it("asks for a row to be chosen before describing anything", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );
      const region = screen.getByRole("region", {
        name: "Selected value in Park",
      });

      await expect
        .element(region)
        .toHaveTextContent("Select a row to see its details");
      expect(facts()).toEqual({});
      expect(region.getByRole("button").elements()).toHaveLength(0);

      await screen.getByRole("treeitem", { name: /^\{/u }).click();
      expect(facts()).toEqual({ Path: "$", Type: "Object" });
    });

    it("shows the path, type and whole value of the selected row", async () => {
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          defaultExpanded={["$", "$/.notes"]}
          showDetails
          defaultSelected="$"
        />,
      );

      await screen.getByRole("treeitem", { name: /^text/u }).click();

      expect(facts()).toEqual({
        Path: "$.notes.text",
        Type: "String",
        Value: long,
      });
    });

    it("follows the keyboard", async () => {
      await render(
        <ObjectInspector
          label="Park"
          value={details}
          showDetails
          defaultSelected="$"
        />,
      );
      await userEvent.tab();

      await userEvent.keyboard("{ArrowDown}");

      expect(facts()).toEqual({
        Path: "$.name",
        Type: "String",
        Value: "Tatra",
      });
    });

    it("copies the path and says so", async () => {
      const writeText = stubClipboard();
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          showDetails
          defaultSelected="$"
        />,
      );
      await screen.getByRole("treeitem", { name: /^tags/u }).click();

      await screen.getByRole("button", { name: "Copy path" }).click();

      expect(writeText).toHaveBeenCalledWith("$.tags");
      await expect
        .element(screen.getByRole("button", { name: "Path copied" }))
        .toBeVisible();
      await expect.poll(() => announcements()).toEqual(["Path copied"]);
    });

    it("copies a string whole and an object as indented text", async () => {
      const writeText = stubClipboard();
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          defaultExpanded={["$", "$/.notes"]}
          showDetails
          defaultSelected="$"
        />,
      );
      const copyValue = screen.getByRole("button", { name: "Copy value" });

      await screen.getByRole("treeitem", { name: /^text/u }).click();
      await copyValue.click();
      expect(writeText).toHaveBeenLastCalledWith(long);

      await screen.getByRole("treeitem", { name: /^tags/u }).click();
      await copyValue.click();
      expect(writeText).toHaveBeenLastCalledWith('[\n  "a",\n  "b",\n]');
      await expect
        .element(
          screen
            .getByRole("region", { name: "Selected value in Park" })
            .getByText("Value copied"),
        )
        .toBeVisible();
    });

    it("clears the confirmation when another row is selected", async () => {
      stubClipboard();
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          showDetails
          defaultSelected="$"
        />,
      );
      await screen.getByRole("treeitem", { name: /^tags/u }).click();
      await screen.getByRole("button", { name: "Copy path" }).click();
      await expect
        .element(screen.getByRole("button", { name: "Path copied" }))
        .toBeVisible();

      await screen.getByRole("treeitem", { name: /^name/u }).click();

      await expect
        .element(
          screen
            .getByRole("region", { name: "Selected value in Park" })
            .getByText("Path copied"),
        )
        .not.toBeInTheDocument();
    });

    it("says when copying fails", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
        new Error("denied"),
      );
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          showDetails
          defaultSelected="$"
        />,
      );

      await screen.getByRole("button", { name: "Copy value" }).click();

      const failure = "Could not copy. Select the text and copy it by hand.";
      await expect
        .element(
          screen
            .getByRole("region", { name: "Selected value in Park" })
            .getByText(failure),
        )
        .toBeVisible();
      await expect
        .poll(
          () => document.querySelector('[aria-live="assertive"]')?.textContent,
        )
        .toBe(failure);
    });

    it("falls back to the whole value when the selected row no longer exists", async () => {
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          showDetails
          defaultSelected="$"
        />,
      );
      await screen.getByRole("treeitem", { name: /^tags/u }).click();
      expect(facts().Path).toBe("$.tags");

      await screen.rerender(
        <ObjectInspector
          label="Park"
          value={{ name: "Tatra" }}
          showDetails
          defaultSelected="$"
        />,
      );

      expect(facts().Path).toBe("$");
    });
  });
});

describe("ObjectInspector with lazy rows and ranges", () => {
  beforeEach(resetAnnouncer);

  it("says nothing when a row opens onto its contents", async () => {
    const screen = await render(
      <ObjectInspector label="Park" value={{ inner: { a: 1 } }} />,
    );

    await screen.getByRole("treeitem", { name: /^inner/u }).click();

    await expect
      .element(screen.getByRole("treeitem", { name: "a: 1" }))
      .toBeVisible();
    expect(announcements()).toEqual([]);
  });

  function facts(): Record<string, string> {
    const terms = [...document.querySelectorAll("dt")];
    return Object.fromEntries(
      terms.map((term) => [
        term.textContent ?? "",
        term.nextElementSibling?.textContent ?? "",
      ]),
    );
  }

  it("does not read a closed object, so its arrow goes once it turns out to be empty", async () => {
    let listed = 0;
    const empty = new Proxy(
      {},
      {
        ownKeys(target) {
          listed++;
          return Reflect.ownKeys(target);
        },
      },
    );
    const screen = await render(
      <ObjectInspector label="Park" value={{ empty, after: 1 }} />,
    );
    const row = screen.getByRole("treeitem", { name: /^empty/u });

    expect(rowTexts()).toEqual(["{…}", "empty: {…}", "after: 1"]);
    expect(listed).toBe(0);
    await expect.element(row).toHaveAttribute("aria-expanded", "false");

    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

    expect(listed).toBe(1);
    expect(rowTexts()).toEqual(["{…}", "empty: {}", "after: 1"]);
    await expect.element(row).not.toHaveAttribute("aria-expanded");
    await expect.element(row).toHaveFocus();
    await expect.poll(() => announcements()).toEqual(["No properties"]);

    await userEvent.keyboard("{ArrowRight}{ArrowDown}");

    expect(announcements()).toEqual(["No properties"]);

    expect(document.activeElement?.textContent).toBe("after: 1");
  });

  it("shows a long list as named ranges that open with the keyboard", async () => {
    const list = Array.from({ length: 250 }, (_, index) => `item ${index}`);
    const screen = await render(
      <ObjectInspector
        label="List"
        value={{ list }}
        defaultExpanded={["$", "$/.list"]}
      />,
    );
    const range = screen.getByRole("treeitem", { name: "Items 100 to 199" });

    expect(rowTexts().slice(2)).toEqual([
      "Items 0 to 99",
      "Items 100 to 199",
      "Items 200 to 249",
    ]);
    await expect.element(range).toHaveAttribute("aria-expanded", "false");
    await expect.element(range).toHaveAttribute("aria-level", "3");
    await expect.element(range).toHaveAttribute("aria-setsize", "3");
    await expect.element(range).toHaveAttribute("aria-posinset", "2");

    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}");

    await expect.element(range).toHaveFocus();
    await expect.element(range).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByRole("treeitem", { name: '100: "item 100"' }))
      .toHaveAttribute("aria-level", "4");

    await userEvent.keyboard("{ArrowRight}");

    expect(document.activeElement?.textContent).toBe('100: "item 100"');

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");

    await expect.element(range).toHaveFocus();
    await expect.element(range).toHaveAttribute("aria-expanded", "false");
  });

  it("describes a selected range by the value it belongs to and offers no value to copy", async () => {
    const list = Array.from({ length: 250 }, (_, index) => index);
    const screen = await render(
      <ObjectInspector
        label="List"
        value={{ list }}
        defaultExpanded={["$", "$/.list", "$/.list/~i100-199"]}
        showDetails
        defaultSelected="$"
      />,
    );

    await screen.getByRole("treeitem", { name: "Items 200 to 249" }).click();

    expect(facts()).toEqual({ Path: "$.list", Type: "Range" });
    await expect
      .element(screen.getByRole("button", { name: "Copy path" }))
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: "Copy value" }).query(),
    ).toBeNull();

    await screen.getByRole("treeitem", { name: "150: 150" }).click();

    expect(facts()).toEqual({
      Path: "$.list[150]",
      Type: "Number",
      Value: "150",
    });
    await expect
      .element(screen.getByRole("button", { name: "Copy value" }))
      .toBeVisible();
  });

  it("opens the ranges on the way to a match and reports the item, not the range", async () => {
    const onSelectedChange = vi.fn();
    const list = Array.from({ length: 25_000 }, () => "plain");
    list[12_345] = "items heron";
    const screen = await render(
      <ObjectInspector
        label="List"
        value={list}
        searchable
        onSelectedChange={onSelectedChange}
      />,
    );

    await screen.getByRole("searchbox").fill("items");
    await expect.element(screen.getByText("1 match")).toBeVisible();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(screen.getByRole("treeitem", { name: /^12345/u }))
      .toHaveAttribute("aria-selected", "true");
    expect(onSelectedChange).toHaveBeenLastCalledWith("$/[12345]");
    await expect
      .element(screen.getByRole("treeitem", { name: "Items 12,300 to 12,399" }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("opens only the outer list, leaving the inner ones unread", async () => {
    let listed = 0;
    let described = 0;
    const inner = Array.from(
      { length: 20 },
      () =>
        new Proxy(new Array<number>(100_000).fill(7), {
          ownKeys(target) {
            listed++;
            return Reflect.ownKeys(target);
          },
          getOwnPropertyDescriptor(target, key) {
            described++;
            return Reflect.getOwnPropertyDescriptor(target, key);
          },
        }),
    );

    await render(<ObjectInspector label="Grid" value={inner} />);

    expect(rowTexts()).toHaveLength(21);
    expect(rowTexts()[1]).toBe("0: Array(100000) [7, 7, 7, 7, 7, …]");
    expect(listed).toBe(0);
    expect(described).toBeLessThan(inner.length * 30);
  });

  it("keeps the named properties of a very long list behind a Properties row", async () => {
    const value = Object.assign(new Uint8Array(100_001), { note: "needle" });
    const screen = await render(
      <ObjectInspector
        label="Bytes"
        value={value}
        searchable
        showDetails
        defaultSelected="$"
      />,
    );
    const properties = screen.getByRole("treeitem", { name: "Properties" });

    await screen.getByRole("searchbox").fill("needle");
    await expect
      .element(screen.getByText("No matches, searched in part"))
      .toBeVisible();
    await expect.element(properties).toHaveAttribute("aria-expanded", "false");

    await properties.click();

    await expect
      .element(screen.getByRole("treeitem", { name: 'note: "needle"' }))
      .toBeVisible();
    expect(facts()).toEqual({ Path: "$", Type: "Range" });
    expect(
      screen.getByRole("button", { name: "Copy value" }).query(),
    ).toBeNull();
  });

  it("searches again once a Properties row has been read", async () => {
    const value = Object.assign(new Uint8Array(100_001), { note: "needle" });
    const screen = await render(
      <ObjectInspector label="Bytes" value={value} searchable />,
    );

    await screen.getByRole("searchbox").fill("needle");
    await expect
      .element(screen.getByText("No matches, searched in part"))
      .toBeVisible();

    await screen.getByRole("treeitem", { name: "Properties" }).click();

    await expect.element(screen.getByText("1 match")).toBeVisible();
    expect(
      [...document.querySelectorAll("mark")].map((mark) => mark.textContent),
    ).toEqual(["needle"]);

    await screen.getByRole("searchbox").click();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(screen.getByRole("treeitem", { name: 'note: "needle"' }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("says so when the properties of a very long list cannot be read", async () => {
    const value = new Proxy(new Array<number>(100_001).fill(1), {
      ownKeys() {
        throw new Error("refused");
      },
    });
    const screen = await render(
      <ObjectInspector label="Numbers" value={value} searchable />,
    );

    await screen.getByRole("searchbox").fill("refused");
    await screen.getByRole("treeitem", { name: "Properties" }).click();

    const failed = screen.getByRole("treeitem", {
      name: "Properties: Could not be read: refused",
    });
    await expect.element(failed).toBeVisible();
    await expect.element(failed).not.toHaveAttribute("aria-expanded");
    await expect
      .poll(() => announcements())
      .toContain("Properties: Could not be read: refused");
    expect(announcements()).not.toContain("No properties");
    await expect
      .element(screen.getByText("No matches, searched in part"))
      .toBeVisible();
  });

  it("announces a value that could not be read when it is opened", async () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("refused");
        },
      },
    );
    const screen = await render(
      <ObjectInspector label="Hostile" value={{ hostile }} />,
    );

    await screen.getByRole("treeitem", { name: /^hostile/u }).click();

    await expect
      .poll(() => announcements())
      .toEqual(["Could not be read: refused"]);
  });
});

describe("ObjectInspector wording and wiring", () => {
  beforeEach(resetAnnouncer);

  it("takes its interface text from the labels it is given", async () => {
    const screen = await render(
      <ObjectInspector
        label="Park"
        value={park}
        searchable
        showDetails
        defaultSelected="$"
        labels={{
          search: "Szukaj",
          searchRegion: (label) => `Szukaj w: ${label}`,
          previousMatch: "Poprzedni wynik",
          nextMatch: "Nastepny wynik",
          searchStatus: ({ count, current }) =>
            current >= 0
              ? `${String(current + 1)} z ${String(count)}`
              : `Wyniki: ${String(count)}`,
          matchAnnouncement: (status, path) => `Wynik ${status}: ${path}`,
          detailsRegion: (label) => `Wybrana wartosc w: ${label}`,
          path: "Sciezka",
          type: "Typ",
          typeName: (kind, name) => (kind === "object" ? "Obiekt" : name),
          copyPath: "Kopiuj sciezke",
          copyValue: "Kopiuj wartosc",
        }}
      />,
    );

    expect(document.querySelector("search")?.getAttribute("aria-label")).toBe(
      "Szukaj w: Park",
    );
    await expect.element(screen.getByLabelText("Szukaj")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Poprzedni wynik" }))
      .toBeVisible();
    const details = document.querySelector("section");
    expect(details?.getAttribute("aria-label")).toBe("Wybrana wartosc w: Park");
    expect(details?.textContent).toContain("Sciezka");
    expect(details?.textContent).toContain("Typ");
    await expect.element(screen.getByText("Obiekt")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Kopiuj wartosc" }))
      .toBeVisible();

    await screen.getByRole("searchbox").fill("bison");
    await expect.element(screen.getByText("Wyniki: 1")).toBeVisible();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByText("1 z 1")).toBeVisible();
    await expect
      .poll(() => announcements().at(-1), { timeout: 3000 })
      .toBe("Wynik 1 z 1: $.animals[0]");
  });

  it("keeps the English text for any label left out", async () => {
    const screen = await render(
      <ObjectInspector
        label="Park"
        value={park}
        searchable
        labels={{ search: "Find" }}
      />,
    );

    await expect.element(screen.getByLabelText("Find")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Next match" }))
      .toBeVisible();
  });

  it("describes the tree, not the wrapper, with a description it is given", async () => {
    const screen = await render(
      <>
        <p id="hint">Read only</p>
        <ObjectInspector
          label="Park"
          value={park}
          aria-describedby="hint"
          data-testid="inspector"
        />
      </>,
    );

    await expect
      .element(screen.getByRole("tree", { name: "Park" }))
      .toHaveAttribute("aria-describedby", "hint");
    expect(
      screen
        .getByTestId("inspector")
        .element()
        .hasAttribute("aria-describedby"),
    ).toBe(false);
  });

  it("styles the current match only inside its own tree", async () => {
    const selectedAncestor = {
      role: "option",
      "aria-selected": true,
      tabIndex: -1,
    } as const;
    const screen = await render(
      <div {...selectedAncestor}>
        <ObjectInspector label="Park" value={park} searchable />
      </div>,
    );

    await screen.getByRole("searchbox").fill("Yellowstone");
    await expect.poll(() => document.querySelector("mark")).not.toBeNull();

    expect(
      getComputedStyle(document.querySelector("mark") as Element)
        .textDecorationLine,
    ).toBe("underline");
  });

  it("sets the quiet text of a selected row in the full text colour", async () => {
    const screen = await render(
      <ObjectInspector
        label="Tricky"
        value={{
          get expensive() {
            return 1;
          },
        }}
      />,
    );

    await screen.getByRole("treeitem", { name: /^expensive/u }).click();

    expect(valueColour("(...)")).toBe(tokenColour("--dusty-text"));
  });

  it("announces the new count when opening a row reveals more matches", async () => {
    const value = Object.assign(new Uint8Array(100_001), { note: "needle" });
    const screen = await render(
      <ObjectInspector label="Bytes" value={value} searchable />,
    );

    await screen.getByRole("searchbox").fill("needle");
    await expect
      .poll(() => announcements(), { timeout: 3000 })
      .toEqual(["No matches, searched in part"]);

    await screen.getByRole("treeitem", { name: "Properties" }).click();

    await expect
      .poll(() => announcements().at(-1), { timeout: 3000 })
      .toBe("1 match");
  });

  it("words a read failure as asked, keeping the reason", async () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("refused");
        },
      },
    );
    const screen = await render(
      <ObjectInspector
        label="Hostile"
        value={{ hostile }}
        labels={{ unreadable: (reason) => `Nie mozna odczytac: ${reason}` }}
      />,
    );

    await screen.getByRole("treeitem", { name: /^hostile/u }).click();

    await expect
      .poll(() => announcements())
      .toEqual(["Nie mozna odczytac: refused"]);
  });

  it("starts on a given row and reports row actions, without leaking either to the page", async () => {
    const onRowAction = vi.fn();
    const screen = await render(
      <ObjectInspector
        label="Park"
        value={{ name: "Yosemite", area: 3027 }}
        defaultSelected="$/.area"
        onRowAction={onRowAction}
        data-testid="inspector"
      />,
    );
    const area = screen.getByRole("treeitem", { name: /^area/u });
    const root = screen.getByTestId("inspector").element();

    await expect.element(area).toHaveAttribute("aria-selected", "true");
    await area.click();
    expect(
      onRowAction.mock.calls.map(([row]) => (row as { id: string }).id),
    ).toEqual(["$/.area"]);
    expect(root.hasAttribute("defaultselected")).toBe(false);
  });

  it("marks a match that lies past the point where a long key or value is cut", async () => {
    const screen = await render(
      <ObjectInspector
        label="Notes"
        searchable
        value={{
          note: `${"glacier ".repeat(60)}condor ${"river ".repeat(60)}`,
          [`${"valley".repeat(30)}Puma`]: true,
          plain: "condor",
        }}
      />,
    );
    const marked = (name: RegExp) =>
      [
        ...screen
          .getByRole("treeitem", { name })
          .element()
          .querySelectorAll("mark"),
      ].map((mark) => mark.textContent);

    await userEvent.type(screen.getByRole("searchbox"), "condor");
    await expect.poll(() => marked(/^note/u)).toEqual(["condor"]);
    expect(marked(/^plain/u)).toEqual(["condor"]);

    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "puma");
    await expect.poll(() => marked(/: true$/u)).toEqual(["Puma"]);
  });

  it("shows the short form of a row while it is open and the full preview once it is closed", async () => {
    const screen = await render(
      <ObjectInspector label="Park" value={{ animals: ["bison", "wolf"] }} />,
    );
    const animals = screen.getByRole("treeitem", { name: /^animals/u });

    await expect
      .element(animals)
      .toHaveTextContent('animals: Array(2) ["bison", "wolf"]');
    await animals.click();
    await expect.poll(() => rowTexts()[1]).toBe("animals: Array(2)");

    await animals.click();
    await expect
      .poll(() => rowTexts()[1])
      .toBe('animals: Array(2) ["bison", "wolf"]');
  });

  it("fills every match, and the one on the selected row more strongly", async () => {
    const screen = await render(
      <ObjectInspector
        label="Park"
        searchable
        value={{ first: "condor", second: "condor" }}
      />,
    );
    await screen.getByRole("searchbox").fill("condor");
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByText("1 of 2")).toBeVisible();
    const fills = [...document.querySelectorAll("mark")].map(
      (mark) => getComputedStyle(mark).backgroundColor,
    );

    expect(fills).toEqual([
      tokenColour("--dusty-action"),
      tokenColour("--dusty-surface-selected"),
    ]);
  });

  it("draws the match buttons as icons and keeps the field steady as the count appears", async () => {
    const screen = await render(
      <div style={{ inlineSize: "420px" }}>
        <ObjectInspector label="Park" searchable value={park} />
      </div>,
    );
    const field = screen.getByRole("searchbox");
    const before = field.element().getBoundingClientRect().width;

    expect(
      screen
        .getByRole("button", { name: "Next match" })
        .element()
        .querySelector("svg"),
    ).not.toBeNull();
    await field.fill("bison");
    await expect.element(screen.getByText("1 match")).toBeVisible();

    expect(field.element().getBoundingClientRect().width).toBe(before);
  });

  it("copies with the same button as the rest of the library", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const screen = await render(
      <ObjectInspector
        label="Park"
        value={park}
        showDetails
        defaultSelected="$"
      />,
    );
    const copy = screen.getByRole("button", { name: "Copy path" });

    expect(copy.element().dataset.status).toBe("idle");
    await copy.click();

    await expect
      .element(screen.getByRole("button", { name: "Path copied" }))
      .toHaveAttribute("data-status", "copied");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("$");
  });
});
