import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Tree, type TreeNode, type TreeProps } from "../index.js";

interface Folder extends TreeNode {
  readonly name: string;
}

function folder(name: string, ...contents: Folder[]): Folder {
  return {
    id: name,
    name,
    hasChildren: contents.length > 0,
    children: () => contents,
  };
}

const files = folder(
  "root",
  folder("docs", folder("guide"), folder("notes", folder("draft"))),
  folder("src", folder("index")),
  folder("readme"),
);

function Files({
  expanded,
  defaultExpanded = ["root"],
  ...props
}: Partial<TreeProps<Folder>>) {
  const expansion = expanded ? { expanded } : { defaultExpanded };
  return (
    <Tree
      root={files}
      label="Files"
      renderRow={(row) => row.node.name}
      getRowText={(row) => row.node.name}
      {...props}
      {...expansion}
    />
  );
}

function names(): string[] {
  return [...document.querySelectorAll('[role="treeitem"]')].map(
    (row) => row.textContent ?? "",
  );
}

function focusedName(): string {
  return document.activeElement?.textContent ?? "";
}

async function press(...keys: string[]): Promise<void> {
  for (const key of keys) {
    await userEvent.keyboard(key);
  }
}

describe("Tree", () => {
  describe("structure", () => {
    it("is a named tree whose rows are tree items", async () => {
      const screen = await render(<Files />);

      await expect
        .element(screen.getByRole("tree", { name: "Files" }))
        .toBeVisible();
      expect(names()).toEqual(["root", "docs", "src", "readme"]);
    });

    it("tells assistive technology each row's level, position and state", async () => {
      const screen = await render(<Files />);
      const src = screen.getByRole("treeitem", { name: "src" });
      const readme = screen.getByRole("treeitem", { name: "readme" });

      await expect.element(src).toHaveAttribute("aria-level", "2");
      await expect.element(src).toHaveAttribute("aria-posinset", "2");
      await expect.element(src).toHaveAttribute("aria-setsize", "3");
      await expect.element(src).toHaveAttribute("aria-expanded", "false");
      await expect.element(readme).not.toHaveAttribute("aria-expanded");
    });

    it("indents rows by their level", async () => {
      const screen = await render(<Files defaultExpanded={["root", "docs"]} />);
      const indent = (name: string) =>
        Number.parseFloat(
          getComputedStyle(screen.getByRole("treeitem", { name }).element())
            .paddingInlineStart,
        );

      expect(indent("root")).toBe(0);
      expect(indent("docs")).toBeGreaterThan(indent("root"));
      expect(indent("guide")).toBe(indent("docs") * 2);
    });

    it("keeps a consumer class name and forwards the ref and native attributes", async () => {
      const ref = vi.fn();
      const screen = await render(
        <Files ref={ref} className="mine" data-testid="files" />,
      );
      const tree = screen.getByTestId("files");

      await expect.element(tree).toHaveClass("mine");
      expect(ref).toHaveBeenCalledWith(tree.element());
    });
  });

  describe("focus", () => {
    it("is a single tab stop", async () => {
      await render(
        <>
          <button type="button">before</button>
          <Files />
          <button type="button">after</button>
        </>,
      );

      await userEvent.tab();
      await userEvent.tab();
      expect(focusedName()).toBe("root");

      await userEvent.tab();
      expect(focusedName()).toBe("after");
    });

    it("returns to the row that was current when tabbing back in", async () => {
      await render(
        <>
          <Files />
          <button type="button">after</button>
        </>,
      );

      await userEvent.tab();
      await press("{ArrowDown}", "{ArrowDown}");
      await userEvent.tab();
      await userEvent.tab({ shift: true });

      expect(focusedName()).toBe("src");
    });

    it("shows a focus ring on the row reached by keyboard and marks it selected", async () => {
      const screen = await render(<Files />);

      await userEvent.tab();
      await press("{ArrowDown}");
      const docs = screen.getByRole("treeitem", { name: "docs" });

      expect(getComputedStyle(docs.element()).outlineStyle).toBe("solid");
      await expect.element(docs).toHaveAttribute("aria-selected", "true");
      await expect
        .element(screen.getByRole("treeitem", { name: "root" }))
        .toHaveAttribute("aria-selected", "false");
    });

    it("moves focus to the nearest visible ancestor when the parent closes a branch around it", async () => {
      const screen = await render(
        <Files expanded={new Set(["root", "docs", "notes"])} />,
      );
      await screen.getByRole("treeitem", { name: "draft" }).click();

      await screen.rerender(<Files expanded={new Set(["root"])} />);

      await expect
        .element(screen.getByRole("treeitem", { name: "docs" }))
        .toHaveFocus();
    });

    it("moves focus to the first row when the whole tree is replaced", async () => {
      const screen = await render(<Files />);
      await screen.getByRole("treeitem", { name: "readme" }).click();

      await screen.rerender(<Files root={folder("other", folder("new"))} />);

      await expect
        .element(screen.getByRole("treeitem", { name: "other" }))
        .toHaveFocus();
    });

    it("does not take focus when a branch closes while focus is elsewhere", async () => {
      const screen = await render(
        <>
          <Files expanded={new Set(["root", "docs"])} />
          <button type="button">after</button>
        </>,
      );
      await screen.getByRole("treeitem", { name: "guide" }).click();
      await screen.getByRole("button", { name: "after" }).click();

      await screen.rerender(
        <>
          <Files expanded={new Set(["root"])} />
          <button type="button">after</button>
        </>,
      );

      await expect
        .element(screen.getByRole("button", { name: "after" }))
        .toHaveFocus();
    });

    it("keeps one tab stop when the current row disappears", async () => {
      const screen = await render(
        <Files expanded={new Set(["root", "docs"])} />,
      );
      await screen.getByRole("treeitem", { name: "guide" }).click();

      await screen.rerender(<Files expanded={new Set(["root"])} />);

      expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });
  });

  describe("keyboard", () => {
    it("moves between visible rows with the arrow keys", async () => {
      await render(<Files />);
      await userEvent.tab();

      await press("{ArrowDown}", "{ArrowDown}");
      expect(focusedName()).toBe("src");

      await press("{ArrowUp}");
      expect(focusedName()).toBe("docs");
    });

    it("jumps to the first and last row", async () => {
      await render(<Files />);
      await userEvent.tab();

      await press("{End}");
      expect(focusedName()).toBe("readme");

      await press("{Home}");
      expect(focusedName()).toBe("root");
    });

    it("opens a branch, then moves into it, with Right", async () => {
      await render(<Files />);
      await userEvent.tab();
      await press("{ArrowDown}");

      await press("{ArrowRight}");
      expect(names()).toContain("guide");
      expect(focusedName()).toBe("docs");

      await press("{ArrowRight}");
      expect(focusedName()).toBe("guide");
    });

    it("moves to the parent, then closes it, with Left", async () => {
      await render(<Files defaultExpanded={["root", "docs"]} />);
      await userEvent.tab();
      await press("{ArrowDown}", "{ArrowDown}");
      expect(focusedName()).toBe("guide");

      await press("{ArrowLeft}");
      expect(focusedName()).toBe("docs");

      await press("{ArrowLeft}");
      expect(names()).not.toContain("guide");
      expect(focusedName()).toBe("docs");
    });

    it.each(["{Enter}", " "])(
      "opens and closes a branch with %j",
      async (key) => {
        await render(<Files />);
        await userEvent.tab();
        await press("{ArrowDown}");

        await press(key);
        expect(names()).toContain("guide");

        await press(key);
        expect(names()).not.toContain("guide");
      },
    );

    it("opens every sibling with the asterisk", async () => {
      await render(<Files />);
      await userEvent.tab();
      await press("{ArrowDown}", "*");

      expect(names()).toEqual([
        "root",
        "docs",
        "guide",
        "notes",
        "src",
        "index",
        "readme",
      ]);
    });

    it("jumps to a row by typing its first letters", async () => {
      await render(<Files />);
      await userEvent.tab();

      await press("r", "e");
      expect(focusedName()).toBe("readme");
    });

    it("cycles through rows sharing a first letter when the letter is repeated", async () => {
      await render(
        <Files
          root={folder("root", folder("docs"), folder("drafts"), folder("src"))}
        />,
      );
      await userEvent.tab();

      await press("d");
      expect(focusedName()).toBe("docs");

      await press("d");
      expect(focusedName()).toBe("drafts");

      await press("d");
      expect(focusedName()).toBe("docs");
    });

    it("starts a new search after a pause in typing", async () => {
      await render(<Files />);
      await userEvent.tab();

      await press("s");
      expect(focusedName()).toBe("src");

      await new Promise((resolve) => setTimeout(resolve, 600));
      await press("d");
      expect(focusedName()).toBe("docs");
    });

    it("stops the arrow keys from scrolling the page", async () => {
      const prevented: boolean[] = [];
      const record = (event: KeyboardEvent) =>
        prevented.push(event.defaultPrevented);
      await render(<Files />);
      await userEvent.tab();
      window.addEventListener("keydown", record);

      await press("{ArrowDown}", "{Escape}");
      window.removeEventListener("keydown", record);

      expect(prevented).toEqual([true, false]);
    });

    it("leaves shortcuts with a modifier key to the browser", async () => {
      await render(<Files />);
      await userEvent.tab();

      const shortcut = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.activeElement?.dispatchEvent(shortcut);

      expect(shortcut.defaultPrevented).toBe(false);
      expect(focusedName()).toBe("root");
    });

    it("lets a consumer handle a key first and cancel the default", async () => {
      await render(
        <Files
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
            }
          }}
        />,
      );
      await userEvent.tab();

      await press("{ArrowDown}");
      expect(focusedName()).toBe("root");

      await press("{End}");
      expect(focusedName()).toBe("readme");
    });
  });

  describe("pointer", () => {
    it("opens and closes a branch on click and makes it the current row", async () => {
      const screen = await render(<Files />);
      const docs = screen.getByRole("treeitem", { name: "docs" });

      await docs.click();
      expect(names()).toContain("guide");
      await expect.element(docs).toHaveFocus();

      await docs.click();
      expect(names()).not.toContain("guide");
    });

    it("leaves a click on a control inside a row to that control", async () => {
      const onCopy = vi.fn();
      const screen = await render(
        <Files
          renderRow={(row) => (
            <>
              {row.node.name}{" "}
              <button type="button" onClick={onCopy}>
                Copy {row.node.name}
              </button>
            </>
          )}
        />,
      );

      await screen.getByRole("button", { name: "Copy docs" }).click();

      expect(onCopy).toHaveBeenCalledOnce();
      expect(names().join()).not.toContain("guide");
    });

    it("makes a row without children current on click", async () => {
      const screen = await render(<Files />);
      const readme = screen.getByRole("treeitem", { name: "readme" });

      await readme.click();

      await expect.element(readme).toHaveFocus();
      await expect.element(readme).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("open state", () => {
    it("starts with nothing open unless told otherwise", async () => {
      await render(
        <Tree root={files} label="Files" renderRow={(row) => row.node.name} />,
      );

      expect(names()).toEqual(["root"]);
    });

    it("reports every change and manages the state itself by default", async () => {
      const onExpandedChange = vi.fn();
      await render(<Files onExpandedChange={onExpandedChange} />);
      await userEvent.tab();

      await press("{ArrowDown}", "{ArrowRight}");

      expect(onExpandedChange).toHaveBeenCalledOnce();
      expect(onExpandedChange).toHaveBeenCalledWith(new Set(["root", "docs"]));
      expect(names()).toContain("guide");
    });

    it("shows only what the parent says is open when controlled", async () => {
      const onExpandedChange = vi.fn();
      const screen = await render(
        <Files
          expanded={new Set(["root"])}
          onExpandedChange={onExpandedChange}
        />,
      );
      await userEvent.tab();

      await press("{ArrowDown}", "{ArrowRight}");
      expect(onExpandedChange).toHaveBeenCalledOnce();
      expect(names()).not.toContain("guide");

      await screen.rerender(<Files expanded={new Set(["root", "docs"])} />);
      expect(names()).toContain("guide");
    });
  });

  describe("selection", () => {
    it("tells the parent which row is selected as focus moves", async () => {
      const onSelectedChange = vi.fn();
      await render(<Files onSelectedChange={onSelectedChange} />);
      await userEvent.tab();

      await press("{ArrowDown}", "{ArrowDown}");

      expect(onSelectedChange.mock.calls).toEqual([
        ["root"],
        ["docs"],
        ["src"],
      ]);
    });

    it("tells the parent when a click selects a row", async () => {
      const onSelectedChange = vi.fn();
      const screen = await render(
        <Files onSelectedChange={onSelectedChange} />,
      );

      await screen.getByRole("treeitem", { name: "readme" }).click();

      expect(onSelectedChange).toHaveBeenLastCalledWith("readme");
    });

    it("selects the row the parent asks for, without taking focus", async () => {
      const screen = await render(<Files selected="src" />);
      const src = screen.getByRole("treeitem", { name: "src" });

      await expect.element(src).toHaveAttribute("aria-selected", "true");
      await expect.element(src).toHaveAttribute("tabindex", "0");
      expect(document.activeElement).toBe(document.body);
    });

    it("keeps the parent's selection until the parent changes it", async () => {
      const onSelectedChange = vi.fn();
      const screen = await render(
        <Files selected="src" onSelectedChange={onSelectedChange} />,
      );
      await userEvent.tab();

      await press("{ArrowDown}");
      expect(onSelectedChange).toHaveBeenLastCalledWith("readme");
      await expect
        .element(screen.getByRole("treeitem", { name: "src" }))
        .toHaveAttribute("aria-selected", "true");

      await screen.rerender(<Files selected="readme" />);
      await expect
        .element(screen.getByRole("treeitem", { name: "readme" }))
        .toHaveAttribute("aria-selected", "true");
    });

    it("leaves focus alone after a move the parent declined", async () => {
      const screen = await render(
        <>
          <Files selected="src" />
          <input aria-label="Elsewhere" />
        </>,
      );
      await userEvent.tab();
      await press("{ArrowDown}");

      await screen.getByRole("textbox", { name: "Elsewhere" }).click();
      await screen.rerender(
        <>
          <Files selected="src" className="again" />
          <input aria-label="Elsewhere" />
        </>,
      );

      await expect
        .element(screen.getByRole("textbox", { name: "Elsewhere" }))
        .toHaveFocus();
    });

    it("keeps the last row it showed when the parent asks for a hidden one", async () => {
      const onSelectedChange = vi.fn();
      const screen = await render(
        <Files
          expanded={new Set(["root", "docs"])}
          selected="guide"
          onSelectedChange={onSelectedChange}
        />,
      );
      await screen.rerender(
        <Files
          expanded={new Set(["root"])}
          selected="guide"
          onSelectedChange={onSelectedChange}
        />,
      );
      await screen.rerender(
        <Files
          expanded={new Set(["root"])}
          selected="readme"
          onSelectedChange={onSelectedChange}
        />,
      );

      await screen.rerender(
        <Files
          expanded={new Set(["root"])}
          selected="index"
          onSelectedChange={onSelectedChange}
        />,
      );

      await expect
        .element(screen.getByRole("treeitem", { name: "readme" }))
        .toHaveAttribute("aria-selected", "true");
      expect(onSelectedChange).toHaveBeenLastCalledWith("readme");
    });

    it("lets the keyboard move on from a fallback row", async () => {
      const screen = await render(
        <Files expanded={new Set(["root"])} selected="index" />,
      );
      await userEvent.tab();

      await press("{ArrowDown}");

      await expect
        .element(screen.getByRole("treeitem", { name: "docs" }))
        .toHaveAttribute("aria-selected", "true");
      expect(focusedName()).toBe("docs");
    });

    it("moves focus to the current row when the tree itself is focused", async () => {
      const screen = await render(<Files selected="src" />);

      screen.getByRole("tree").element().focus();

      expect(focusedName()).toBe("src");
    });

    it("leaves letter keys to the browser when it has no row text to search", async () => {
      const prevented: boolean[] = [];
      const record = (event: KeyboardEvent) => {
        prevented.push(event.defaultPrevented);
      };
      await render(<Files getRowText={undefined} />);
      await userEvent.tab();
      document.addEventListener("keydown", record);

      await press("s", "{ArrowDown}");
      document.removeEventListener("keydown", record);

      expect(prevented).toEqual([false, true]);
    });

    it("brings the start of a deep row into view in a narrow tree", async () => {
      const screen = await render(
        <Files
          defaultExpanded={["root", "docs", "notes"]}
          style={{ inlineSize: "6rem", "--tree-indent": "4rem" } as never}
        />,
      );
      const tree = screen.getByRole("tree").element();
      await userEvent.tab();

      await press(
        "{End}",
        "{Home}",
        "{ArrowDown}",
        "{ArrowDown}",
        "{ArrowDown}",
        "{ArrowDown}",
      );

      expect(focusedName()).toBe("draft");
      const toggle = document.activeElement?.firstElementChild;
      const offset =
        (toggle?.getBoundingClientRect().left ?? 0) -
        tree.getBoundingClientRect().left;
      expect(tree.scrollLeft).toBeGreaterThan(0);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(tree.clientWidth / 2 + 1);
    });

    it("gives a callback ref the tree once, not on every render", async () => {
      const attach = vi.fn();
      const screen = await render(<Files ref={attach} />);

      await screen.rerender(<Files ref={attach} className="again" />);
      await screen.rerender(<Files ref={attach} className="once more" />);

      expect(attach).toHaveBeenCalledTimes(1);
    });

    it("tells the parent when its selected row closes and an ancestor takes over", async () => {
      const onSelectedChange = vi.fn();
      const screen = await render(
        <Files
          expanded={new Set(["root", "docs"])}
          selected="guide"
          onSelectedChange={onSelectedChange}
        />,
      );

      await screen.rerender(
        <Files
          expanded={new Set(["root"])}
          selected="guide"
          onSelectedChange={onSelectedChange}
        />,
      );

      await expect
        .element(screen.getByRole("treeitem", { name: "docs" }))
        .toHaveAttribute("aria-selected", "true");
      expect(onSelectedChange).toHaveBeenLastCalledWith("docs");
    });
  });

  describe("large trees", () => {
    const ROW_COUNT = 100_000;
    const many = folder(
      "root",
      ...Array.from({ length: ROW_COUNT }, (_, index) =>
        folder(`item ${index}`),
      ),
    );

    function Many(props: Partial<TreeProps<Folder>>) {
      return (
        <>
          <style>
            {".scroller { max-block-size: 300px; overflow: auto; }"}
          </style>
          <Files root={many} className="scroller" {...props} />
        </>
      );
    }

    function renderedRows(): Element[] {
      return [...document.querySelectorAll('[role="treeitem"]')];
    }

    async function settle(): Promise<void> {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    it.each(["defaultSelected", "selected"] as const)(
      "brings a row given as %s into its own view at the start, without scrolling the page",
      async (prop) => {
        const screen = await render(
          <>
            <div style={{ blockSize: "150vh" }} />
            <Many {...{ [prop]: "item 4000" }} />
          </>,
        );
        await settle();
        const tree = screen.getByRole("tree").element();
        const row = screen
          .getByRole("treeitem", { name: "item 4000", exact: true })
          .element()
          .getBoundingClientRect();
        const view = tree.getBoundingClientRect();

        expect(row.top).toBeGreaterThanOrEqual(view.top);
        expect(row.bottom).toBeLessThanOrEqual(view.bottom);
        expect(window.scrollY).toBe(0);
      },
    );

    it("keeps a row of context past a selected row it scrolls to", async () => {
      const screen = await render(<Many selected="item 0" />);
      await settle();
      const tree = screen.getByRole("tree").element();

      await screen.rerender(<Many selected="item 20" />);
      await settle();
      const row = screen
        .getByRole("treeitem", { name: "item 20", exact: true })
        .element()
        .getBoundingClientRect();
      const view = tree.getBoundingClientRect();

      expect(tree.scrollTop).toBeGreaterThan(0);
      expect(view.bottom - row.bottom).toBeGreaterThanOrEqual(row.height);
    });

    it("renders every row of a tree with up to 200 rows", async () => {
      const small = folder(
        "root",
        ...Array.from({ length: 199 }, (_, index) => folder(`item ${index}`)),
      );
      await render(<Files root={small} className="scroller" />);

      expect(renderedRows()).toHaveLength(200);
      expect(document.querySelector("[data-gap-rows]")).toBeNull();
    });

    it("renders only the rows near the view", async () => {
      const screen = await render(<Many />);
      await settle();

      expect(renderedRows().length).toBeGreaterThan(10);
      expect(renderedRows().length).toBeLessThan(60);
      await expect
        .element(screen.getByRole("treeitem", { name: "item 0", exact: true }))
        .toHaveAttribute("aria-setsize", String(ROW_COUNT));
    });

    it("keeps the full scrolling height", async () => {
      const screen = await render(<Many />);
      await settle();
      const tree = screen.getByRole("tree").element();
      const rowHeight = renderedRows()[0]?.getBoundingClientRect().height ?? 0;

      expect(rowHeight).toBeGreaterThan(0);
      expect(tree.scrollHeight / rowHeight).toBeGreaterThan(ROW_COUNT * 0.99);
      expect(tree.scrollHeight / rowHeight).toBeLessThan(ROW_COUNT * 1.01);
    });

    it.each([0.25, 0.5, 0.999])(
      "shows the rows at the new position after scrolling %f of the way",
      async (fraction) => {
        const screen = await render(<Many />);
        await settle();
        const tree = screen.getByRole("tree").element();

        tree.scrollTop = tree.scrollHeight * fraction;
        await settle();
        const { top, bottom } = tree.getBoundingClientRect();
        const inView = renderedRows().filter((row) => {
          const bounds = row.getBoundingClientRect();
          return bounds.bottom > top && bounds.top < bottom;
        });
        const first = Number(inView[0]?.getAttribute("aria-posinset"));

        expect(inView.length).toBeGreaterThan(10);
        expect(first / ROW_COUNT).toBeCloseTo(fraction, 2);
        expect(renderedRows().length).toBeLessThan(60);
      },
    );

    it("moves to the last row with End and back with Home", async () => {
      const screen = await render(<Many />);
      await userEvent.tab();

      await press("{End}");
      expect(focusedName()).toBe(`item ${ROW_COUNT - 1}`);
      await expect
        .element(
          screen.getByRole("treeitem", { name: `item ${ROW_COUNT - 1}` }),
        )
        .toBeInViewport();

      await press("{Home}");
      expect(focusedName()).toBe("root");
      await expect
        .element(screen.getByRole("treeitem", { name: "root" }))
        .toBeInViewport();
      expect(renderedRows().length).toBeLessThan(60);
    });

    it("keeps the focused row and the keyboard position after scrolling away", async () => {
      const screen = await render(<Many />);
      await userEvent.tab();
      await press("{ArrowDown}", "{ArrowDown}");
      const tree = screen.getByRole("tree").element();

      tree.scrollTop = tree.scrollHeight / 2;
      await settle();
      expect(focusedName()).toBe("item 1");

      await press("{ArrowDown}");
      expect(focusedName()).toBe("item 2");
      await expect
        .element(screen.getByRole("treeitem", { name: "item 2", exact: true }))
        .toBeInViewport();
    });

    it("brings a row the parent selects into view", async () => {
      const screen = await render(<Many selected="root" />);
      await settle();

      await screen.rerender(<Many selected="item 70000" />);
      await settle();

      await expect
        .element(
          screen.getByRole("treeitem", { name: "item 70000", exact: true }),
        )
        .toBeInViewport();
    });

    it("windows against the page when the tree has no height of its own", async () => {
      const screen = await render(<Many className="" />);
      await settle();
      expect(renderedRows().length).toBeLessThan(120);

      window.scrollTo(0, document.documentElement.scrollHeight / 2);
      await settle();
      const visible = renderedRows().filter((row) => {
        const { top, bottom } = row.getBoundingClientRect();
        return bottom > 0 && top < window.innerHeight;
      });

      expect(visible.length).toBeGreaterThan(5);
      expect(renderedRows().length).toBeLessThan(120);
      await expect
        .element(screen.getByRole("tree"))
        .toHaveAttribute("aria-label", "Files");
      window.scrollTo(0, 0);
    });

    it("windows against a scrolling panel around the tree", async () => {
      const screen = await render(
        <>
          <style>{".panel { block-size: 200px; overflow: auto; }"}</style>
          <div className="panel" data-testid="panel">
            <Many className="" />
          </div>
        </>,
      );
      await settle();
      const panel = screen.getByTestId("panel").element();
      const inPanel = () => {
        const { top, bottom } = panel.getBoundingClientRect();
        return renderedRows().filter((row) => {
          const bounds = row.getBoundingClientRect();
          return bounds.bottom > top && bounds.top < bottom;
        });
      };
      const rowHeight = renderedRows()[0]?.getBoundingClientRect().height ?? 1;
      const most = Math.ceil(200 / rowHeight) + 22;

      expect(inPanel().length).toBeGreaterThan(5);
      expect(renderedRows().length).toBeLessThanOrEqual(most);

      panel.scrollTop = panel.scrollHeight / 2;
      await settle();

      expect(inPanel().length).toBeGreaterThan(5);
      expect(
        Number(inPanel()[0]?.getAttribute("aria-posinset")) / ROW_COUNT,
      ).toBeCloseTo(0.5, 2);
      expect(renderedRows().length).toBeLessThanOrEqual(most);
    });

    it("opens, jumps to the end and closes well within a generous time", async () => {
      const screen = await render(<Many defaultExpanded={[]} />);
      await userEvent.tab();
      const started = performance.now();

      await press("{ArrowRight}", "{End}", "{Home}", "{ArrowLeft}");
      await settle();

      expect(performance.now() - started).toBeLessThan(5000);
      await expect
        .element(screen.getByRole("treeitem", { name: "root" }))
        .toHaveAttribute("aria-expanded", "false");
      expect(renderedRows()).toHaveLength(1);
    });
  });

  describe("right to left", () => {
    it("opens with the arrow that points the way the chevron points", async () => {
      const screen = await render(
        <div dir="rtl">
          <Files />
        </div>,
      );
      await userEvent.tab();
      await press("{ArrowDown}");
      expect(focusedName()).toBe("docs");

      await press("{ArrowLeft}");
      await expect
        .element(screen.getByRole("treeitem", { name: "docs" }))
        .toHaveAttribute("aria-expanded", "true");

      await press("{ArrowLeft}");
      expect(focusedName()).toBe("guide");

      await press("{ArrowRight}");
      expect(focusedName()).toBe("docs");
      await press("{ArrowRight}");
      await expect
        .element(screen.getByRole("treeitem", { name: "docs" }))
        .toHaveAttribute("aria-expanded", "false");
    });

    it("indents from the right and brings the start of a deep row into view", async () => {
      const screen = await render(
        <div dir="rtl">
          <Files
            defaultExpanded={["root", "docs", "notes"]}
            style={{ inlineSize: "6rem", "--tree-indent": "4rem" } as never}
          />
        </div>,
      );
      const tree = screen.getByRole("tree").element();
      await userEvent.tab();

      await press(
        "{End}",
        "{Home}",
        "{ArrowDown}",
        "{ArrowDown}",
        "{ArrowDown}",
        "{ArrowDown}",
      );

      expect(focusedName()).toBe("draft");
      const toggle = document.activeElement?.firstElementChild;
      const offset =
        tree.getBoundingClientRect().right -
        (toggle?.getBoundingClientRect().right ?? 0);
      expect(tree.scrollLeft).toBeLessThan(0);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(tree.clientWidth / 2 + 1);
    });
  });

  describe("acting on rows", () => {
    it("reports a row on Enter and on click, and still toggles a row with children", async () => {
      const onRowAction = vi.fn();
      const screen = await render(<Files onRowAction={onRowAction} />);
      const acted = () =>
        onRowAction.mock.calls.map(([row]) => (row as { id: string }).id);

      await screen.getByRole("treeitem", { name: "readme" }).click();
      expect(acted()).toEqual(["readme"]);

      await press("{Enter}");
      expect(acted()).toEqual(["readme", "readme"]);

      await press(" ");
      expect(acted()).toHaveLength(2);

      await screen.getByRole("treeitem", { name: "docs" }).click();
      expect(acted()).toEqual(["readme", "readme", "docs"]);
      expect(names()).toContain("guide");
    });

    it("does not report a row for a click on a control inside it", async () => {
      const onRowAction = vi.fn();
      const screen = await render(
        <Files
          onRowAction={onRowAction}
          renderRow={(row) => (
            <button type="button">Copy {row.node.name}</button>
          )}
        />,
      );

      await screen.getByRole("button", { name: "Copy readme" }).click();

      expect(onRowAction).not.toHaveBeenCalled();
    });
  });

  describe("starting row and controls in rows", () => {
    it("starts on a given row when uncontrolled", async () => {
      const screen = await render(<Files defaultSelected="src" />);

      await expect
        .element(screen.getByRole("treeitem", { name: "src" }))
        .toHaveAttribute("aria-selected", "true");
      await userEvent.tab();
      expect(focusedName()).toBe("src");
    });

    it("tells a row whether it is the current one, so its controls can leave the tab order", async () => {
      const screen = await render(
        <>
          <Files
            renderRow={(row, { selected }) => (
              <>
                {row.node.name}{" "}
                <button type="button" tabIndex={selected ? 0 : -1}>
                  Copy {row.node.name}
                </button>
              </>
            )}
          />
          <button type="button">After</button>
        </>,
      );

      await userEvent.tab();
      await press("{ArrowDown}");
      await userEvent.tab();
      await expect
        .element(screen.getByRole("button", { name: "Copy docs" }))
        .toHaveFocus();
      await userEvent.tab();
      await expect
        .element(screen.getByRole("button", { name: "After" }))
        .toHaveFocus();
    });
  });
});
