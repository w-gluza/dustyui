import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useControllableState } from "./useControllableState.js";

describe("useControllableState", () => {
  it("hands out one setter that always reports through the latest handler", async () => {
    const setters = new Set<unknown>();
    const first = vi.fn();
    const second = vi.fn();

    function Example({ onChange }: { onChange: (value: number) => void }) {
      const [value, change] = useControllableState<number>(
        undefined,
        0,
        onChange,
      );
      const [, rerender] = useState(0);
      setters.add(change);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              change(value + 1);
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              rerender((count) => count + 1);
            }}
          >
            Render
          </button>
          <output>{value}</output>
        </>
      );
    }

    const screen = await render(<Example onChange={first} />);
    await screen.getByRole("button", { name: "Render" }).click();
    await screen.getByRole("button", { name: "Add" }).click();
    await screen.rerender(<Example onChange={second} />);
    await screen.getByRole("button", { name: "Add" }).click();

    expect(setters.size).toBe(1);
    expect(first).toHaveBeenCalledExactlyOnceWith(1);
    expect(second).toHaveBeenCalledExactlyOnceWith(2);
    await expect.element(screen.getByRole("status")).toHaveTextContent("2");
  });

  it("only asks for a change when controlled, and not for the value it has", async () => {
    const onChange = vi.fn();

    function Example() {
      const [value, change] = useControllableState<number>(5, 0, onChange);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              change(5);
              change(6);
            }}
          >
            Change
          </button>
          <output>{value}</output>
        </>
      );
    }

    const screen = await render(<Example />);
    await screen.getByRole("button", { name: "Change" }).click();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(6);
    await expect.element(screen.getByRole("status")).toHaveTextContent("5");
  });
});
