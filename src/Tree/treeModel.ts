export interface TreeNode {
  readonly id: string;
  readonly hasChildren: boolean;
  children(): readonly this[];
}

export interface TreeRow<Node extends TreeNode = TreeNode> {
  readonly node: Node;
  readonly id: string;
  readonly parentId: string | undefined;
  readonly level: number;
  readonly positionInSet: number;
  readonly setSize: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
}

export interface TreeState {
  readonly expanded: ReadonlySet<string>;
  readonly focused: string | undefined;
}

export type TreeAction =
  | { readonly type: "moveNext" }
  | { readonly type: "movePrevious" }
  | { readonly type: "moveFirst" }
  | { readonly type: "moveLast" }
  | { readonly type: "moveIn" }
  | { readonly type: "moveOut" }
  | { readonly type: "toggle"; readonly id?: string }
  | { readonly type: "expand"; readonly id: string }
  | { readonly type: "collapse"; readonly id: string }
  | { readonly type: "expandSiblings" }
  | { readonly type: "focus"; readonly id: string }
  | { readonly type: "typeahead"; readonly text: string };

export const INITIAL_TREE_STATE: TreeState = {
  expanded: new Set(),
  focused: undefined,
};

export function visibleRows<Node extends TreeNode>(
  root: Node,
  expanded: ReadonlySet<string>,
): TreeRow<Node>[] {
  const rows: TreeRow<Node>[] = [];
  const pending: TreeRow<Node>[] = [toRow(root, undefined, 1, 1, 1, expanded)];

  for (let row = pending.pop(); row; row = pending.pop()) {
    rows.push(row);
    if (!row.expanded) {
      continue;
    }
    const children = row.node.children();
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child) {
        pending.push(
          toRow(
            child,
            row.id,
            row.level + 1,
            index + 1,
            children.length,
            expanded,
          ),
        );
      }
    }
  }

  return rows;
}

function toRow<Node extends TreeNode>(
  node: Node,
  parentId: string | undefined,
  level: number,
  positionInSet: number,
  setSize: number,
  expanded: ReadonlySet<string>,
): TreeRow<Node> {
  return {
    node,
    id: node.id,
    parentId,
    level,
    positionInSet,
    setSize,
    get expandable() {
      return node.hasChildren;
    },
    get expanded() {
      return expanded.has(node.id) && node.hasChildren;
    },
  };
}

function withExpanded(
  state: TreeState,
  change: (expanded: Set<string>) => void,
): ReadonlySet<string> {
  const next = new Set(state.expanded);
  change(next);
  return next;
}

function isInside(
  rows: readonly TreeRow[],
  index: number,
  ancestorId: string,
): boolean {
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (
    let current = rows[index];
    current?.parentId !== undefined;
    current = byId.get(current.parentId)
  ) {
    if (current.parentId === ancestorId) {
      return true;
    }
  }
  return false;
}

function focusedIndex(rows: readonly TreeRow[], state: TreeState): number {
  return state.focused === undefined
    ? -1
    : rows.findIndex((row) => row.id === state.focused);
}

function focusRow(
  state: TreeState,
  rows: readonly TreeRow[],
  index: number,
): TreeState {
  const row = rows[Math.min(Math.max(index, 0), rows.length - 1)];
  return row && row.id !== state.focused
    ? { ...state, focused: row.id }
    : state;
}

function expand(state: TreeState, row: TreeRow | undefined): TreeState {
  return row?.expandable && !row.expanded
    ? {
        ...state,
        expanded: withExpanded(state, (expanded) => expanded.add(row.id)),
      }
    : state;
}

function collapse(
  state: TreeState,
  rows: readonly TreeRow[],
  row: TreeRow | undefined,
): TreeState {
  if (!row?.expanded) {
    return state;
  }
  const index = focusedIndex(rows, state);
  return {
    expanded: withExpanded(state, (expanded) => expanded.delete(row.id)),
    focused:
      index >= 0 && isInside(rows, index, row.id) ? row.id : state.focused,
  };
}

function expandSiblings(
  state: TreeState,
  rows: readonly TreeRow[],
  current: TreeRow,
): TreeState {
  const closed = rows.filter(
    (row) =>
      row.parentId === current.parentId && row.expandable && !row.expanded,
  );
  if (closed.length === 0) {
    return state;
  }
  return {
    ...state,
    expanded: withExpanded(state, (expanded) => {
      for (const row of closed) {
        expanded.add(row.id);
      }
    }),
  };
}

