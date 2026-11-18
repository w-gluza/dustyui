import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge } from "../index.js";

function styleOf(text: string, pseudo?: string): CSSStyleDeclaration {
  const label = document.evaluate(
    `//span[text()="${text}"]`,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
  ).singleNodeValue as HTMLElement;

  return getComputedStyle(label.parentElement ?? label, pseudo);
}

function Probe({ token }: { token: string }) {
  return (
    <span
      data-testid={token}
      style={{ color: `var(${token})`, backgroundColor: `var(${token})` }}
    />
  );
}

function tokenColour(token: string): string {
  const probe = document.querySelector(`[data-testid="${token}"]`);

  return probe ? getComputedStyle(probe).color : "";
}

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
        <Badge label="After" icon="▶" iconPosition="end" />
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

  it("is a neutral outline unless asked otherwise", async () => {
    await render(
      <>
        <Badge label="Plain" />
        <Badge label="Named" variant="outline" tone="neutral" />
        <Probe token="--dusty-border-strong" />
        <Probe token="--dusty-text" />
      </>,
    );

    expect(styleOf("Plain").borderTopColor).toBe(
      tokenColour("--dusty-border-strong"),
    );
    expect(styleOf("Plain").color).toBe(tokenColour("--dusty-text"));
    expect(styleOf("Plain").backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(styleOf("Named").borderTopColor).toBe(
      styleOf("Plain").borderTopColor,
    );
  });

  it("draws the accent outline in the action colour", async () => {
    await render(
      <>
        <Badge label="Active" tone="accent" />
        <Probe token="--dusty-action" />
      </>,
    );

    expect(styleOf("Active").borderTopColor).toBe(
      tokenColour("--dusty-action"),
    );
    expect(styleOf("Active").color).toBe(tokenColour("--dusty-action"));
  });

  it("tints a soft badge and drops its border", async () => {
    await render(
      <>
        <Badge label="Soft" variant="soft" tone="accent" />
        <Probe token="--dusty-surface-selected" />
      </>,
    );

    expect(styleOf("Soft").backgroundColor).toBe(
      tokenColour("--dusty-surface-selected"),
    );
    expect(styleOf("Soft").borderTopColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("fills a solid badge and puts the surface colour on top", async () => {
    await render(
      <>
        <Badge label="Solid" variant="solid" />
        <Probe token="--dusty-text-muted" />
        <Probe token="--dusty-surface" />
      </>,
    );

    expect(styleOf("Solid").backgroundColor).toBe(
      tokenColour("--dusty-text-muted"),
    );
    expect(styleOf("Solid").color).toBe(tokenColour("--dusty-surface"));
  });

  it("sets an editorial badge in capitals behind a colour marker", async () => {
    await render(
      <>
        <Badge label="Editorial" variant="editorial" />
        <Badge label="Marked" variant="editorial" tone="accent" />
        <Badge label="Unmarked" />
        <Probe token="--dusty-illustration-primary" />
        <Probe token="--dusty-action" />
      </>,
    );

    expect(styleOf("Editorial").textTransform).toBe("uppercase");
    expect(styleOf("Editorial", "::before").backgroundColor).toBe(
      tokenColour("--dusty-illustration-primary"),
    );
    expect(styleOf("Marked", "::before").backgroundColor).toBe(
      tokenColour("--dusty-action"),
    );
    expect(styleOf("Unmarked", "::before").content).toBe("none");
  });

  it("keeps the same height in every variant", async () => {
    await render(
      <>
        <Badge label="Outline" />
        <Badge label="Soft" variant="soft" />
        <Badge label="Solid" variant="solid" />
        <Badge label="Editorial" variant="editorial" />
      </>,
    );
    const heights = ["Outline", "Soft", "Solid", "Editorial"].map(
      (text) => styleOf(text).blockSize,
    );

    expect(new Set(heights).size).toBe(1);
  });

  it("shows only the marker on an editorial badge, even when handed an icon", async () => {
    const untyped = { icon: "★" } as object;
    const screen = await render(
      <Badge
        label="Editorial"
        variant="editorial"
        data-testid="badge"
        {...untyped}
      />,
    );

    expect(screen.getByTestId("badge").element().children).toHaveLength(1);
    expect(screen.getByTestId("badge").element().textContent).toBe("Editorial");
  });

  it("keeps the icon at its size when a long label wraps", async () => {
    const screen = await render(
      <div style={{ inlineSize: "7rem" }}>
        <Badge
          label="Awaiting editorial review"
          icon={<svg data-testid="icon" viewBox="0 0 1 1" />}
        />
      </div>,
    );
    const icon = screen.getByTestId("icon").element().parentElement;

    expect(icon?.getBoundingClientRect().width).toBe(14);
  });

  it.each(["outline", "soft"] as const)(
    "is a full pill on one line and keeps the same corners when a %s label wraps",
    async (variant) => {
      await render(
        <>
          <Badge label="Short" variant={variant} />
          <div style={{ inlineSize: "7rem" }}>
            <Badge label="Awaiting editorial review" variant={variant} />
          </div>
        </>,
      );
      const short = styleOf("Short");
      const long = styleOf("Awaiting editorial review");

      const outerHeight = (style: CSSStyleDeclaration) =>
        Number.parseFloat(style.blockSize) +
        Number.parseFloat(style.paddingTop) * 2 +
        Number.parseFloat(style.borderTopWidth) * 2;

      expect(
        Number.parseFloat(short.borderTopLeftRadius) * 2,
      ).toBeGreaterThanOrEqual(outerHeight(short));
      expect(Number.parseFloat(long.borderTopLeftRadius) * 2).toBeLessThan(
        outerHeight(long),
      );
      expect(outerHeight(long)).toBeGreaterThan(outerHeight(short) * 1.5);
      expect(long.borderTopLeftRadius).toBe(short.borderTopLeftRadius);
    },
  );

  it("gives a solid badge small square corners so it does not read as a pill", async () => {
    await render(
      <>
        <Badge label="Solid" variant="solid" />
        <Badge label="Pill" />
      </>,
    );

    expect(styleOf("Solid").borderTopLeftRadius).toBe("4px");
    expect(
      Number.parseFloat(styleOf("Pill").borderTopLeftRadius),
    ).toBeGreaterThan(8);
  });

  it("fills a neutral solid badge more quietly than an accent one", async () => {
    await render(
      <>
        <Badge label="Neutral" variant="solid" />
        <Badge label="Accent" variant="solid" tone="accent" />
        <Probe token="--dusty-text" />
      </>,
    );

    expect(styleOf("Neutral").backgroundColor).not.toBe(
      styleOf("Accent").backgroundColor,
    );
    expect(styleOf("Neutral").backgroundColor).not.toBe(
      tokenColour("--dusty-text"),
    );
  });
});
