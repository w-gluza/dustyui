import type { InspectorNode } from "./describe/describe.js";

export function getValueText(node: InspectorNode): string {
  return node.kind === "string" && typeof node.value === "string"
    ? node.value
    : node.preview;
}
