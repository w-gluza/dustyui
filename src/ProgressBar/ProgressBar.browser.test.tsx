import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { cdp } from "vitest/browser";
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

  it.each(["ltr", "rtl"] as const)(
    "sweeps the whole track when indeterminate in %s",
    async (dir) => {
      const screen = await render(
        <div dir={dir} style={wide}>
          <ProgressBar label="Loading" data-testid="bar" />
        </div>,
      );
      const fill = fillOf(screen.getByTestId("bar").element());
      const track = (fill.parentElement as Element).getBoundingClientRect();
      const [sweep] = fill.getAnimations();
      const spanAt = (progress: number) => {
        sweep?.pause();
        if (sweep) {
          sweep.currentTime = 1400 * progress;
        }
        const box = fill.getBoundingClientRect();

        return [
          Math.round(box.left - track.left),
          Math.round(box.right - track.left),
        ];
      };
      const start = spanAt(0);
      const end = spanAt(0.999);
      const inward = dir === "rtl" ? [end, start] : [start, end];

      expect(inward[0]?.[1]).toBeLessThanOrEqual(1);
      expect(inward[1]?.[0]).toBeGreaterThanOrEqual(
        Math.round(track.width) - 1,
      );
    },
  );

  it("pulses a partial block, never a full bar, when indeterminate with motion reduced", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    try {
      const screen = await render(
        <div style={wide}>
          <ProgressBar label="Loading" data-testid="bar" />
        </div>,
      );
      const fill = fillOf(screen.getByTestId("bar").element());
      const track = (fill.parentElement as Element).getBoundingClientRect();
      const box = fill.getBoundingClientRect();

      expect(box.width).toBeLessThan(track.width * 0.6);
      expect(Math.round(box.left - track.left)).toBe(
        Math.round(track.right - box.right),
      );
      expect(getComputedStyle(fill).translate).toBe("none");
      expect(fill.getAnimations()).toHaveLength(1);
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "" }],
      });
    }
  });

  it("outlines the editorial track and panel when colours are forced", async () => {
    const screen = await render(
      <ProgressBar
        variant="editorial"
        label="Upload"
        value={0.5}
        data-testid="bar"
      />,
    );
    const root = screen.getByTestId("bar").element();
    const track = fillOf(root).parentElement as Element;
    const borders = () => [
      getComputedStyle(track).borderTopWidth,
      getComputedStyle(root).borderTopStyle,
    ];
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };

    expect(borders()).toEqual(["0px", "none"]);
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    try {
      expect(borders()).toEqual(["1px", "solid"]);
    } finally {
      await session.send("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  it("describes the bar with its note and end captions", async () => {
    const screen = await render(
      <>
        <p id="outside">Uploading to the shared folder</p>
        <ProgressBar
          variant="editorial"
          label="Soft Transit"
          value={78}
          max={255}
          valueLabel="1:18"
          note="of 4:15"
          startLabel="Album cover.svg"
          endLabel="In progress"
          aria-describedby="outside"
          aria-details="outside"
          data-testid="bar"
        />
        <ProgressBar label="Plain" value={0.2} data-testid="plain" />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Soft Transit" });

    await expect
      .element(bar)
      .toHaveAccessibleDescription(
        "Uploading to the shared folder of 4:15 Album cover.svg In progress",
      );
    await expect.element(bar).toHaveAttribute("aria-details", "outside");
    expect(
      screen.getByTestId("bar").element().hasAttribute("aria-describedby"),
    ).toBe(false);
    expect(
      screen
        .getByRole("progressbar", { name: "Plain" })
        .element()
        .hasAttribute("aria-describedby"),
    ).toBe(false);
  });

  it("keeps long captions inside the bar's width", async () => {
    const screen = await render(
      <div style={wide}>
        <ProgressBar
          label="A_very_long_unbroken_file_name_for_an_upload.svg"
          showLabel
          value={78}
          max={255}
          valueLabel="1:18 of 4:15"
          startLabel="A_very_long_unbroken_start_caption_text.svg"
          endLabel="In progress"
          data-testid="bar"
        />
      </div>,
    );
    const root = screen.getByTestId("bar").element();
    const value = screen.getByText("1:18 of 4:15").element();
    const end = screen.getByText("In progress").element();
    const lines = (node: Element) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return new Set(
        Array.from(range.getClientRects(), (box) => Math.round(box.top)),
      ).size;
    };

    expect(root.scrollWidth).toBeLessThanOrEqual(200);
    expect(root.getBoundingClientRect().width).toBe(200);
    expect(lines(value)).toBe(1);
    expect(lines(end)).toBe(1);
    expect(end.getBoundingClientRect().right).toBeLessThanOrEqual(
      root.getBoundingClientRect().right + 0.5,
    );
  });

  it("keeps its own wording on an indeterminate bar", async () => {
    const screen = await render(
      <ProgressBar label="Loading" showLabel valueLabel="Starting" />,
    );

    await expect
      .element(screen.getByRole("progressbar", { name: "Loading" }))
      .toHaveAttribute("aria-valuetext", "Starting");
    await expect.element(screen.getByText("Starting")).toBeVisible();
  });
});
