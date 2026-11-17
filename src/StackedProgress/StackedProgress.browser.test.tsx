import { describe, expect, it } from "vitest";
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
});
