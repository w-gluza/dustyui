import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Button, IconButton } from "../index.js";

describe("IconButton", () => {
  it("takes its accessible name from the label and hides the icon from it", async () => {
    const screen = await render(<IconButton label="Close" icon="x" />);
    const button = screen.getByRole("button", { name: "Close" });

    await expect.element(button).toBeVisible();
    await expect
      .element(screen.getByText("x"))
      .toHaveAttribute("aria-hidden", "true");
  });

  it("calls onClick when activated", async () => {
    const onClick = vi.fn();
    const screen = await render(
      <IconButton label="Close" icon="x" onClick={onClick} />,
    );

    await screen.getByRole("button", { name: "Close" }).click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each(["small", "medium", "large"] as const)(
    "is square and as tall as a text button when %s",
    async (name) => {
      const screen = await render(
        <>
          <IconButton label="Close" icon="x" size={name} />
          <Button size={name}>Save</Button>
        </>,
      );
      const icon = screen
        .getByRole("button", { name: "Close" })
        .element()
        .getBoundingClientRect();
      const text = screen
        .getByRole("button", { name: "Save" })
        .element()
        .getBoundingClientRect();

      expect(icon.width).toBe(icon.height);
      expect(icon.height).toBe(text.height);
    },
  );

  it("is square and as tall as a text button", async () => {
    const screen = await render(
      <>
        <IconButton label="Close" icon="x" />
        <Button>Save</Button>
      </>,
    );
    const icon = screen
      .getByRole("button", { name: "Close" })
      .element()
      .getBoundingClientRect();
    const text = screen
      .getByRole("button", { name: "Save" })
      .element()
      .getBoundingClientRect();

    expect(icon.width).toBe(icon.height);
    expect(icon.height).toBe(text.height);
  });

  it("supports the loading state of Button", async () => {
    const onClick = vi.fn();
    const screen = await render(
      <IconButton label="Close" icon="x" loading onClick={onClick} />,
    );
    const button = screen.getByRole("button", { name: "Close" });

    await button.click({ force: true });

    expect(onClick).not.toHaveBeenCalled();
    await expect.element(button).toHaveAttribute("aria-disabled", "true");
  });
});
