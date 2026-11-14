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
      '{name: "Yellowstone", established: 1872, open: true, animals: Array(2)}',
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

    await render(
      <ObjectInspector label="Hostile" value={{ before: 1, hostile }} />,
    );

    expect(rowTexts().slice(1)).toEqual([
      "before: 1",
      "hostile: Uninspectable: refused",
    ]);
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

      await screen.getByRole("searchbox").fill("guanaco");
      await expect.poll(() => announcements()).toEqual(["2 matches"]);

      await userEvent.keyboard("{Enter}");
      await expect.poll(() => announcements()).toContain("1 of 2");
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

    it("describes the whole value before a row is chosen", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );

      await expect
        .element(screen.getByRole("region", { name: "Selected value" }))
        .toBeVisible();
      expect(facts()).toEqual({ Path: "$", Type: "object (Object)" });
    });

    it("shows the path, type and whole value of the selected row", async () => {
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={details}
          defaultExpanded={["$", "$/.notes"]}
          showDetails
        />,
      );

      await screen.getByRole("treeitem", { name: /^text/u }).click();

      expect(facts()).toEqual({
        Path: "$.notes.text",
        Type: "string",
        Value: long,
      });
    });

    it("follows the keyboard", async () => {
      await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );
      await userEvent.tab();

      await userEvent.keyboard("{ArrowDown}");

      expect(facts()).toEqual({
        Path: "$.name",
        Type: "string",
        Value: "Tatra",
      });
    });

    it("copies the path and says so", async () => {
      const writeText = stubClipboard();
      const screen = await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );
      await screen.getByRole("treeitem", { name: /^tags/u }).click();

      await screen.getByRole("button", { name: "Copy path" }).click();

      expect(writeText).toHaveBeenCalledWith("$.tags");
      await expect.element(screen.getByText("Path copied")).toBeVisible();
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
        />,
      );
      const copyValue = screen.getByRole("button", { name: "Copy value" });

      await screen.getByRole("treeitem", { name: /^text/u }).click();
      await copyValue.click();
      expect(writeText).toHaveBeenLastCalledWith(long);

      await screen.getByRole("treeitem", { name: /^tags/u }).click();
      await copyValue.click();
      expect(writeText).toHaveBeenLastCalledWith('[\n  "a",\n  "b",\n]');
      await expect.element(screen.getByText("Value copied")).toBeVisible();
    });

    it("clears the confirmation when another row is selected", async () => {
      stubClipboard();
      const screen = await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );
      await screen.getByRole("treeitem", { name: /^tags/u }).click();
      await screen.getByRole("button", { name: "Copy path" }).click();
      await expect.element(screen.getByText("Path copied")).toBeVisible();

      await screen.getByRole("treeitem", { name: /^name/u }).click();

      expect(screen.getByText("Path copied").query()).toBeNull();
    });

    it("says when copying fails", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
        new Error("denied"),
      );
      const screen = await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );

      await screen.getByRole("button", { name: "Copy value" }).click();

      await expect.element(screen.getByText("Copying failed")).toBeVisible();
      await expect.poll(() => announcements()).toEqual(["Copying failed"]);
    });

    it("falls back to the whole value when the selected row no longer exists", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={details} showDetails />,
      );
      await screen.getByRole("treeitem", { name: /^tags/u }).click();
      expect(facts().Path).toBe("$.tags");

      await screen.rerender(
        <ObjectInspector label="Park" value={{ name: "Tatra" }} showDetails />,
      );

      expect(facts().Path).toBe("$");
    });
  });
});
