import { describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { render } from "vitest-browser-react";
import { StackedProgress } from "../index.js";

const SEGMENTS = [
  { label: "Design", value: 0.38 },
  { label: "Build", value: 0.26 },
  { label: "Review", value: 0.21 },
] as const;

function barOf(root: Element): Element {
  return root.firstElementChild as Element;
}

function segmentWidths(root: Element): number[] {
  return Array.from(barOf(root).children, (segment) =>
    Math.round(segment.getBoundingClientRect().width),
  );
}

describe("StackedProgress", () => {
  it("gives each share its own labeled bar when there are more than five segments", async () => {
    const segments = Array.from({ length: 7 }, (_, index) => ({
      label: `Segment ${String(index + 1)}`,
      value: index + 1,
    }));
    const screen = await render(
      <StackedProgress label="Storage" segments={segments} max={100} />,
    );
    const items = screen.getByRole("listitem").elements();

    expect(items).toHaveLength(7);
    for (const [index, item] of items.entries()) {
      expect(item.textContent).toBe(
        `Segment ${String(index + 1)}${String(index + 1)}%`,
      );
      expect(item.querySelector("[aria-hidden='true'] > span")).not.toBeNull();
    }
  });

  it("is a named list that reads each share with its label", async () => {
    const screen = await render(
      <StackedProgress label="Project time" segments={SEGMENTS} />,
    );
    const list = screen.getByRole("list", { name: "Project time" });

    expect(
      list
        .getByRole("listitem")
        .elements()
        .map((item) => item.textContent),
    ).toEqual(["38% Design", "26% Build", "21% Review"]);
  });

  it("sizes each segment by its share and leaves the rest unfilled", async () => {
    const screen = await render(
      <div style={{ inlineSize: "406px" }}>
        <StackedProgress
          label="Project time"
          segments={[
            { label: "Design", value: 0.5 },
            { label: "Build", value: 0.25 },
          ]}
          data-testid="stack"
        />
      </div>,
    );

    expect(segmentWidths(screen.getByTestId("stack").element())).toEqual([
      201, 101, 101,
    ]);
  });

  it("measures against a custom whole", async () => {
    const screen = await render(
      <StackedProgress
        label="Storage"
        max={200}
        segments={[
          { label: "Photos", value: 100 },
          { label: "Music", value: 50 },
        ]}
      />,
    );

    expect(
      screen
        .getByRole("listitem")
        .elements()
        .map((item) => item.textContent),
    ).toEqual(["50% Photos", "25% Music"]);
  });

  it("fills the whole bar and shares it out when the values exceed the whole", async () => {
    const screen = await render(
      <div style={{ inlineSize: "402px" }}>
        <StackedProgress
          label="Storage"
          segments={[
            { label: "Photos", value: 3 },
            { label: "Music", value: 1 },
          ]}
          data-testid="stack"
        />
      </div>,
    );

    expect(segmentWidths(screen.getByTestId("stack").element())).toEqual([
      300, 100,
    ]);
    await expect.element(screen.getByText("75% Photos")).toBeVisible();
  });

  it("draws nothing for an empty or negative segment but still lists it", async () => {
    const screen = await render(
      <StackedProgress
        label="Storage"
        segments={[
          { label: "Photos", value: 0.5 },
          { label: "Music", value: -1 },
        ]}
        data-testid="stack"
      />,
    );

    expect(barOf(screen.getByTestId("stack").element()).children).toHaveLength(
      2,
    );
    await expect.element(screen.getByText("0% Music")).toBeVisible();
  });

  it("gives each segment its own colour, matched by its legend dot", async () => {
    const screen = await render(
      <StackedProgress
        label="Project time"
        segments={SEGMENTS}
        data-testid="stack"
      />,
    );
    const root = screen.getByTestId("stack").element();
    const colours = Array.from(
      barOf(root).children,
      (segment) => getComputedStyle(segment).backgroundColor,
    );
    const dots = Array.from(
      root.querySelectorAll("li > span"),
      (dot) => getComputedStyle(dot).backgroundColor,
    );

    expect(new Set(colours).size).toBe(4);
    expect(dots).toEqual(colours.slice(0, 3));
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <StackedProgress
        label="Project time"
        segments={SEGMENTS}
        className="mine"
        data-testid="stack"
      />,
    );

    await expect.element(screen.getByTestId("stack")).toHaveClass("mine");
  });

  it("sets a grid legend in two columns with each share at the far side", async () => {
    const screen = await render(
      <div style={{ inlineSize: "400px" }}>
        <StackedProgress
          label="Technique balance"
          legend="grid"
          segments={[...SEGMENTS, { label: "Other", value: 0 }]}
        />
      </div>,
    );
    const items = screen.getByRole("listitem").elements();
    const box = (index: number) =>
      (items[index] as Element).getBoundingClientRect();

    expect(items.map((item) => item.textContent)).toEqual([
      "Design38%",
      "Build26%",
      "Review21%",
      "Other0%",
    ]);
    expect(box(0).top).toBe(box(1).top);
    expect(box(2).top).toBeGreaterThan(box(0).top);
    expect(
      Math.round(
        (items[0]?.lastElementChild as Element).getBoundingClientRect().right,
      ),
    ).toBe(Math.round(box(0).right));
  });

  it("draws a thinner bar when small", async () => {
    const screen = await render(
      <>
        <StackedProgress
          label="Small"
          size="small"
          segments={SEGMENTS}
          data-testid="small"
        />
        <StackedProgress
          label="Medium"
          segments={SEGMENTS}
          data-testid="medium"
        />
      </>,
    );
    const height = (id: string) =>
      barOf(screen.getByTestId(id).element()).getBoundingClientRect().height;

    expect(height("small")).toBe(8);
    expect(height("medium")).toBe(16);
  });

  it("keeps list semantics where a styled list would lose them", async () => {
    const screen = await render(
      <StackedProgress label="Project time" segments={SEGMENTS} />,
    );

    await expect
      .element(screen.getByRole("list", { name: "Project time" }))
      .toHaveAttribute("role", "list");
  });

  it("fills the track when the whole is below one", async () => {
    const screen = await render(
      <div style={{ inlineSize: "404px" }}>
        <StackedProgress
          label="Storage"
          max={0.5}
          segments={[
            { label: "Photos", value: 0.1 },
            { label: "Music", value: 0.2 },
          ]}
          data-testid="stack"
        />
      </div>,
    );

    expect(segmentWidths(screen.getByTestId("stack").element())).toEqual([
      80, 160, 160,
    ]);
  });

  it("makes the listed shares add up and never calls a drawn sliver zero", async () => {
    const screen = await render(
      <>
        <StackedProgress
          label="Thirds"
          max={3}
          segments={[
            { label: "One", value: 1 },
            { label: "Two", value: 1 },
            { label: "Three", value: 1 },
          ]}
        />
        <StackedProgress
          label="Sliver"
          segments={[
            { label: "Tiny", value: 0.004 },
            { label: "Rest", value: 0.5 },
          ]}
        />
      </>,
    );
    const shares = (name: string) =>
      Array.from(
        screen.getByRole("list", { name }).element().children,
        (item) => item.textContent,
      );

    expect(shares("Thirds")).toEqual(["34% One", "33% Two", "33% Three"]);
    expect(shares("Sliver")).toEqual(["<1% Tiny", "50% Rest"]);
  });

  it("treats a value that is not a number as empty", async () => {
    const screen = await render(
      <StackedProgress
        label="Storage"
        segments={[
          { label: "Photos", value: 0.5 },
          { label: "Music", value: Number.NaN },
          { label: "Apps", value: Number.POSITIVE_INFINITY },
        ]}
        data-testid="stack"
      />,
    );

    expect(barOf(screen.getByTestId("stack").element()).children).toHaveLength(
      2,
    );
    expect(
      Array.from(
        screen.getByRole("list").element().children,
        (item) => item.textContent,
      ),
    ).toEqual(["50% Photos", "0% Music", "0% Apps"]);
  });

  it("draws an empty track and an empty list for no segments", async () => {
    const screen = await render(
      <StackedProgress label="Storage" segments={[]} data-testid="stack" />,
    );

    expect(barOf(screen.getByTestId("stack").element()).children).toHaveLength(
      1,
    );
    expect(screen.getByRole("list").element().children).toHaveLength(0);
  });

  it("runs the segments from the right when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={{ inlineSize: "400px" }}>
        <StackedProgress
          label="Project time"
          segments={SEGMENTS}
          data-testid="stack"
        />
      </div>,
    );
    const [first, second] = Array.from(
      barOf(screen.getByTestId("stack").element()).children,
      (segment) => segment.getBoundingClientRect(),
    );

    expect(first?.left).toBeGreaterThan(second?.left ?? Infinity);
  });

  it("outlines each segment and dot when colours are forced", async () => {
    const screen = await render(
      <StackedProgress
        label="Project time"
        segments={SEGMENTS}
        data-testid="stack"
      />,
    );
    const root = screen.getByTestId("stack").element();
    const outlines = () =>
      [barOf(root).firstElementChild, root.querySelector("li > span")].map(
        (part) => {
          const style = getComputedStyle(part as Element);

          return style.outlineStyle === "none" ? "0px" : style.outlineWidth;
        },
      );
    const widths = segmentWidths(root);

    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };

    expect(outlines()).toEqual(["0px", "0px"]);

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    try {
      expect(outlines()).toEqual(["1px", "1px"]);
      expect(segmentWidths(root)).toEqual(widths);
    } finally {
      await session.send("Emulation.setEmulatedMedia", { features: [] });
    }
  });
});
