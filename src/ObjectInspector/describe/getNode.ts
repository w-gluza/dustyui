import type { InspectorNode } from "./describe.js";

export function getNodeTrail(root: InspectorNode, id: string): InspectorNode[] {
  const trail: InspectorNode[] = [];
  let current: InspectorNode | undefined = root;
  while (current) {
    trail.push(current);
    if (current.id === id) {
      return trail;
    }
    current = current.findChild(id);
  }
  return [];
}

export function getNode(
  root: InspectorNode,
  id: string,
): InspectorNode | undefined {
  return getNodeTrail(root, id).at(-1);
}
