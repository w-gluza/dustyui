import type { InspectorNode } from "../describe/describe.js";
import { getLabelText } from "../getLabelText.js";
import { getValueText } from "../getValueText.js";

export interface Matches {
  readonly ids: readonly string[];
  readonly isComplete: boolean;
}

const NO_MATCHES: Matches = { ids: [], isComplete: true };

function isMatch(node: InspectorNode, query: string): boolean {
  if (
    node.label &&
    getLabelText(node.label).toLocaleLowerCase().includes(query)
  ) {
    return true;
  }
  return (
    node.childCount === 0 &&
    getValueText(node).toLocaleLowerCase().includes(query)
  );
}

export function getMatches(
  root: InspectorNode,
  text: string,
  limit: number,
): Matches {
  const query = text.trim().toLocaleLowerCase();
  if (query === "") {
    return NO_MATCHES;
  }
  const ids: string[] = [];
  const pending: InspectorNode[] = [root];
  let remaining = limit;
  let isComplete = true;

  for (let node = pending.pop(); node; node = pending.pop()) {
    if (remaining <= 0) {
      isComplete = false;
      break;
    }
    remaining -= 1;
    if (isMatch(node, query)) {
      ids.push(node.id);
    }
    if (node.childCount === 0) {
      continue;
    }
    if (node.childCount > limit) {
      isComplete = false;
      continue;
    }
    const children = node.children();
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child) {
        pending.push(child);
      }
    }
  }

  return { ids, isComplete };
}
