import { useState } from "react";

export function useControllableState<Value>(
  controlled: Value | undefined,
  initial: Value,
  onChange: ((value: Value) => void) | undefined,
): [Value, (next: Value) => void] {
  const [own, setOwn] = useState(initial);
  const value = controlled ?? own;

  function change(next: Value) {
    if (controlled === undefined) {
      setOwn(next);
    }
    if (next !== value) {
      onChange?.(next);
    }
  }

  return [value, change];
}
