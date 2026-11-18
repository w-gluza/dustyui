import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ProgressBar } from "../index.js";

function fillOf(root: Element): HTMLElement {
  const fill = root.querySelector<HTMLElement>("progress + span > span");

  if (!fill) {
    throw new Error("The bar has no fill");
  }
  return fill;
}

const wide = { inlineSize: "200px" };

describe("ProgressBar", () => {
  it("is a named progress bar holding its share of the whole", async () => {
    const screen = await render(<ProgressBar label="Upload" value={0.35} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });

    expect((bar.element() as HTMLProgressElement).value).toBeCloseTo(0.35);
    expect((bar.element() as HTMLProgressElement).max).toBe(1);
  });

  it("measures against a custom maximum", async () => {
    const screen = await render(
      <ProgressBar label="Upload" value={30} max={120} />,
    );

    expect(
      (screen.getByRole("progressbar").element() as HTMLProgressElement).value,
    ).toBeCloseTo(0.25);
  });

  it.each([
    [1.4, 1, 1],
    [-2, 1, 0],
    [5, 0, 0],
    [Number.NaN, 1, 0],
    [Infinity, 1, 0],
    [0.5, Infinity, 0],
  ])("clamps %d of %d to %d", async (value, max, expected) => {
    const screen = await render(
      <ProgressBar label="Upload" value={value} max={max} />,
    );

    expect(
      (screen.getByRole("progressbar").element() as HTMLProgressElement).value,
    ).toBe(expected);
  });

  it("draws the fill as wide as its share", async () => {
    const screen = await render(
      <div style={wide}>
        <ProgressBar label="Upload" value={0.5} data-testid="bar" />
      </div>,
    );
    const bar = screen.getByTestId("bar").element();

    await expect
      .poll(() => Math.round(fillOf(bar).getBoundingClientRect().width))
      .toBe(99);
  });

  it("fills from the other side when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={wide}>
        <ProgressBar label="Upload" value={0.25} data-testid="bar" />
      </div>,
    );
    const bar = screen.getByTestId("bar").element();
    const track = fillOf(bar).parentElement as Element;

    await expect
      .poll(
        () =>
          Math.round(track.getBoundingClientRect().right) -
          Math.round(fillOf(bar).getBoundingClientRect().right),
      )
      .toBe(1);
  });

  it("is indeterminate without a value", async () => {
    const screen = await render(
      <ProgressBar label="Loading" data-testid="bar" />,
    );
    const bar = screen.getByRole("progressbar", { name: "Loading" }).element();

    expect(bar.hasAttribute("value")).toBe(false);
    expect(bar.matches(":indeterminate")).toBe(true);
    expect(
      screen.getByTestId("bar").element().querySelector("[data-indeterminate]"),
    ).not.toBeNull();
  });

  it("keeps the label for assistive technology only unless asked to show it", async () => {
    const screen = await render(
      <>
        <ProgressBar label="Hidden" value={0.5} />
        <ProgressBar label="Shown" value={0.35} showLabel />
      </>,
    );

    expect(screen.getByText("Hidden").elements()).toHaveLength(0);
    await expect.element(screen.getByText("Shown")).toBeVisible();
    await expect.element(screen.getByText("35%")).toBeVisible();
  });

  it("words its value as asked, on screen and for assistive technology", async () => {
    const screen = await render(
      <ProgressBar
        label="Track progress"
        value={78}
        max={222}
        showLabel
        valueLabel="1:18 of 3:42"
      />,
    );

    await expect.element(screen.getByText("1:18 of 3:42")).toBeVisible();
    await expect
      .element(screen.getByRole("progressbar"))
      .toHaveAttribute("aria-valuetext", "1:18 of 3:42");
  });

  it("grows thicker with size", async () => {
    const screen = await render(
      <>
        <ProgressBar
          label="Small"
          value={0.5}
          size="small"
          data-testid="small"
        />
        <ProgressBar label="Medium" value={0.5} data-testid="medium" />
        <ProgressBar
          label="Large"
          value={0.5}
          size="large"
          data-testid="large"
        />
      </>,
    );
    const height = (id: string) =>
      screen.getByTestId(id).element().getBoundingClientRect().height;

    expect(height("small")).toBeLessThan(height("medium"));
    expect(height("medium")).toBeLessThan(height("large"));
  });

  it("fills with the action colour, or the text colour when neutral", async () => {
    const screen = await render(
      <div data-testid="page">
        <ProgressBar label="Accent" value={0.5} data-testid="accent" />
        <ProgressBar
          label="Neutral"
          value={0.5}
          tone="neutral"
          data-testid="neutral"
        />
      </div>,
    );
    const fill = (id: string) =>
      getComputedStyle(fillOf(screen.getByTestId(id).element()))
        .backgroundColor;

    expect(fill("neutral")).toBe(
      getComputedStyle(screen.getByTestId("neutral").element()).color,
    );
    expect(fill("accent")).not.toBe(fill("neutral"));
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <ProgressBar
        label="Upload"
        value={0.5}
        className="mine"
        data-testid="bar"
      />,
    );

    await expect.element(screen.getByTestId("bar")).toHaveClass("mine");
  });

  it("captions the two ends of the bar when given", async () => {
    const screen = await render(
      <div style={wide}>
        <ProgressBar
          label="Upload"
          value={0.5}
          startLabel="Start"
          endLabel="Finish"
        />
      </div>,
    );
    const start = screen.getByText("Start").element().getBoundingClientRect();
    const finish = screen.getByText("Finish").element().getBoundingClientRect();

    expect(start.left).toBeLessThan(finish.left);
    expect(Math.round(finish.right)).toBe(200);
  });

  it("sets an editorial bar as an overline, an oversized number and a borderless line on a panel", async () => {
    const screen = await render(
      <div style={wide}>
        <ProgressBar
          variant="editorial"
          label="Current progress"
          value={0.72}
          note="Almost there"
          data-testid="bar"
        />
      </div>,
    );
    const size = (text: string) =>
      Number.parseFloat(
        getComputedStyle(screen.getByText(text, { exact: true }).element())
          .fontSize,
      );
    const track = fillOf(screen.getByTestId("bar").element())
      .parentElement as Element;

    await expect.element(screen.getByText("Current progress")).toBeVisible();
    await expect.element(screen.getByText("Almost there")).toBeVisible();
    expect(size("72%")).toBeGreaterThan(size("Almost there") * 2);
    expect(getComputedStyle(track).borderTopWidth).toBe("0px");
    expect(track.getBoundingClientRect().height).toBe(8);
    expect(
      getComputedStyle(screen.getByTestId("bar").element()).paddingTop,
    ).toBe("20px");
  });

  it("keeps an editorial bar a single named progress bar and lets the note be read", async () => {
    const screen = await render(
      <ProgressBar
        variant="editorial"
        label="Current progress"
        value={0.72}
        note="Almost there"
      />,
    );

    expect(screen.getByRole("progressbar").elements()).toHaveLength(1);
    await expect
      .element(screen.getByRole("progressbar", { name: "Current progress" }))
      .toHaveAttribute("value", "0.72");
    expect(
      screen.getByText("Almost there").element().closest("[aria-hidden]"),
    ).toBeNull();
  });

  it("shows no number on an editorial bar without a value", async () => {
    const screen = await render(
      <ProgressBar variant="editorial" label="Loading" data-testid="bar" />,
    );

    expect(screen.getByTestId("bar").element().textContent).toBe("Loading");
  });

  it("takes any content as the editorial note", async () => {
    const screen = await render(
      <ProgressBar
        variant="editorial"
        label="Uploading"
        value={0.62}
        note={<a href="/uploads">Open</a>}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name: "Open" }))
      .toBeVisible();
  });
});
