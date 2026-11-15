import type { InspectorNode } from "./describe/describe.js";
import { isIdentifier } from "./describe/isIdentifier.js";
import { getLabelText } from "./getLabelText.js";
import { getValueText } from "./getValueText.js";

export interface CopyText {
  readonly text: string;
  readonly isComplete: boolean;
}

const VALUE_LIMIT = 5000;
const CHARACTER_LIMIT = 5_000_000;
const ELLIPSIS = "…";
const INDENT = "  ";
const PLAIN_TYPES = new Set(["Object", "Array"]);

function getPrefix(node: InspectorNode, isRoot: boolean): string {
  if (isRoot || !node.label || node.label.type === "index") {
    return "";
  }
  const text = getLabelText(node.label);
  const isPlain = node.label.type !== "property" || isIdentifier(text);
  return `${isPlain ? text : JSON.stringify(text)}: `;
}

function getLeafText(node: InspectorNode, room: number): string {
  if (node.kind === "string" && typeof node.value === "string") {
    return node.value.length > room
      ? JSON.stringify(node.value.slice(0, Math.max(room, 0))) + ELLIPSIS
      : JSON.stringify(node.value);
  }
  return node.typeName && PLAIN_TYPES.has(node.typeName)
    ? getOpening(node) + getClosing(node)
    : node.preview;
}

function getOpening(node: InspectorNode): string {
  const bracket = node.kind === "array" ? "[" : "{";
  return node.typeName && !PLAIN_TYPES.has(node.typeName)
    ? `${node.typeName} ${bracket}`
    : bracket;
}

function getClosing(node: InspectorNode): string {
  return node.kind === "array" ? "]" : "}";
}

function isWhole(node: InspectorNode, room: number): boolean {
  return typeof node.value !== "string" || node.value.length <= room;
}

function getChildren(node: InspectorNode): readonly InspectorNode[] {
  return node.hasChildren ? node.children() : [];
}

export function getCopyText(
  root: InspectorNode,
  limit = VALUE_LIMIT,
  characterLimit = CHARACTER_LIMIT,
): CopyText {
  if (getChildren(root).length === 0) {
    return {
      text:
        root.kind === "string"
          ? getValueText(root)
          : getLeafText(root, Infinity),
      isComplete: true,
    };
  }
  const lines: string[] = [];
  let room = characterLimit;
  let isComplete = true;

  function add(line: string) {
    lines.push(line);
    room -= line.length;
  }

  const pending: (InspectorNode | string)[] = [root];
  const depths = new Map<InspectorNode, number>([[root, 0]]);
  let remaining = limit;
  let isCut = false;

  function addChildren(node: InspectorNode, depth: number) {
    const children = getChildren(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child) {
        depths.set(child, depth);
        pending.push(child);
      }
    }
  }

  for (let item = pending.pop(); item !== undefined; item = pending.pop()) {
    if (typeof item === "string") {
      add(item);
      continue;
    }
    const depth = depths.get(item) ?? 0;
    depths.delete(item);
    const indent = INDENT.repeat(depth);
    const end = item === root ? "" : ",";
    if (remaining <= 0 || room <= 0) {
      if (!isCut) {
        isCut = true;
        isComplete = false;
        lines.push(indent + ELLIPSIS);
      }
      continue;
    }
    if (item.kind === "range") {
      if (item.size === undefined) {
        isComplete = false;
      } else {
        addChildren(item, depth);
      }
      continue;
    }
    remaining -= 1;
    const prefix = indent + getPrefix(item, item === root);
    if (getChildren(item).length === 0) {
      isComplete &&= isWhole(item, room);
      add(prefix + getLeafText(item, room) + end);
      continue;
    }
    if (item !== root && item.size !== undefined && item.size > remaining) {
      isComplete = false;
      add(prefix + item.preview + end);
      continue;
    }
    add(prefix + getOpening(item));
    pending.push(indent + getClosing(item) + end);
    addChildren(item, depth + 1);
  }

  return { text: lines.join("\n"), isComplete };
}
