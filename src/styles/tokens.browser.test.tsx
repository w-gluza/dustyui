import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "../index.js";

function scheme(element: Element): string {
  return getComputedStyle(element).colorScheme;
}

describe("colour scheme", () => {
  it("is light until the page asks for something else", async () => {
    const screen = await render(<Button>Save</Button>);

    expect(scheme(document.documentElement)).toBe("light");
    expect(scheme(screen.getByRole("button").element())).toBe("light");
  });

  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "light dark"],
  ])(
    "follows data-color-scheme=%s on any part of the page",
    async (value, expected) => {
      const screen = await render(
        <div data-color-scheme={value}>
          <Button>Save</Button>
        </div>,
      );

      expect(scheme(screen.getByRole("button").element())).toBe(expected);
      expect(scheme(document.documentElement)).toBe("light");
    },
  );
});
