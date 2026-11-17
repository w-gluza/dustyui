import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { StatList } from "../index.js";

const STATS = [
  {
    label: "Total practice time",
    value: "4h 12m",
    icon: <svg data-testid="icon" />,
  },
  { label: "Total sessions", value: 18 },
] as const;

describe("StatList", () => {
  it("is a description list pairing each label with its value", async () => {
    const screen = await render(<StatList stats={STATS} data-testid="stats" />);
    const list = screen.getByTestId("stats").element();

    expect(list.tagName).toBe("DL");
    expect(
      Array.from(list.querySelectorAll("dt"), (term) => term.textContent),
    ).toEqual(["Total practice time", "Total sessions"]);
    expect(
      Array.from(list.querySelectorAll("dd"), (value) => value.textContent),
    ).toEqual(["4h 12m", "18"]);
    await expect
      .element(screen.getByRole("term").first())
      .toHaveTextContent("Total practice time");
  });

  it("hides the icon from assistive technology and renders none when not given", async () => {
    const screen = await render(<StatList stats={STATS} data-testid="stats" />);
    const terms = screen.getByTestId("stats").element().querySelectorAll("dt");

    expect(
      screen.getByTestId("icon").element().closest("[aria-hidden='true']"),
    ).not.toBeNull();
    expect(terms[1]?.children).toHaveLength(0);
  });

  it("pushes the value to the far side and rules off every row but the last", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <StatList stats={STATS} data-testid="stats" />
      </div>,
    );
    const list = screen.getByTestId("stats").element();
    const rows = list.querySelectorAll("div");
    const rule = (index: number) =>
      getComputedStyle(rows[index] as Element).borderBottomWidth;

    expect(
      Math.round(
        (list.querySelector("dd") as Element).getBoundingClientRect().right,
      ),
    ).toBe(Math.round(list.getBoundingClientRect().right));
    expect(rule(0)).toBe("1px");
    expect(rule(1)).toBe("0px");
  });

  it("puts the value on the other side when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={{ inlineSize: "320px" }}>
        <StatList stats={STATS} data-testid="stats" />
      </div>,
    );
    const list = screen.getByTestId("stats").element();

    expect(
      Math.round(
        (list.querySelector("dd") as Element).getBoundingClientRect().left,
      ),
    ).toBe(Math.round(list.getBoundingClientRect().left));
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <StatList stats={STATS} className="mine" aria-label="Your activity" />,
    );

    await expect
      .element(screen.getByLabelText("Your activity"))
      .toHaveClass("mine");
  });
});
