import { describe, expect, it } from "vitest";
import {
  findVisibleAncestor,
  getTypeaheadText,
  INITIAL_TREE_STATE,
  keyToAction,
  reduceTree,
  visibleRows,
  type TreeAction,
  type TreeNode,
  type TreeState,
} from "./treeModel.js";

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

const root = folder(
  "root",
  folder("docs", folder("guide"), folder("notes", folder("draft"))),
  folder("src", folder("index")),
  folder("readme"),
);

function state(expanded: string[], focused?: string): TreeState {
  return { expanded: new Set(expanded), focused };
}

function ids(current: TreeState): string[] {
  return visibleRows(root, current.expanded).map((row) => row.id);
}

function apply(current: TreeState, ...actions: TreeAction[]): TreeState {
  return actions.reduce(
    (next, action) =>
      reduceTree(
        visibleRows(root, next.expanded),
        next,
        action,
        (row) => row.node.name,
      ),
    current,
  );
}

describe("visibleRows", () => {
  it("shows only the root when nothing is open", () => {
    expect(ids(INITIAL_TREE_STATE)).toEqual(["root"]);
  });

  it("lists open branches in reading order and skips closed ones", () => {
    expect(ids(state(["root", "docs"]))).toEqual([
      "root",
      "docs",
      "guide",
      "notes",
      "src",
      "readme",
    ]);
  });

  it("keeps a nested branch hidden while its parent is closed", () => {
    expect(ids(state(["root", "notes"]))).toEqual([
      "root",
      "docs",
      "src",
      "readme",
    ]);
  });

  it("records level, position and parent for each row", () => {
    const rows = visibleRows(root, new Set(["root", "docs"]));
    const notes = rows.find((row) => row.id === "notes");

    expect(notes).toMatchObject({
      parentId: "docs",
      level: 3,
      positionInSet: 2,
      setSize: 2,
      expandable: true,
      expanded: false,
    });
    expect(rows[0]).toMatchObject({ parentId: undefined, level: 1 });
  });

  it("marks a row without children as not expandable even when listed as open", () => {
    const rows = visibleRows(root, new Set(["root", "readme"]));

    expect(rows.find((row) => row.id === "readme")).toMatchObject({
      expandable: false,
      expanded: false,
    });
  });
});

describe("reduceTree", () => {
  const open = state(["root", "docs"], "docs");

  it("moves to the next and previous visible row", () => {
    expect(apply(open, { type: "moveNext" }).focused).toBe("guide");
    expect(apply(open, { type: "movePrevious" }).focused).toBe("root");
  });

  it("stays put at the first and last row", () => {
    const first = state(["root"], "root");
    const last = state(["root"], "readme");

    expect(apply(first, { type: "movePrevious" })).toBe(first);
    expect(apply(last, { type: "moveNext" })).toBe(last);
  });

  it("jumps to the first and last visible row", () => {
    expect(apply(open, { type: "moveLast" }).focused).toBe("readme");
    expect(apply(open, { type: "moveFirst" }).focused).toBe("root");
  });

  it("starts from the first row when nothing is focused yet", () => {
    const unfocused = state(["root"]);

    expect(apply(unfocused, { type: "moveNext" }).focused).toBe("root");
    expect(apply(unfocused, { type: "movePrevious" }).focused).toBe("root");
    expect(apply(unfocused, { type: "moveIn" }).focused).toBe("root");
  });

  describe("moving in", () => {
    it("opens a closed branch without moving", () => {
      const next = apply(state(["root"], "docs"), { type: "moveIn" });

      expect(next.focused).toBe("docs");
      expect(next.expanded.has("docs")).toBe(true);
    });

    it("moves to the first child of an open branch", () => {
      expect(apply(open, { type: "moveIn" }).focused).toBe("guide");
    });

    it("does nothing on a row without children", () => {
      const leaf = state(["root"], "readme");

      expect(apply(leaf, { type: "moveIn" })).toBe(leaf);
    });
  });

  describe("moving out", () => {
    it("closes an open branch without moving", () => {
      const next = apply(open, { type: "moveOut" });

      expect(next.focused).toBe("docs");
      expect(next.expanded.has("docs")).toBe(false);
    });

    it("moves to the parent from a closed branch or a leaf", () => {
      expect(
        apply(state(["root", "docs"], "guide"), { type: "moveOut" }).focused,
      ).toBe("docs");
    });

    it("does nothing on a closed root", () => {
      const closed = state([], "root");

      expect(apply(closed, { type: "moveOut" })).toBe(closed);
    });
  });

  describe("opening and closing", () => {
    it("toggles the focused branch", () => {
      const opened = apply(state(["root"], "src"), { type: "toggle" });
      const closed = apply(opened, { type: "toggle" });

      expect(opened.expanded.has("src")).toBe(true);
      expect(closed.expanded.has("src")).toBe(false);
    });

    it("toggles a branch by id without moving focus", () => {
      const next = apply(state(["root"], "readme"), {
        type: "toggle",
        id: "src",
      });

      expect(next.expanded.has("src")).toBe(true);
      expect(next.focused).toBe("readme");
    });

    it("ignores a toggle on a row without children", () => {
      const leaf = state(["root"], "readme");

      expect(apply(leaf, { type: "toggle" })).toBe(leaf);
    });

    it("moves focus to a branch that is closed around the focused row", () => {
      const deep = state(["root", "docs", "notes"], "draft");
      const next = apply(deep, { type: "collapse", id: "docs" });

      expect(next.focused).toBe("docs");
      expect(ids(next)).toContain(next.focused);
    });

    it("leaves focus alone when a different branch is closed", () => {
      const next = apply(state(["root", "docs", "src"], "index"), {
        type: "collapse",
        id: "docs",
      });

      expect(next.focused).toBe("index");
    });

    it("remembers which nested branches were open when a parent reopens", () => {
      const next = apply(
        state(["root", "docs", "notes"], "docs"),
        { type: "collapse", id: "docs" },
        { type: "expand", id: "docs" },
      );

      expect(ids(next)).toContain("draft");
    });

    it("opens every sibling of the focused row", () => {
      const next = apply(state(["root"], "readme"), {
        type: "expandSiblings",
      });

      expect([...next.expanded].sort()).toEqual(["docs", "root", "src"]);
      expect(next.focused).toBe("readme");
    });

    it("does not change the previous state", () => {
      const before = state(["root"], "docs");
      apply(before, { type: "moveIn" }, { type: "expandSiblings" });

      expect([...before.expanded]).toEqual(["root"]);
    });
  });

  describe("focus", () => {
    it("focuses a visible row by id", () => {
      expect(apply(open, { type: "focus", id: "src" }).focused).toBe("src");
    });

    it("ignores a row that is not visible", () => {
      expect(apply(open, { type: "focus", id: "draft" })).toBe(open);
    });
  });

  describe("typing", () => {
    it("jumps to the next row starting with the letter, ignoring case", () => {
      expect(apply(open, { type: "typeahead", text: "S" }).focused).toBe("src");
    });

    it("wraps round to the top", () => {
      const next = apply(state(["root", "docs"], "src"), {
        type: "typeahead",
        text: "g",
      });

      expect(next.focused).toBe("guide");
    });

    it("cycles through rows sharing a first letter", () => {
      const start = state(["root"], "root");
      const once = apply(start, { type: "typeahead", text: "r" });
      const twice = apply(once, { type: "typeahead", text: "r" });

      expect(once.focused).toBe("readme");
      expect(twice.focused).toBe("root");
    });

    it("matches several letters from the current row onwards", () => {
      const next = apply(state(["root"], "root"), {
        type: "typeahead",
        text: "re",
      });

      expect(next.focused).toBe("readme");
    });

    it("stays put when nothing matches", () => {
      expect(apply(open, { type: "typeahead", text: "z" })).toBe(open);
    });
  });
});

