import type { InspectorNode } from "../describe/describe.js";
import { getLabelText } from "../getLabelText.js";
import { getValueText, hasValueText } from "../getValueText.js";

export interface Matches {
  readonly ids: readonly string[];
  readonly isComplete: boolean;
}

const NO_MATCHES: Matches = { ids: [], isComplete: true };
const CHARACTER_LIMIT = 100_000_000;

export function getMatches(
  root: InspectorNode,
  text: string,
  limit: number,
  characterLimit = CHARACTER_LIMIT,
): Matches {
  const query = text.trim().toLocaleLowerCase();
  if (query === "") {
    return NO_MATCHES;
  }
  const ids: string[] = [];
  const pending: InspectorNode[] = [root];
  let remaining = limit;
  let remainingCharacters = characterLimit;
  let isComplete = true;

  function contains(candidate: string): boolean {
    if (candidate.length > remainingCharacters) {
      isComplete = false;
      return false;
    }
    remainingCharacters -= candidate.length;
    return candidate.toLocaleLowerCase().includes(query);
  }

  function isMatch(node: InspectorNode): boolean {
    if (node.kind === "hole") {
      return false;
    }
    if (node.label && contains(getLabelText(node.label))) {
      return true;
    }
    return hasValueText(node) && contains(getValueText(node));
  }

  for (let node = pending.pop(); node; node = pending.pop()) {
    if (remaining <= 0) {
      isComplete = false;
      break;
    }
    if (node.kind !== "range") {
      remaining -= 1;
    }
    if (isMatch(node)) {
      ids.push(node.id);
    }
    const isRange = node.kind === "range";
    if (isRange && node.size === undefined) {
      isComplete = false;
      continue;
    }
    if (!node.hasChildren) {
      continue;
    }
    if (!isRange && node !== root && (node.size ?? 0) > remaining) {
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
