import type { InspectorNode, ValueKind } from "./describe/describe.js";

const CONTAINERS: ReadonlySet<ValueKind> = new Set([
  "array",
  "object",
  "map",
  "set",
  "entry",
  "range",
]);

export function hasValueText(node: InspectorNode): boolean {
  return !CONTAINERS.has(node.kind);
}

export function getValueText(node: InspectorNode): string {
  return node.kind === "string" && typeof node.value === "string"
    ? node.value
    : node.preview;
}
