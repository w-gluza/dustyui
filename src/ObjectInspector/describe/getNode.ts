import type { InspectorNode } from "./describe.js";

export function getNode(
  root: InspectorNode,
  id: string,
): InspectorNode | undefined {
  let current: InspectorNode | undefined = root;
  while (current && current.id !== id) {
    current = current
      .children()
      .find((child) => child.id === id || id.startsWith(`${child.id}/`));
  }
  return current;
}
