import type { Ref } from "react";

export function assignRef<Element>(
  ref: Ref<Element> | undefined,
  value: Element | null,
): void | (() => void) {
  if (typeof ref === "function") {
    return ref(value);
  }
  if (ref) {
    ref.current = value;
  }
  return undefined;
}
