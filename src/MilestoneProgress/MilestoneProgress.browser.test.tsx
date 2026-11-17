import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { MilestoneProgress } from "../index.js";

const MILESTONES = ["Setup", "Design", "Build", "Ship"] as const;
const wide = { inlineSize: "400px" };

function fillWidth(root: Element): number {
  const fill = root.querySelector("span > span");

  return Math.round(fill?.getBoundingClientRect().width ?? -1);
}

describe("MilestoneProgress", () => {
  it("is a named ordered list of its milestones", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={2}
      />,
    );
    const list = screen.getByRole("list", { name: "Onboarding" });

    expect(list.element().tagName).toBe("OL");
    expect(
      list
        .getByRole("listitem")
        .elements()
        .map((item) => item.textContent),
    ).toEqual(["Setup, completed", "Design, completed", "Build", "Ship"]);
  });

  it("marks the first unfinished milestone as the current step", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={2}
      />,
    );

    expect(
      screen
        .getByRole("listitem")
        .elements()
        .map((item) => item.getAttribute("aria-current")),
    ).toEqual([null, null, "step", null]);
  });

  it("has no current step once every milestone is completed", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={9}
      />,
    );
    const items = screen.getByRole("listitem").elements();

    expect(items.every((item) => item.hasAttribute("data-completed"))).toBe(
      true,
    );
    expect(items.some((item) => item.hasAttribute("aria-current"))).toBe(false);
  });

  it("words the completed state as asked", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Wdrożenie"
        milestones={["Start", "Koniec"]}
        completed={1}
        completedLabel="ukończono"
      />,
    );

    await expect
      .element(screen.getByRole("listitem").first())
      .toHaveTextContent("Start, ukończono");
  });

  it("draws the line to the last completed milestone and on towards the next", async () => {
    const screen = await render(
      <div style={wide}>
        <MilestoneProgress
          label="Onboarding"
          milestones={MILESTONES}
          completed={2}
          progress={0.5}
          data-testid="line"
        />
      </div>,
    );

    await expect
      .poll(() => fillWidth(screen.getByTestId("line").element()))
      .toBe(150);
  });

  it.each([
    [0, 0.5, 0],
    [1, 0, 0],
    [2, 0, 100],
    [2, 7, 200],
    [4, 0.5, 300],
    [-3, 0, 0],
  ])(
    "with %d completed and %d of the way on, draws %dpx of line",
    async (completed, progress, expected) => {
      const screen = await render(
        <div style={wide}>
          <MilestoneProgress
            label="Onboarding"
            milestones={MILESTONES}
            completed={completed}
            progress={progress}
            data-testid="line"
          />
        </div>,
      );

      await expect
        .poll(() => fillWidth(screen.getByTestId("line").element()))
        .toBe(expected);
    },
  );

  it("runs the line between the centres of the first and last markers", async () => {
    const screen = await render(
      <div style={wide}>
        <MilestoneProgress
          label="Onboarding"
          milestones={MILESTONES}
          completed={1}
          data-testid="line"
        />
      </div>,
    );
    const root = screen.getByTestId("line").element();
    const track = (root.firstElementChild as Element).getBoundingClientRect();
    const markers = Array.from(
      root.querySelectorAll("li > span:first-child"),
      (marker) => marker.getBoundingClientRect(),
    );
    const centre = (rect: DOMRect) => rect.left + rect.width / 2;
    const middle = (rect: DOMRect) => rect.top + rect.height / 2;

    expect(track.left).toBe(centre(markers[0] as DOMRect));
    expect(track.right).toBe(centre(markers[3] as DOMRect));
    expect(middle(track)).toBe(middle(markers[0] as DOMRect));
  });

  it("fills completed markers with the action colour and ticks them", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={1}
        data-testid="line"
      />,
    );
    const markers = screen
      .getByTestId("line")
      .element()
      .querySelectorAll("li > span:first-child");
    const background = (index: number) =>
      getComputedStyle(markers[index] as Element).backgroundColor;

    expect(background(0)).not.toBe(background(1));
    expect(background(1)).toBe(background(3));
    expect(markers[0]?.querySelector("svg")).not.toBeNull();
    expect(markers[1]?.querySelector("svg")).toBeNull();
  });

  it("starts from the other side when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={wide}>
        <MilestoneProgress
          label="Onboarding"
          milestones={MILESTONES}
          completed={2}
          data-testid="line"
        />
      </div>,
    );
    const root = screen.getByTestId("line").element();
    const track = (root.firstElementChild as Element).getBoundingClientRect();
    const fill = (
      root.querySelector("span > span") as Element
    ).getBoundingClientRect();

    expect(fill.right).toBe(track.right);
    const items = screen.getByRole("listitem").elements();

    expect(items[0]?.getBoundingClientRect().left).toBeGreaterThan(
      items[3]?.getBoundingClientRect().left ?? Infinity,
    );
  });

  it("keeps a consumer class name and style and forwards native attributes", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={1}
        className="mine"
        style={{ inlineSize: "320px" }}
        data-testid="line"
      />,
    );

    await expect.element(screen.getByTestId("line")).toHaveClass("mine");
    expect(
      screen.getByTestId("line").element().getBoundingClientRect().width,
    ).toBe(320);
  });
});
