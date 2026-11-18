import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsProps,
} from "../index.js";

type ExampleProps = Omit<TabsProps, "value" | "defaultValue" | "children"> & {
  disabled?: string;
  defaultValue?: string;
};

function Example({
  disabled,
  defaultValue = "overview",
  ...props
}: ExampleProps) {
  return (
    <Tabs {...props} defaultValue={defaultValue}>
      <TabsList label="Account settings">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity" disabled={disabled === "activity"}>
          Recent activity
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="activity">Activity panel</TabsContent>
      <TabsContent value="settings">Settings panel</TabsContent>
    </Tabs>
  );
}

function indicatorBox(root: Element): DOMRect {
  return (
    root.querySelector("[aria-hidden='true']") as Element
  ).getBoundingClientRect();
}

async function settle(root: Element): Promise<void> {
  await expect.poll(() => root.querySelector("[data-animated]")).not.toBeNull();
  await Promise.all(
    root
      .getAnimations({ subtree: true })
      .map((animation) => animation.finished.catch(() => undefined)),
  );
}

describe("Tabs", () => {
  it.each(["remove", "disable"] as const)(
    "keeps an enabled tab stop when the selected tab is changed by %s",
    async (change) => {
      const example = (changed: boolean) => (
        <Tabs value="selected">
          <TabsList label="Choices">
            {!changed || change !== "remove" ? (
              <TabsTrigger value="selected" disabled={changed}>
                Selected
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const screen = await render(example(false));
      const other = screen.getByRole("tab", { name: "Other" });
      await expect.element(other).toHaveAttribute("tabindex", "-1");

      await screen.rerender(example(true));
      await expect.element(other).toHaveAttribute("tabindex", "0");
      await userEvent.tab();
      await expect.element(other).toHaveFocus();
      await expect.element(other).toHaveAttribute("aria-selected", "false");
    },
  );

  it("lets keyboard users enter a text-only panel", async () => {
    const screen = await render(<Example />);
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(screen.getByRole("tabpanel")).toHaveFocus();
  });

  it("is a named tab list whose tabs and panels point at each other", async () => {
    const screen = await render(<Example />);
    const list = screen.getByRole("tablist", { name: "Account settings" });
    const tab = screen.getByRole("tab", { name: "Overview" }).element();
    const panel = screen.getByRole("tabpanel", { name: "Overview" }).element();

    await expect
      .element(list)
      .toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByRole("tab").elements()).toHaveLength(3);
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("shows only the selected panel and marks only its tab selected", async () => {
    const screen = await render(<Example />);

    await expect.element(screen.getByText("Overview panel")).toBeVisible();
    await expect.element(screen.getByText("Activity panel")).not.toBeVisible();
    expect(
      screen
        .getByRole("tab")
        .elements()
        .map((tab) => tab.getAttribute("aria-selected")),
    ).toEqual(["true", "false", "false"]);
  });

  it("selects a tab when clicked and reports the change", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Example onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

    await expect.element(screen.getByText("Settings panel")).toBeVisible();
    await expect
      .element(screen.getByRole("tab", { name: "Settings" }))
      .toHaveAttribute("aria-selected", "true");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("settings");
  });

  it("keeps only the selected tab in the tab order", async () => {
    const screen = await render(
      <>
        <button type="button">Before</button>
        <Example defaultValue="activity" />
      </>,
    );

    expect(
      screen
        .getByRole("tab")
        .elements()
        .map((tab) => (tab as HTMLElement).tabIndex),
    ).toEqual([-1, 0, -1]);

    await userEvent.click(screen.getByRole("button", { name: "Before" }));
    await userEvent.keyboard("{Tab}");

    await expect
      .element(screen.getByRole("tab", { name: "Recent activity" }))
      .toHaveFocus();
  });

  it("moves through the tabs with the arrow keys, wrapping at the ends, and selects as it goes", async () => {
    const screen = await render(<Example />);

    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await userEvent.keyboard("{ArrowRight}");

    await expect
      .element(screen.getByRole("tab", { name: "Recent activity" }))
      .toHaveFocus();
    await expect.element(screen.getByText("Activity panel")).toBeVisible();

    await userEvent.keyboard("{ArrowRight}{ArrowRight}");

    await expect
      .element(screen.getByRole("tab", { name: "Overview" }))
      .toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");

    await expect
      .element(screen.getByRole("tab", { name: "Settings" }))
      .toHaveFocus();
    await expect.element(screen.getByText("Settings panel")).toBeVisible();
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const screen = await render(<Example defaultValue="activity" />);

    await userEvent.click(screen.getByRole("tab", { name: "Recent activity" }));
    await userEvent.keyboard("{End}");

    await expect
      .element(screen.getByRole("tab", { name: "Settings" }))
      .toHaveFocus();

    await userEvent.keyboard("{Home}");

    await expect
      .element(screen.getByRole("tab", { name: "Overview" }))
      .toHaveFocus();
    await expect.element(screen.getByText("Overview panel")).toBeVisible();
  });

  it("swaps the arrow keys when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <Example />
      </div>,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await userEvent.keyboard("{ArrowLeft}");

    await expect
      .element(screen.getByRole("tab", { name: "Recent activity" }))
      .toHaveFocus();
  });

  it("skips a disabled tab with the keyboard and ignores clicks on it", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <Example disabled="activity" onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await userEvent.keyboard("{ArrowRight}");

    await expect
      .element(screen.getByRole("tab", { name: "Settings" }))
      .toHaveFocus();

    await userEvent.click(
      screen.getByRole("tab", { name: "Recent activity" }),
      {
        force: true,
      },
    );

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("settings");
  });

  it("moves focus without selecting under manual activation until Enter or Space", async () => {
    const screen = await render(<Example activation="manual" />);

    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await userEvent.keyboard("{ArrowRight}");

    await expect
      .element(screen.getByRole("tab", { name: "Recent activity" }))
      .toHaveFocus();
    await expect.element(screen.getByText("Overview panel")).toBeVisible();

    await userEvent.keyboard("{Enter}");

    await expect.element(screen.getByText("Activity panel")).toBeVisible();

    await userEvent.keyboard("{ArrowRight}{ }");

    await expect.element(screen.getByText("Settings panel")).toBeVisible();
  });

  it("follows a controlled value and only asks for changes", async () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("overview");

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setValue("settings");
            }}
          >
            Jump
          </button>
          <Tabs value={value} onValueChange={onValueChange}>
            <TabsList label="Account settings">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Overview panel</TabsContent>
            <TabsContent value="settings">Settings panel</TabsContent>
          </Tabs>
        </>
      );
    }
    const screen = await render(<Controlled />);

    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("settings");
    await expect.element(screen.getByText("Overview panel")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Jump" }));

    await expect.element(screen.getByText("Settings panel")).toBeVisible();
  });

  it.each(["connected", "underline", "pill"] as const)(
    "lays the %s indicator over the selected tab and moves it on selection",
    async (variant) => {
      const screen = await render(
        <Example variant={variant} data-testid="tabs" />,
      );
      const root = screen.getByTestId("tabs").element();
      const tabBox = (name: string) =>
        screen.getByRole("tab", { name }).element().getBoundingClientRect();

      await settle(root);

      expect(indicatorBox(root).left).toBeCloseTo(tabBox("Overview").left, 0);
      expect(indicatorBox(root).width).toBeCloseTo(tabBox("Overview").width, 0);

      await userEvent.click(
        screen.getByRole("tab", { name: "Recent activity" }),
      );
      await settle(root);

      expect(indicatorBox(root).left).toBeCloseTo(
        tabBox("Recent activity").left,
        0,
      );
      expect(indicatorBox(root).width).toBeCloseTo(
        tabBox("Recent activity").width,
        0,
      );
    },
  );

  it("animates the indicator between tabs but not on first paint", async () => {
    const screen = await render(<Example data-testid="tabs" />);
    const root = screen.getByTestId("tabs").element();
    const indicator = root.querySelector("[aria-hidden='true']") as Element;

    expect(indicator.getAnimations()).toHaveLength(0);
    await settle(root);

    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

    expect(
      indicator
        .getAnimations()
        .map((animation) =>
          animation instanceof CSSTransition
            ? animation.transitionProperty
            : "",
        )
        .sort(),
    ).toEqual(["translate", "width"]);
  });

  it("lays the indicator over the selected tab when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <Example defaultValue="settings" data-testid="tabs" />
      </div>,
    );
    const root = screen.getByTestId("tabs").element();

    await settle(root);

    expect(indicatorBox(root).left).toBeCloseTo(
      screen
        .getByRole("tab", { name: "Settings" })
        .element()
        .getBoundingClientRect().left,
      0,
    );
  });

  it("joins the connected tab to its panel as one surface", async () => {
    const screen = await render(<Example data-testid="tabs" />);
    const root = screen.getByTestId("tabs").element();
    const indicator = root.querySelector("[aria-hidden='true']") as Element;
    const panel = screen.getByRole("tabpanel", { name: "Overview" }).element();

    await settle(root);

    expect(getComputedStyle(indicator, "::before").backgroundColor).toBe(
      getComputedStyle(panel).backgroundColor,
    );
    expect(Math.round(indicator.getBoundingClientRect().bottom)).toBe(
      Math.round(panel.getBoundingClientRect().top) + 1,
    );
    expect(
      Number.parseFloat(getComputedStyle(indicator, "::after").marginLeft),
    ).toBeLessThan(0);
  });

  it("follows the selected tab when a label changes width", async () => {
    function Growing() {
      const [long, setLong] = useState(false);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setLong(true);
            }}
          >
            Grow
          </button>
          <Tabs defaultValue="b" variant="underline" data-testid="tabs">
            <TabsList label="Views">
              <TabsTrigger value="a">
                {long ? "A much longer label" : "A"}
              </TabsTrigger>
              <TabsTrigger value="b">B</TabsTrigger>
            </TabsList>
            <TabsContent value="a">A panel</TabsContent>
            <TabsContent value="b">B panel</TabsContent>
          </Tabs>
        </>
      );
    }
    const screen = await render(<Growing />);
    const root = screen.getByTestId("tabs").element();

    await settle(root);
    await userEvent.click(screen.getByRole("button", { name: "Grow" }));
    await settle(root);

    expect(indicatorBox(root).left).toBeCloseTo(
      screen.getByRole("tab", { name: "B" }).element().getBoundingClientRect()
        .left,
      0,
    );
  });

  it("scrolls a list that is wider than its space and keeps a focused tab in view", async () => {
    const screen = await render(
      <div style={{ inlineSize: "220px" }}>
        <Example variant="underline" data-testid="tabs" />
      </div>,
    );
    const list = screen.getByTestId("tabs").element()
      .firstElementChild as Element;

    expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);

    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await userEvent.keyboard("{End}");

    await expect.poll(() => list.scrollLeft).toBeGreaterThan(0);
  });

  it("refuses to render its parts outside Tabs", async () => {
    const quiet = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      render(<TabsTrigger value="a">A</TabsTrigger>),
    ).rejects.toThrow("TabsTrigger must be rendered inside Tabs");
    quiet.mockRestore();
  });

  it("keeps consumer class names and forwards native attributes", async () => {
    const screen = await render(
      <Tabs defaultValue="a" className="mine" data-testid="tabs">
        <TabsList label="Views" className="my-list" data-testid="list">
          <TabsTrigger value="a" className="my-tab">
            A
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="my-panel">
          A panel
        </TabsContent>
      </Tabs>,
    );

    await expect.element(screen.getByTestId("tabs")).toHaveClass("mine");
    await expect.element(screen.getByTestId("list")).toHaveClass("my-list");
    await expect.element(screen.getByRole("tab")).toHaveClass("my-tab");
    await expect.element(screen.getByRole("tabpanel")).toHaveClass("my-panel");
  });

  it.each(["connected", "pill"] as const)(
    "keeps the selected %s label in front of its moving surface",
    async (variant) => {
      const screen = await render(
        <Example variant={variant} data-testid="tabs" />,
      );
      const tab = screen.getByRole("tab", { name: "Overview" }).element();
      const box = tab.getBoundingClientRect();

      await settle(screen.getByTestId("tabs").element());

      expect(
        document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        ),
      ).toBe(tab);
      expect(
        getComputedStyle(tab.closest("[role='tablist']") as Element).position,
      ).toBe("relative");
    },
  );

  it("gives the connected tab a 12px outer corner and an 8px junction with the panel", async () => {
    const screen = await render(<Example data-testid="tabs" />);
    const root = screen.getByTestId("tabs").element();
    const indicator = root.querySelector("[aria-hidden='true']") as Element;

    await settle(root);

    expect(getComputedStyle(indicator, "::before").borderTopLeftRadius).toBe(
      "12px",
    );
    expect(getComputedStyle(indicator, "::before").borderTopWidth).toBe("1px");
    expect(getComputedStyle(indicator, "::after").marginLeft).toBe("-7px");
    expect(getComputedStyle(indicator, "::after").height).toBe("8px");
  });
});
