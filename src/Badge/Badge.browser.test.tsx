import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge } from "../index.js";

describe("Badge", () => {
  it("shows its label", async () => {
    const screen = await render(<Badge label="New" />);

    await expect.element(screen.getByText("New")).toBeVisible();
  });

  it("renders no icon wrapper without an icon", async () => {
    const screen = await render(<Badge label="New" data-testid="badge" />);

    expect(screen.getByTestId("badge").element().children).toHaveLength(1);
  });

  it("hides the icon from assistive technology", async () => {
    const screen = await render(<Badge label="New" icon="★" />);

    await expect
      .element(screen.getByText("★"))
      .toHaveAttribute("aria-hidden", "true");
  });

  it("places the icon before the label by default and after it on the right", async () => {
    const screen = await render(
      <>
        <Badge label="Before" icon="◀" />
        <Badge label="After" icon="▶" iconPosition="right" />
      </>,
    );

    expect(
      screen.getByText("◀").element().nextElementSibling?.textContent,
    ).toBe("Before");
    expect(
      screen.getByText("▶").element().previousElementSibling?.textContent,
    ).toBe("After");
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <Badge label="New" className="mine" title="Added today" />,
    );
    const badge = screen.getByTitle("Added today");

    await expect.element(badge).toHaveClass("mine");
  });
});