function typeahead<Node extends TreeNode>(
  state: TreeState,
  rows: readonly TreeRow<Node>[],
  index: number,
  text: string,
  labelOf: (row: TreeRow<Node>) => string,
): TreeState {
  const query = text.toLocaleLowerCase();
  if (query === "") {
    return state;
  }
  const start = query.length === 1 ? index + 1 : Math.max(index, 0);
  for (let offset = 0; offset < rows.length; offset++) {
    const candidate = (start + offset) % rows.length;
    const row = rows[candidate];
    if (row && labelOf(row).toLocaleLowerCase().startsWith(query)) {
      return focusRow(state, rows, candidate);
    }
  }
  return state;
}

export function reduceTree<Node extends TreeNode>(
  rows: readonly TreeRow<Node>[],
  state: TreeState,
  action: TreeAction,
  labelOf: (row: TreeRow<Node>) => string = () => "",
): TreeState {
  if (rows.length === 0) {
    return state;
  }
  const index = focusedIndex(rows, state);
  const current = rows[index];
  const byId = (id: string) => rows.find((row) => row.id === id);

  switch (action.type) {
    case "moveNext":
      return focusRow(state, rows, index + 1);
    case "movePrevious":
      return focusRow(state, rows, index < 0 ? 0 : index - 1);
    case "moveFirst":
      return focusRow(state, rows, 0);
    case "moveLast":
      return focusRow(state, rows, rows.length - 1);
    case "moveIn":
      if (!current) {
        return focusRow(state, rows, 0);
      }
      return current.expanded
        ? focusRow(state, rows, index + 1)
        : expand(state, current);
    case "moveOut": {
      if (!current) {
        return focusRow(state, rows, 0);
      }
      if (current.expanded) {
        return collapse(state, rows, current);
      }
      const parent = rows.findIndex((row) => row.id === current.parentId);
      return parent >= 0 ? focusRow(state, rows, parent) : state;
    }
    case "toggle": {
      const row = action.id === undefined ? current : byId(action.id);
      return row?.expanded ? collapse(state, rows, row) : expand(state, row);
    }
    case "expand":
      return expand(state, byId(action.id));
    case "collapse":
      return collapse(state, rows, byId(action.id));
    case "expandSiblings":
      return current ? expandSiblings(state, rows, current) : state;
    case "focus":
      return byId(action.id) ? { ...state, focused: action.id } : state;
    case "typeahead":
      return typeahead(state, rows, index, action.text, labelOf);
  }
}

export function findVisibleAncestor(
  previousRows: readonly TreeRow[],
  id: string,
  rows: readonly TreeRow[],
): string | undefined {
  const visible = new Set(rows.map((row) => row.id));
  const previous = new Map(previousRows.map((row) => [row.id, row]));
  for (
    let current = previous.get(id);
    current;
    current =
      current.parentId === undefined
        ? undefined
        : previous.get(current.parentId)
  ) {
    if (visible.has(current.id)) {
      return current.id;
    }
  }
  return undefined;
}

export function getTypeaheadText(
  typed: string,
  key: string,
  isContinuing: boolean,
): string {
  if (!isContinuing) {
    return key;
  }
  const letter = key.toLocaleLowerCase();
  const isRepeat = Array.from(typed.toLocaleLowerCase()).every(
    (character) => character === letter,
  );
  return isRepeat ? key : typed + key;
}

export function keyToAction(key: string): TreeAction | undefined {
  switch (key) {
    case "ArrowDown":
      return { type: "moveNext" };
    case "ArrowUp":
      return { type: "movePrevious" };
    case "ArrowRight":
      return { type: "moveIn" };
    case "ArrowLeft":
      return { type: "moveOut" };
    case "Home":
      return { type: "moveFirst" };
    case "End":
      return { type: "moveLast" };
    case "Enter":
    case " ":
      return { type: "toggle" };
    case "*":
      return { type: "expandSiblings" };
    default:
      return Array.from(key).length === 1
        ? { type: "typeahead", text: key }
        : undefined;
  }
}
