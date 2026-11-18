import { createRef } from "react";
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

  it("keeps a consumer class name and forwards native attributes and the ref", async () => {
    const ref = createRef<HTMLButtonElement>();
    const screen = await render(
      <IconButton
        label="Close"
        icon="x"
        className="mine"
        data-test="close"
        ref={ref}
      />,
    );
    const button = screen.getByRole("button", { name: "Close" });

    await expect.element(button).toHaveClass("mine");
    await expect.element(button).toHaveAttribute("data-test", "close");
    expect(ref.current).toBe(button.element());
  });

  it("keeps its name while loading and describes itself as loading", async () => {
    const screen = await render(<IconButton label="Close" icon="x" loading />);

    await expect
      .element(screen.getByRole("button", { name: "Close" }))
      .toHaveAccessibleDescription("Loading");
  });

  it("shows the hit area of a plain icon button under the pointer", async () => {
    const screen = await render(
      <IconButton label="Close" icon="x" variant="plain" />,
    );
    const button = screen.getByRole("button", { name: "Close" });
    const fill = () => getComputedStyle(button.element()).backgroundColor;
    const idle = fill();

    await button.hover();

    await expect.poll(fill).not.toBe(idle);
  });

  it.each(["secondary", "plain"] as const)(
    "looks different when a %s toggle is pressed",
    async (variant) => {
      const screen = await render(
        <>
          <IconButton
            label="Off"
            icon="x"
            variant={variant}
            aria-pressed={false}
          />
          <IconButton label="On" icon="x" variant={variant} aria-pressed />
        </>,
      );
      const style = (name: string) =>
        getComputedStyle(screen.getByRole("button", { name }).element());

      expect(style("On").backgroundColor).not.toBe(
        style("Off").backgroundColor,
      );
      expect(style("On").color).not.toBe(style("Off").color);
    },
  );

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
