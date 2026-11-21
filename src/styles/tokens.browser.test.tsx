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

describe("shared tokens", () => {
  it("resolve the large radius, regular weight, disabled opacity and inset focus ring", () => {
    const probe = document.createElement("div");
    probe.style.borderRadius = "var(--dusty-radius-lg)";
    probe.style.fontWeight = "var(--dusty-weight-regular)";
    probe.style.opacity = "var(--dusty-opacity-disabled)";
    probe.style.outlineOffset = "var(--dusty-focus-ring-inset)";
    document.body.append(probe);
    const style = getComputedStyle(probe);

    expect([
      style.borderRadius,
      style.fontWeight,
      style.opacity,
      style.outlineOffset,
    ]).toEqual(["24px", "400", "0.5", "-2px"]);
    probe.remove();
  });
});
