import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ObjectInspector } from "../index.js";
import { announcements, resetAnnouncer } from "../test/announcements.js";

const park = {
  name: "Tatra",
  animals: [{ name: "Chamois" }, { name: "Marmot" }, { name: "Chamois" }],
};

function selectedRow(): HTMLElement | null {
  return document.querySelector('[role="treeitem"][aria-selected="true"]');
}

describe("ObjectInspector contract", () => {
  beforeEach(resetAnnouncer);
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("root element", () => {
    it("puts the consumer's props on the same root with or without the extras", async () => {
      const plain = vi.fn();
      const full = vi.fn();
      await render(
        <>
          <ObjectInspector
            label="Plain"
            value={park}
            className="mine"
            id="plain"
            data-area="left"
            ref={plain}
          />
          <ObjectInspector
            label="Full"
            value={park}
            className="mine"
            id="full"
            ref={full}
            searchable
            showDetails
            defaultSelected="$"
          />
        </>,
      );

      for (const id of ["plain", "full"]) {
        const root = document.getElementById(id);
        expect(root?.classList.contains("mine")).toBe(true);
        expect(root?.getAttribute("role")).toBeNull();
        expect(root?.querySelector(':scope > [role="tree"]')).not.toBeNull();
      }
      expect(document.getElementById("plain")?.dataset.area).toBe("left");
      expect(plain).toHaveBeenCalledWith(document.getElementById("plain"));
      expect(full).toHaveBeenCalledWith(document.getElementById("full"));
      expect(document.getElementById("full")?.querySelector("search")).not.toBe(
        null,
      );
    });

    it("lets the tree scroll inside a root with a fixed height", async () => {
      const list = Array.from({ length: 80 }, (_, index) => index);
      const screen = await render(
        <ObjectInspector
          label="List"
          value={list}
          style={{ blockSize: "12rem" }}
          searchable
          showDetails
          defaultSelected="$"
        />,
      );
      const tree = screen.getByRole("tree").element();

      expect(tree.scrollHeight).toBeGreaterThan(tree.clientHeight);
      await expect.element(screen.getByRole("searchbox")).toBeInViewport();
      await expect
        .element(screen.getByRole("button", { name: "Copy path" }))
        .toBeInViewport();
    });

    it("names the search and the details after each inspector on the page", async () => {
      const screen = await render(
        <>
          <ObjectInspector
            label="Before"
            value={park}
            searchable
            showDetails
            defaultSelected="$"
          />
          <ObjectInspector
            label="After"
            value={park}
            searchable
            showDetails
            defaultSelected="$"
          />
        </>,
      );

      for (const name of ["Before", "After"]) {
        expect(
          document.querySelector(`search[aria-label="Search ${name}"]`),
        ).not.toBeNull();
        await expect
          .element(
            screen.getByRole("region", { name: `Selected value in ${name}` }),
          )
          .toBeVisible();
      }
    });
  });

  describe("selection", () => {
    it("marks the selected row with more than a tint, and gives rows a tappable height", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={park} />,
      );
      const first = screen.getByRole("treeitem").first().element();
      const second = screen.getByRole("treeitem").nth(1).element();

      await screen.getByRole("treeitem").nth(1).click();
      const selected = getComputedStyle(second);
      const plain = getComputedStyle(first);

      expect(selected.borderInlineStartColor).not.toBe(
        plain.borderInlineStartColor,
      );
      expect(selected.borderInlineStartWidth).toBe("3px");
      expect(second.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    });
  });

  describe("search", () => {
    it("sets the current match apart from the other matches", async () => {
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={park}
          defaultExpanded={[
            "$",
            "$/.animals",
            "$/.animals/[0]",
            "$/.animals/[2]",
          ]}
          searchable
        />,
      );
      await screen.getByRole("searchbox").fill("chamois");
      await expect.element(screen.getByText("2 matches")).toBeVisible();

      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByText("1 of 2")).toBeVisible();

      const marks = [...document.querySelectorAll("mark")];
      const current = selectedRow()?.querySelector("mark");
      const other = marks.find((mark) => mark !== current);
      expect(current).not.toBeNull();
      expect(other).toBeDefined();
      expect(current ? getComputedStyle(current).backgroundColor : "").not.toBe(
        other ? getComputedStyle(other).backgroundColor : "",
      );
    });

    it("says which row matched when stepping, and ties the status to the field", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={park} searchable />,
      );
      const field = screen.getByRole("searchbox");
      await field.fill("marmot");
      await expect.element(screen.getByText("1 match")).toBeVisible();

      await userEvent.keyboard("{Enter}");

      await expect
        .poll(() => announcements())
        .toContain("Match 1 of 1: $.animals[1].name");
      await expect.element(field).toHaveAccessibleDescription("1 of 1");
    });

    it("goes back to the count when another row is selected by hand", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={park} searchable />,
      );
      await screen.getByRole("searchbox").fill("chamois");
      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByText("1 of 2")).toBeVisible();

      await screen.getByRole("treeitem", { name: /^name/u }).first().click();

      await expect.element(screen.getByText("2 matches")).toBeVisible();
    });

    it("does not announce again when only the value changes", async () => {
      const screen = await render(
        <ObjectInspector label="Park" value={park} searchable />,
      );
      await screen.getByRole("searchbox").fill("chamois");
      await expect.poll(() => announcements()).toEqual(["2 matches"]);

      await screen.rerender(
        <ObjectInspector
          label="Park"
          value={{ ...park, extra: "Chamois" }}
          searchable
        />,
      );
      await expect.element(screen.getByText("3 matches")).toBeVisible();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(announcements()).toEqual(["2 matches"]);
    });
  });

  describe("details", () => {
    it("says when only part of a value was copied", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
      const list = Array.from({ length: 6000 }, (_, index) => index);
      const screen = await render(
        <ObjectInspector
          label="List"
          value={{ list }}
          showDetails
          defaultSelected="$"
        />,
      );

      await screen.getByRole("button", { name: "Copy value" }).click();

      await expect
        .element(
          screen
            .getByRole("region", { name: "Selected value in List" })
            .getByText(
              "Part of the value copied. It is too large to copy whole.",
            ),
        )
        .toBeVisible();
    });

    it("does not bring the confirmation back when the row is selected again", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={park}
          showDetails
          defaultSelected="$"
        />,
      );
      const panel = screen.getByRole("region", {
        name: "Selected value in Park",
      });
      await screen.getByRole("treeitem", { name: /^name/u }).click();
      await screen.getByRole("button", { name: "Copy path" }).click();
      await expect.element(panel.getByText("Path copied")).toBeVisible();

      await screen.getByRole("treeitem", { name: /^animals/u }).click();
      await screen.getByRole("treeitem", { name: /^name/u }).click();

      await expect.element(panel.getByText("Path copied")).not.toBeVisible();
    });

    it("drops the confirmation when the value is replaced", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
      const screen = await render(
        <ObjectInspector
          label="Park"
          value={park}
          showDetails
          defaultSelected="$"
        />,
      );
      const panel = screen.getByRole("region", {
        name: "Selected value in Park",
      });
      await screen.getByRole("button", { name: "Copy value" }).click();
      await expect.element(panel.getByText("Value copied")).toBeVisible();

      await screen.rerender(
        <ObjectInspector
          label="Park"
          value={{ other: true }}
          showDetails
          defaultSelected="$"
        />,
      );

      await expect.element(panel.getByText("Value copied")).not.toBeVisible();
    });

    it("describes rows in plain words and marks the search text in the value", async () => {
      const text = `${"a".repeat(3000)}needle${"b".repeat(3000)}`;
      const screen = await render(
        <ObjectInspector
          label="Notes"
          value={{ text }}
          searchable
          showDetails
          defaultSelected="$"
        />,
      );
      const panel = screen.getByRole("region", {
        name: "Selected value in Notes",
      });

      await screen.getByRole("searchbox").fill("needle");
      await userEvent.keyboard("{Enter}");

      await expect.element(panel.getByText("String")).toBeVisible();
      await expect
        .element(panel.getByText("needle", { exact: true }))
        .toBeVisible();
      await expect
        .element(panel.getByText(/Showing 2,002 of 6,006 characters/u))
        .toBeVisible();
    });
  });
});
