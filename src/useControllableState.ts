import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useControllableState<Value>(
  controlled: Value | undefined,
  initial: Value,
  onChange: ((value: Value) => void) | undefined,
): [Value, (next: Value) => void] {
  const [own, setOwn] = useState(initial);
  const value = controlled ?? own;
  const latest = useRef({ controlled, value, onChange });

  useLayoutEffect(() => {
    latest.current = { controlled, value, onChange };
  });

  const change = useCallback((next: Value) => {
    const current = latest.current;

    if (current.controlled === undefined) {
      setOwn(next);
    }
    if (next !== current.value) {
      current.onChange?.(next);
    }
  }, []);

  return [value, change];
}
