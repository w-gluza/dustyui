import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  INITIAL_TREE_STATE,
  reduceTree,
  visibleRows,
  type TreeAction,
  type TreeNode,
  type TreeRow,
  type TreeState,
} from "./treeModel.js";

interface Shape {
  readonly name: string;
  readonly contents: readonly Shape[];
}

interface Branch extends TreeNode {
  readonly name: string;
}

const { shape: anyShape } = fc.letrec<{ shape: Shape }>((tie) => ({
  shape: fc.record({
    name: fc.string({ maxLength: 3 }),
    contents: fc.oneof(
      { depthSize: "medium", maxDepth: 5 },
      fc.constant<readonly Shape[]>([]),
      fc.array(tie("shape"), { maxLength: 4 }),
    ),
  }),
}));

function toBranch(shape: Shape, id = "root"): Branch {
  const contents = shape.contents.map((child, index) =>
    toBranch(child, `${id}/${index}`),
  );
  return {
    id,
    name: shape.name,
    hasChildren: contents.length > 0,
    children: () => contents,
  };
}

const anyTree = anyShape.map((shape) => toBranch(shape));

const anySteps = fc.array(fc.nat(), { maxLength: 40 });
const RUNS = { numRuns: 300 };

const FIXED_ACTIONS: readonly TreeAction[] = [
  { type: "moveNext" },
  { type: "movePrevious" },
  { type: "moveFirst" },
  { type: "moveLast" },
  { type: "moveIn" },
  { type: "moveIn" },
  { type: "moveOut" },
  { type: "toggle" },
  { type: "expandSiblings" },
  { type: "typeahead", text: "a" },
  { type: "typeahead", text: "ab" },
];
const TARGETED = ["toggle", "expand", "expand", "collapse", "focus"] as const;

function toAction(seed: number, rows: readonly TreeRow[]): TreeAction {
  const choice = seed % (FIXED_ACTIONS.length + TARGETED.length);
  const fixed = FIXED_ACTIONS[choice];
  if (fixed) {
    return fixed;
  }
  const type = TARGETED[choice - FIXED_ACTIONS.length] ?? "focus";
  const row = rows[Math.floor(seed / 16) % rows.length];
  return { type, id: row?.id ?? "" };
}

function labelOf(row: TreeRow<Branch>): string {
  return row.node.name;
}

function run(
  root: Branch,
  steps: readonly number[],
  check: (state: TreeState, rows: TreeRow<Branch>[]) => void,
): void {
  let state = INITIAL_TREE_STATE;
  for (const step of steps) {
    const rows = visibleRows(root, state.expanded);
    state = reduceTree(rows, state, toAction(step, rows), labelOf);
    check(state, visibleRows(root, state.expanded));
  }
}

describe("the tree model, for any tree and any sequence of actions", () => {
  it("keeps focus on a row that is visible", () => {
    fc.assert(
      fc.property(anyTree, anySteps, (root, steps) => {
        run(root, steps, (state, rows) => {
          if (state.focused !== undefined) {
            expect(rows.map((row) => row.id)).toContain(state.focused);
          }
        });
      }),
      RUNS,
    );
  });

  it("keeps every visible row under an open, visible parent", () => {
    fc.assert(
      fc.property(anyTree, anySteps, (root, steps) => {
        run(root, steps, (_state, rows) => {
          const seen = new Map<string, TreeRow>();
          for (const row of rows) {
            const parent =
              row.parentId === undefined ? undefined : seen.get(row.parentId);
            if (row.parentId === undefined) {
              expect(row.level).toBe(1);
            } else {
              expect(parent?.expanded).toBe(true);
              expect(row.level).toBe((parent?.level ?? 0) + 1);
              expect(row.setSize).toBe(parent?.node.children().length);
            }
            expect(row.positionInSet).toBeGreaterThanOrEqual(1);
            expect(row.positionInSet).toBeLessThanOrEqual(row.setSize);
            expect(seen.has(row.id)).toBe(false);
            seen.set(row.id, row);
          }
        });
      }),
      RUNS,
    );
  });

  it("shows exactly the root plus the children of every open row", () => {
    fc.assert(
      fc.property(anyTree, anySteps, (root, steps) => {
        run(root, steps, (_state, rows) => {
          const expected = rows
            .filter((row) => row.expanded)
            .reduce((total, row) => total + row.node.children().length, 1);

          expect(rows).toHaveLength(expected);
        });
      }),
      RUNS,
    );
  });

  it("never changes a state it was given", () => {
    fc.assert(
      fc.property(anyTree, anySteps, (root, steps) => {
        let state = INITIAL_TREE_STATE;
        for (const step of steps) {
          const rows = visibleRows(root, state.expanded);
          const before = [...state.expanded];
          const focused = state.focused;
          const next = reduceTree(rows, state, toAction(step, rows), labelOf);

          expect([...state.expanded]).toEqual(before);
          expect(state.focused).toBe(focused);
          state = next;
        }
      }),
      RUNS,
    );
  });
});
