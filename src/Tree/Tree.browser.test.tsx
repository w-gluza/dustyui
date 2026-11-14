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
    childCount: contents.length,
    children: () => contents,
  };
}

const files = folder(
  "root",
  folder("docs", folder("guide"), folder("notes", folder("draft"))),
  folder("src", folder("index")),
  folder("readme"),
);

function Files(props: Partial<TreeProps<Folder>>) {
  return (
    <Tree
      root={files}
      label="Files"
      defaultExpanded={["root"]}
      renderRow={(row) => row.node.name}
      getRowText={(row) => row.node.name}
      {...props}
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
      await render(<Files defaultExpanded={undefined} />);

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
});
