import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { BarChart } from "../index.js";

const WEEK = [
  {
    label: "M",
    value: 30,
    valueLabel: "30",
    description: "Monday, 30 minutes",
  },
  { label: "T", value: 15 },
  { label: "W", value: 0, description: "Wednesday, no practice" },
] as const;

function bars(root: Element): DOMRect[] {
  return Array.from(
    root.querySelectorAll("li > span:first-child > span:last-child"),
    (bar) => bar.getBoundingClientRect(),
  );
}

describe("BarChart", () => {
  it("is a named list that reads each bar in words", async () => {
    const screen = await render(<BarChart label="This week" bars={WEEK} />);
    const list = screen.getByRole("list", { name: "This week" });

    expect(
      list
        .getByRole("listitem")
        .elements()
        .map((item) => item.lastElementChild?.textContent),
    ).toEqual(["Monday, 30 minutes", "T, 15", "Wednesday, no practice"]);
  });

  it("draws each bar as tall as its share of the tallest", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} data-testid="chart" />,
    );
    const [first, second, third] = bars(screen.getByTestId("chart").element());

    expect(first?.height).toBe(136);
    expect(second?.height).toBe(68);
    expect(third?.height).toBe(6);
    expect(first?.bottom).toBe(second?.bottom);
  });

  it("measures against a maximum above the tallest bar", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} max={60} data-testid="chart" />,
    );

    expect(bars(screen.getByTestId("chart").element())[0]?.height).toBe(68);
  });

  it("shows a value above a bar but nothing above an empty one", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} data-testid="chart" />,
    );
    const plots = screen
      .getByTestId("chart")
      .element()
      .querySelectorAll("li > span:first-child");

    expect(plots[0]?.textContent).toBe("30");
    expect(plots[1]?.textContent).toBe("15");
    expect(plots[2]?.textContent).toBe("");
  });

  it("treats a negative value as empty", async () => {
    const screen = await render(
      <BarChart
        label="Change"
        bars={[
          { label: "A", value: -4 },
          { label: "B", value: 2 },
        ]}
      />,
    );

    expect(
      screen.getByRole("listitem").first().element().hasAttribute("data-empty"),
    ).toBe(true);
  });

  it("marks the highlighted bar as current and colours it with the action colour", async () => {
    const screen = await render(
      <BarChart
        label="This week"
        bars={WEEK}
        highlighted={1}
        data-testid="chart"
      />,
    );
    const items = screen.getByRole("listitem").elements();
    const colour = (index: number) =>
      getComputedStyle(
        items[index]?.querySelector(
          "span:first-child > span:last-child",
        ) as Element,
      ).backgroundColor;

    expect(items.map((item) => item.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
    expect(colour(1)).not.toBe(colour(0));
  });

  it("keeps a consumer class name and style and forwards native attributes", async () => {
    const screen = await render(
      <BarChart
        label="This week"
        bars={WEEK}
        className="mine"
        style={{ inlineSize: "240px" }}
        data-testid="chart"
      />,
    );

    await expect.element(screen.getByTestId("chart")).toHaveClass("mine");
    expect(
      screen.getByTestId("chart").element().getBoundingClientRect().width,
    ).toBe(240);
  });
});
