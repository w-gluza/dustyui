import type { InspectorNode } from "./describe/describe.js";
import { getLabelText } from "./getLabelText.js";
import { getValueText } from "./getValueText.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
const INDENT = "  ";
const PLAIN_TYPES = new Set(["Object", "Array"]);

function getPrefix(node: InspectorNode, isRoot: boolean): string {
  if (isRoot || !node.label || node.label.type === "index") {
    return "";
  }
  const text = getLabelText(node.label);
  const isPlain = node.label.type !== "property" || IDENTIFIER.test(text);
  return `${isPlain ? text : JSON.stringify(text)}: `;
}

function getLeafText(node: InspectorNode): string {
  if (node.kind === "string" && typeof node.value === "string") {
    return JSON.stringify(node.value);
  }
  if (Array.isArray(node.value) && node.value.length > 0) {
    return `[${getHoleText(node.value.length).slice(0, -1)}]`;
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

function getHoleText(count: number): string {
  return `<${count} empty ${count === 1 ? "item" : "items"}>,`;
}

function getClosing(node: InspectorNode): string {
  return node.kind === "array" ? "]" : "}";
}

export function getCopyText(root: InspectorNode, limit = 5000): string {
  if (root.childCount === 0) {
    return root.kind === "string" ? getValueText(root) : getLeafText(root);
  }
  const lines: string[] = [];
  const pending: (InspectorNode | string)[] = [root];
  const depths = new Map<InspectorNode, number>([[root, 0]]);
  let remaining = limit;
  let isCut = false;

  for (let item = pending.pop(); item !== undefined; item = pending.pop()) {
    if (typeof item === "string") {
      lines.push(item);
      continue;
    }
    const depth = depths.get(item) ?? 0;
    depths.delete(item);
    const indent = INDENT.repeat(depth);
    const end = item === root ? "" : ",";
    if (remaining <= 0) {
      if (!isCut) {
        isCut = true;
        lines.push(`${indent}…`);
      }
      continue;
    }
    remaining -= 1;
    const prefix = indent + getPrefix(item, item === root);
    if (item.childCount === 0) {
      lines.push(prefix + getLeafText(item) + end);
      continue;
    }
    if (item.childCount > limit) {
      lines.push(prefix + item.preview + end);
      continue;
    }
    lines.push(prefix + getOpening(item));
    pending.push(indent + getClosing(item) + end);
    const children = item.children();
    const childIndent = INDENT.repeat(depth + 1);
    const isList = Array.isArray(item.value);
    let next = isList ? (item.value as unknown[]).length : 0;
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (!child) {
        continue;
      }
      if (isList && child.label?.type === "index") {
        if (child.label.index + 1 < next) {
          pending.push(childIndent + getHoleText(next - child.label.index - 1));
        }
        next = child.label.index;
      }
      depths.set(child, depth + 1);
      pending.push(child);
    }
    if (isList && next > 0) {
      pending.push(childIndent + getHoleText(next));
    }
  }

  return lines.join("\n");
}
