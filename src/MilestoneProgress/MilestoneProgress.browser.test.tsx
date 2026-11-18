import { describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
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
    [9, 0, 300],
    [Number.NaN, 0.5, 0],
    [2, Number.NaN, 100],
    [Infinity, 0, 0],
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

  it("keeps the list role that a list without markers loses in Safari", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={1}
      />,
    );

    await expect
      .element(screen.getByRole("list", { name: "Onboarding" }))
      .toHaveAttribute("role", "list");
  });

  it.each([
    [0.4, "Build, 40% done"],
    [7, "Build, 100% done"],
    [0, "Build"],
    [Number.NaN, "Build"],
  ])(
    "puts progress of %d on the current step as %j",
    async (progress, expected) => {
      const screen = await render(
        <MilestoneProgress
          label="Onboarding"
          milestones={MILESTONES}
          completed={2}
          progress={progress}
        />,
      );
      const items = screen.getByRole("listitem").elements();

      expect(items[2]?.textContent).toBe(expected);
      expect(items[1]?.textContent).toBe("Design, completed");
      expect(items[3]?.textContent).toBe("Ship");
    },
  );

  it("says nothing about progress before the first milestone, where no line is drawn", async () => {
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={0}
        progress={0.5}
      />,
    );

    expect(screen.getByRole("listitem").elements()[0]?.textContent).toBe(
      "Setup",
    );
  });

  it("words the progress as asked, from the percentage or as fixed text", async () => {
    const screen = await render(
      <>
        <MilestoneProgress
          label="Counted"
          milestones={MILESTONES}
          completed={2}
          progress={0.4}
          progressLabel={(percent) => `${String(percent)}% gotowe`}
        />
        <MilestoneProgress
          label="Fixed"
          milestones={MILESTONES}
          completed={2}
          progressLabel="nearly there"
        />
      </>,
    );
    const third = (name: string) =>
      screen.getByRole("list", { name }).getByRole("listitem").elements()[2]
        ?.textContent;

    expect(third("Counted")).toBe("Build, 40% gotowe");
    expect(third("Fixed")).toBe("Build, nearly there");
  });

  it("lays its milestones out in one row without being told how many there are", async () => {
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
    const root = screen.getByTestId("line").element() as HTMLElement;
    root.style.removeProperty("--milestone-count");
    const tops = screen
      .getByRole("listitem")
      .elements()
      .map((item) => item.getBoundingClientRect());

    expect(new Set(tops.map((box) => box.top)).size).toBe(1);
    expect(tops.map((box) => box.width)).toEqual([100, 100, 100, 100]);
  });

  it.each([[[]], [["Setup"]]] as const)(
    "renders %j without a line to draw",
    async (milestones) => {
      const screen = await render(
        <div style={wide}>
          <MilestoneProgress
            label="Onboarding"
            milestones={milestones}
            completed={1}
            data-testid="line"
          />
        </div>,
      );

      expect(screen.getByRole("listitem").elements()).toHaveLength(
        milestones.length,
      );
      expect(fillWidth(screen.getByTestId("line").element())).toBe(0);
    },
  );

  it("tells the current step from the upcoming ones and draws the track in forced colours", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    const screen = await render(
      <MilestoneProgress
        label="Onboarding"
        milestones={MILESTONES}
        completed={2}
        data-testid="line"
      />,
    );
    const markers = screen
      .getByRole("listitem")
      .elements()
      .map((item) => getComputedStyle(item.firstElementChild as Element));
    const track = getComputedStyle(
      screen.getByTestId("line").element().firstElementChild as Element,
    );
    const seen = {
      current: markers[2]?.borderTopWidth,
      upcoming: markers[3]?.borderTopWidth,
      track: track.borderTopWidth,
    };
    await session.send("Emulation.setEmulatedMedia", { features: [] });

    expect(seen.current).not.toBe(seen.upcoming);
    expect(seen.track).toBe("1px");
  });
});
