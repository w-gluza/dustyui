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

function barColour(item: Element | undefined): string {
  const bar = item?.querySelector("span:first-child > span:last-child");

  return bar ? getComputedStyle(bar).backgroundColor : "";
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

  it("marks the current bar for assistive technology and colours it with the action colour", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} current={1} />,
    );
    const items = screen.getByRole("listitem").elements();

    expect(items.map((item) => item.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
    expect(barColour(items[1])).not.toBe(barColour(items[0]));
  });

  it("emphasises a highlighted bar without calling it current", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} highlighted={1} />,
    );
    const items = screen.getByRole("listitem").elements();

    expect(items.every((item) => !item.hasAttribute("aria-current"))).toBe(
      true,
    );
    expect(barColour(items[1])).not.toBe(barColour(items[0]));
  });

  it("emphasises the value of the highlighted bar along with the bar", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} highlighted={1} />,
    );
    const weight = (text: string) =>
      Number(getComputedStyle(screen.getByText(text).element()).fontWeight);

    expect(weight("15")).toBeGreaterThan(weight("30"));
  });

  it("highlights nothing when the index is outside the bars", async () => {
    const screen = await render(
      <BarChart label="This week" bars={WEEK} highlighted={9} current={-1} />,
    );

    expect(
      screen.getByRole("list").element().querySelector("[data-highlighted]"),
    ).toBeNull();
  });

  it("is an empty named list without bars", async () => {
    const screen = await render(<BarChart label="This week" bars={[]} />);

    expect(
      screen.getByRole("list", { name: "This week" }).element().children,
    ).toHaveLength(0);
  });

  it("keeps the list role that a list without markers loses in Safari", async () => {
    const screen = await render(<BarChart label="This week" bars={WEEK} />);

    await expect
      .element(screen.getByRole("list", { name: "This week" }))
      .toHaveAttribute("role", "list");
  });

  it("treats a value that is not a number as empty and never prints NaN", async () => {
    const screen = await render(
      <BarChart
        label="This week"
        bars={[
          { label: "M", value: Number.NaN },
          { label: "T", value: 10 },
        ]}
      />,
    );
    const list = screen.getByRole("list").element();
    const [broken, full] = bars(list);

    expect(list.textContent).not.toContain("NaN");
    expect(full?.height).toBeGreaterThan((broken?.height ?? 0) * 5);
  });

  it("lays the bars out in columns without an inline style on the list", async () => {
    const screen = await render(<BarChart label="This week" bars={WEEK} />);
    const list = screen.getByRole("list").element();
    const tops = Array.from(list.children, (item) =>
      Math.round(item.getBoundingClientRect().top),
    );

    expect(list.getAttribute("style")).toBeNull();
    expect(new Set(tops).size).toBe(1);
  });

  it("runs the bars from the right when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <BarChart label="This week" bars={WEEK} />
      </div>,
    );
    const [first, second] = screen
      .getByRole("listitem")
      .elements()
      .map((item) => item.getBoundingClientRect().left);

    expect(first).toBeGreaterThan(second ?? 0);
  });

  it("hides the values and then the axis labels of crowded bars, keeping the highlighted axis label", async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      label: `D${String(index)}`,
      value: 1000 + index,
    }));
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <BarChart label="This month" bars={many} highlighted={4} />
      </div>,
    );
    const shown = (text: string) =>
      getComputedStyle(screen.getByText(text, { exact: true }).element())
        .visibility;

    expect(shown("1000")).toBe("hidden");
    expect(shown("D0")).toBe("hidden");
    expect(shown("1004")).toBe("hidden");
    expect(shown("D4")).toBe("visible");
  });

  it("keeps the current bar centred and as wide as the others in a crowded chart", async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      label: `Day ${String(index)}`,
      value: 1000 + index,
    }));
    const screen = await render(
      <div style={{ inlineSize: "240px" }}>
        <BarChart label="This month" bars={many} current={17} />
      </div>,
    );
    const list = screen.getByRole("list").element();
    const boxes = bars(list);
    const column = list.children[17]?.getBoundingClientRect();
    const bar = boxes[17];

    expect(bar?.width).toBe(boxes[16]?.width);
    expect((bar?.left ?? 0) + (bar?.width ?? 0) / 2).toBeCloseTo(
      (column?.left ?? 0) + (column?.width ?? 0) / 2,
      0,
    );
  });

  it.each([
    ["first", 0],
    ["last", 5],
  ] as const)(
    "keeps long labels of a current bar in the %s column inside the chart",
    async (_, index) => {
      const long = Array.from({ length: 6 }, (__, position) => ({
        label: `Quarter number ${String(position)}`,
        value: 10 + position,
        valueLabel: `${String(position)} thousand units sold`,
      }));
      const screen = await render(
        <div style={{ inlineSize: "320px" }}>
          <BarChart label="Sales" bars={long} current={index} />
        </div>,
      );
      const chart = screen.getByRole("list").element().getBoundingClientRect();
      const item = screen.getByRole("listitem").elements()[index];
      const labels = Array.from(
        item?.querySelectorAll(
          "[aria-hidden='true'] span, [aria-hidden='true']",
        ) ?? [],
      )
        .filter((element) => element.childElementCount === 0)
        .filter((element) => element.textContent !== "")
        .map((element) => element.getBoundingClientRect());

      expect(labels).toHaveLength(2);
      expect(labels.every((box) => box.left >= chart.left)).toBe(true);
      expect(labels.every((box) => box.right <= chart.right)).toBe(true);
    },
  );

  it.each([
    [1, 0],
    [2, 0],
    [2, 1],
  ] as const)(
    "keeps long labels inside a chart of %s bars when bar %s is current",
    async (count, index) => {
      const few = Array.from({ length: count }, (_, position) => ({
        label: `The longest quarter name anyone ever wrote, part ${String(position)}`,
        value: 10 + position,
        valueLabel: `${String(position)} thousand units sold across every region`,
      }));
      const screen = await render(
        <div style={{ inlineSize: "200px" }}>
          <BarChart label="Sales" bars={few} current={index} />
        </div>,
      );
      const chart = screen.getByRole("list").element().getBoundingClientRect();
      const item = screen.getByRole("listitem").elements()[index];
      const labels = Array.from(item?.querySelectorAll("span") ?? [])
        .filter((element) => element.closest("[aria-hidden='true']"))
        .filter((element) => element.childElementCount === 0)
        .filter((element) => element.textContent !== "")
        .map((element) => element.getBoundingClientRect());

      expect(labels).toHaveLength(2);
      expect(labels.every((box) => box.left >= chart.left)).toBe(true);
      expect(labels.every((box) => box.right <= chart.right)).toBe(true);
    },
  );

  it("leaves a gap between the dots of empty bars in a dense chart", async () => {
    const empty = Array.from({ length: 60 }, (_, index) => ({
      label: String(index),
      value: 0,
    }));
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <BarChart label="This quarter" bars={empty} />
      </div>,
    );
    const boxes = bars(screen.getByRole("list").element());

    expect(
      boxes.every(
        (box, index) =>
          index === 0 || box.left > (boxes[index - 1]?.right ?? 0),
      ),
    ).toBe(true);
  });

  it("leaves a gap between crowded bars", async () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      label: String(index),
      value: 10 + index,
    }));
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <BarChart label="This month" bars={many} />
      </div>,
    );
    const boxes = bars(screen.getByRole("list").element());

    expect(
      boxes.every(
        (box, index) =>
          index === 0 || box.left > (boxes[index - 1]?.right ?? 0),
      ),
    ).toBe(true);
  });

  it("keeps long labels of neighbouring bars from running into each other", async () => {
    const long = Array.from({ length: 6 }, (_, index) => ({
      label: `Quarter ${String(index)}`,
      value: 1_000_000 + index,
      valueLabel: `1,000,00${String(index)} units`,
    }));
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <BarChart label="Sales" bars={long} />
      </div>,
    );
    const edges = (prefix: string) =>
      screen
        .getByText(prefix, { exact: false })
        .elements()
        .filter((element) => element.getAttribute("class") !== null)
        .filter((element) => element.closest("[aria-hidden='true']"))
        .map((element) => element.getBoundingClientRect());
    const apart = (boxes: DOMRect[]) =>
      boxes.every(
        (box, index) =>
          index === 0 || box.left >= (boxes[index - 1]?.right ?? 0),
      );

    expect(apart(edges("Quarter"))).toBe(true);
    expect(apart(edges("units"))).toBe(true);
  });

  it("keeps only the current bar's labels when a highlighted bar sits next to it in a crowded chart", async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      label: `D${String(index)}`,
      value: 1000 + index,
    }));
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <BarChart label="This month" bars={many} current={4} highlighted={5} />
      </div>,
    );
    const shown = (text: string) =>
      getComputedStyle(screen.getByText(text, { exact: true }).element())
        .visibility;

    expect(shown("D4")).toBe("visible");
    expect(shown("D5")).toBe("hidden");
  });

  it("shows every value when the bars have room", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <BarChart label="This week" bars={WEEK} />
      </div>,
    );

    expect(getComputedStyle(screen.getByText("30").element()).visibility).toBe(
      "visible",
    );
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