describe("keyToAction", () => {
  it.each([
    ["ArrowDown", { type: "moveNext" }],
    ["ArrowUp", { type: "movePrevious" }],
    ["ArrowRight", { type: "moveIn" }],
    ["ArrowLeft", { type: "moveOut" }],
    ["Home", { type: "moveFirst" }],
    ["End", { type: "moveLast" }],
    ["Enter", { type: "toggle" }],
    [" ", { type: "toggle" }],
    ["*", { type: "expandSiblings" }],
    ["a", { type: "typeahead", text: "a" }],
    ["é", { type: "typeahead", text: "é" }],
  ])("maps %j", (key, action) => {
    expect(keyToAction(key)).toEqual(action);
  });

  it.each(["Tab", "Escape", "Shift", "F5", "PageDown"])(
    "leaves %s to the browser",
    (key) => {
      expect(keyToAction(key)).toBeUndefined();
    },
  );
});

describe("laziness", () => {
  it("asks only open rows whether they have children", () => {
    const asked: string[] = [];
    const watched = (name: string, ...contents: TreeNode[]): TreeNode => ({
      id: name,
      get hasChildren() {
        asked.push(name);
        return contents.length > 0;
      },
      children: () => contents,
    });
    const tree = watched("root", watched("a", watched("deep")), watched("b"));

    visibleRows(tree, new Set(["root"]));

    expect(asked).toEqual(["root"]);
  });
});

describe("findVisibleAncestor", () => {
  const before = visibleRows(root, new Set(["root", "docs", "notes"]));

  it("returns the row itself while it is still visible", () => {
    expect(findVisibleAncestor(before, "draft", before)).toBe("draft");
  });

  it("returns the nearest ancestor that is still visible", () => {
    const after = visibleRows(root, new Set(["root", "docs"]));

    expect(findVisibleAncestor(before, "draft", after)).toBe("notes");
  });

  it("skips ancestors that were hidden too", () => {
    const after = visibleRows(root, new Set(["root"]));

    expect(findVisibleAncestor(before, "draft", after)).toBe("docs");
  });

  it("returns nothing when the row was never visible or the tree was replaced", () => {
    const other = visibleRows(folder("other"), new Set());

    expect(findVisibleAncestor(before, "missing", before)).toBeUndefined();
    expect(findVisibleAncestor(before, "draft", other)).toBeUndefined();
  });
});

describe("getTypeaheadText", () => {
  it("starts again after a pause", () => {
    expect(getTypeaheadText("do", "s", false)).toBe("s");
  });

  it("adds to the text while typing continues", () => {
    expect(getTypeaheadText("d", "o", true)).toBe("do");
    expect(getTypeaheadText("do", "c", true)).toBe("doc");
  });

  it("keeps a repeated letter as one letter so matches are cycled", () => {
    expect(getTypeaheadText("d", "d", true)).toBe("d");
    expect(getTypeaheadText("d", "D", true)).toBe("D");
  });

  it("treats a repeat after other letters as part of the word", () => {
    expect(getTypeaheadText("ad", "d", true)).toBe("add");
  });
});
