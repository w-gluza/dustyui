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

  it.each(["Alt", "Control", "Meta", "Shift"])(
    "leaves an arrow key alone while %s is held",
    async (modifier) => {
      const onKeyDown = vi.fn((event: React.KeyboardEvent) => {
        queueMicrotask(() => prevented.push(event.defaultPrevented));
      });
      const prevented: boolean[] = [];
      const screen = await render(
        <Tabs defaultValue="a">
          <TabsList label="Views" onKeyDown={onKeyDown}>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const first = screen.getByRole("tab", { name: "A" });

      first.element().focus();
      await userEvent.keyboard(`{${modifier}>}{ArrowRight}{/${modifier}}`);

      await expect.element(first).toHaveAttribute("aria-selected", "true");
      await expect.element(first).toHaveFocus();
      expect(prevented).not.toContain(true);
    },
  );

  it("keeps an unselected panel hidden when a consumer class sets display", async () => {
    const screen = await render(
      <>
        <style>{".shown { display: grid; }"}</style>
        <Tabs defaultValue="a">
          <TabsList label="Views">
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="shown">
            A panel
          </TabsContent>
          <TabsContent value="b" className="shown" data-testid="hidden">
            B panel
          </TabsContent>
        </Tabs>
      </>,
    );

    expect(
      getComputedStyle(screen.getByTestId("hidden").element()).display,
    ).toBe("none");
    await expect.element(screen.getByText("A panel")).toBeVisible();
  });

  it("styles the list and panels the same when they sit inside wrappers", async () => {
    const screen = await render(
      <>
        <Example data-testid="direct" />
        <Tabs defaultValue="a" data-testid="wrapped">
          <header>
            <TabsList label="Views">
              <TabsTrigger value="a">A</TabsTrigger>
            </TabsList>
          </header>
          <div>
            <TabsContent value="a">A panel</TabsContent>
          </div>
        </Tabs>
      </>,
    );
    const part = (id: string, role: string) => {
      const root = screen.getByTestId(id).element();
      const node =
        role === "tablist"
          ? root.querySelector('[role="tablist"]')?.parentElement
          : root.querySelector('[role="tabpanel"]:not([hidden])');
      const style = getComputedStyle(node as Element);

      return [
        style.paddingInlineStart,
        style.marginBlockEnd,
        style.borderTopWidth,
        style.backgroundColor,
      ];
    };

    expect(part("wrapped", "tablist")).toEqual(part("direct", "tablist"));
    expect(part("wrapped", "tabpanel")).toEqual(part("direct", "tabpanel"));
  });

  it("keeps the variant of nested tabs apart from the tabs around them", async () => {
    const screen = await render(
      <Tabs defaultValue="a" variant="pill">
        <TabsList label="Outer">
          <TabsTrigger value="a">Outer tab</TabsTrigger>
        </TabsList>
        <TabsContent value="a">
          <Tabs defaultValue="x" variant="underline">
            <TabsList label="Inner">
              <TabsTrigger value="x">Inner tab</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="y" variant="underline">
            <TabsList label="Alone">
              <TabsTrigger value="y">Lone tab</TabsTrigger>
            </TabsList>
          </Tabs>
        </TabsContent>
      </Tabs>,
    );
    const height = (name: string) =>
      getComputedStyle(screen.getByRole("tab", { name }).element())
        .minBlockSize;

    expect(height("Inner tab")).toBe("44px");
    expect(height("Outer tab")).toBe("36px");
  });

  it("gives values that differ only by a space or a hyphen their own ids", async () => {
    const screen = await render(
      <Tabs defaultValue="my tab">
        <TabsList label="Views">
          <TabsTrigger value="my tab">Spaced</TabsTrigger>
          <TabsTrigger value="my-tab">Hyphenated</TabsTrigger>
        </TabsList>
        <TabsContent value="my tab">Spaced panel</TabsContent>
        <TabsContent value="my-tab">Hyphenated panel</TabsContent>
      </Tabs>,
    );
    const spaced = screen.getByRole("tab", { name: "Spaced" }).element();
    const hyphenated = screen
      .getByRole("tab", { name: "Hyphenated" })
      .element();

    expect(spaced.id).not.toBe(hyphenated.id);
    expect(spaced.id).not.toMatch(/\s/u);
    expect(
      document.getElementById(spaced.getAttribute("aria-controls") ?? "")
        ?.textContent,
    ).toBe("Spaced panel");
    expect(
      document.getElementById(hyphenated.getAttribute("aria-controls") ?? "")
        ?.textContent,
    ).toBe("Hyphenated panel");
  });

  it.each([false, true])(
    "brings a tab selected from outside into view without moving the page (right to left: %s)",
    async (rtl) => {
      const example = (value: string) => (
        <div dir={rtl ? "rtl" : "ltr"} style={{ inlineSize: "220px" }}>
          <Tabs value={value} variant="underline" data-testid="tabs">
            <TabsList label="Account settings">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Recent activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      );
      const screen = await render(example("overview"));
      const list = screen.getByTestId("tabs").element()
        .firstElementChild as Element;
      const inView = (name: string) => {
        const tab = screen
          .getByRole("tab", { name })
          .element()
          .getBoundingClientRect();
        const box = list.getBoundingClientRect();

        return tab.left >= box.left - 1 && tab.right <= box.right + 1;
      };

      expect(inView("Settings")).toBe(false);
      await screen.rerender(example("settings"));

      await expect.poll(() => inView("Settings")).toBe(true);
      expect(window.scrollX).toBe(0);
      expect(window.scrollY).toBe(0);

      await screen.rerender(example("overview"));
      await expect.poll(() => inView("Overview")).toBe(true);
    },
  );

  it("starts with an off-screen default tab in view", async () => {
    const screen = await render(
      <div style={{ inlineSize: "220px" }}>
        <Example variant="underline" defaultValue="settings" />
      </div>,
    );
    const tab = screen
      .getByRole("tab", { name: "Settings" })
      .element()
      .getBoundingClientRect();

    const list = (
      screen.getByRole("tablist").element().parentElement as Element
    ).getBoundingClientRect();

    expect(tab.right).toBeLessThanOrEqual(list.right + 1);
    expect(tab.left).toBeGreaterThanOrEqual(list.left - 1);
  });

  it("hands the list element to a consumer ref", async () => {
    const ref = { current: null as HTMLDivElement | null };
    const screen = await render(
      <Tabs defaultValue="a">
        <TabsList label="Views" ref={ref} data-testid="list">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(ref.current).toBe(screen.getByTestId("list").element());
  });

  it("measures the tabs with one observer however often it renders", async () => {
    const created = vi.fn();
    const Real = window.ResizeObserver;
    window.ResizeObserver = class extends Real {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        created();
      }
    };
    try {
      const screen = await render(<Example />);
      await screen.rerender(<Example />);
      await screen.rerender(<Example />);
      await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

      expect(created).toHaveBeenCalledTimes(1);
    } finally {
      window.ResizeObserver = Real;
    }
  });

  it("keeps following the selected tab after tabs are added", async () => {
    const example = (extra: boolean) => (
      <Tabs defaultValue="b" data-testid="tabs">
        <TabsList label="Views">
          {extra ? (
            <TabsTrigger value="new">A new first tab</TabsTrigger>
          ) : null}
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const screen = await render(example(false));
    const root = screen.getByTestId("tabs").element();
    const selected = () =>
      screen.getByRole("tab", { name: "B" }).element().getBoundingClientRect();

    await screen.rerender(example(true));

    await expect
      .poll(() => Math.round(indicatorBox(root).left))
      .toBe(Math.round(selected().left));
  });

  it("shows the whole joined shape of an end tab brought into view", async () => {
    const screen = await render(
      <div style={{ inlineSize: "220px" }}>
        <Example defaultValue="settings" data-testid="tabs" />
      </div>,
    );
    const list = screen.getByTestId("tabs").element()
      .firstElementChild as Element;

    expect(
      Math.ceil(list.scrollLeft + list.clientWidth),
    ).toBeGreaterThanOrEqual(list.scrollWidth);
  });

  it("renders a value holding half of a surrogate pair, with its own ids", async () => {
    const lone = "tab\uD83D";
    const screen = await render(
      <Tabs defaultValue={lone}>
        <TabsList label="Views">
          <TabsTrigger value={lone}>Lone</TabsTrigger>
          <TabsTrigger value="tab_d83d_">Lookalike</TabsTrigger>
          <TabsTrigger value="tab">Plain</TabsTrigger>
        </TabsList>
        <TabsContent value={lone}>Lone panel</TabsContent>
      </Tabs>,
    );
    const ids = screen
      .getByRole("tab")
      .elements()
      .map((tab) => tab.id);

    expect(new Set(ids).size).toBe(3);
    await expect
      .element(screen.getByRole("tabpanel", { name: "Lone" }))
      .toHaveTextContent("Lone panel");
  });

  it("keeps the variant of a tab list nested inside another tab list", async () => {
    const screen = await render(
      <Tabs defaultValue="a" variant="connected">
        <TabsList label="Outer" data-testid="outer">
          <TabsTrigger value="a">Outer tab</TabsTrigger>
          <Tabs defaultValue="x" variant="pill">
            <TabsList label="Inner" data-testid="inner">
              <TabsTrigger value="x">Inner tab</TabsTrigger>
            </TabsList>
          </Tabs>
        </TabsList>
      </Tabs>,
    );
    const alone = await render(
      <Tabs defaultValue="x" variant="pill">
        <TabsList label="Alone" data-testid="alone">
          <TabsTrigger value="x">Lone tab</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const look = (list: Element, name: string) => {
      const tab = getComputedStyle(screen.getByRole("tab", { name }).element());
      const indicator = list.querySelector(":scope > [aria-hidden]") as Element;

      return [
        tab.paddingBlockEnd,
        tab.minBlockSize,
        getComputedStyle(indicator).gridTemplateRows,
        getComputedStyle(indicator, "::before").content,
        getComputedStyle(indicator).borderTopWidth,
      ];
    };

    expect(look(screen.getByTestId("inner").element(), "Inner tab")).toEqual(
      look(alone.getByTestId("alone").element(), "Lone tab"),
    );
  });

  it.each(["connected", "underline", "pill"] as const)(
    "draws a nested %s selection once when the list around it has none",
    async (variant) => {
      const screen = await render(
        <>
          <Tabs value="missing" variant={variant}>
            <TabsList label="Outer">
              <TabsTrigger value="a">Outer tab</TabsTrigger>
              <Tabs defaultValue="x" variant={variant}>
                <TabsList label="Inner" data-testid="inner">
                  <TabsTrigger value="x">Inner tab</TabsTrigger>
                </TabsList>
              </Tabs>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="x" variant={variant}>
            <TabsList label="Alone">
              <TabsTrigger value="x">Lone tab</TabsTrigger>
            </TabsList>
          </Tabs>
        </>,
      );
      const look = (name: string) => {
        const style = getComputedStyle(
          screen.getByRole("tab", { name }).element(),
        );

        return [style.backgroundColor, style.boxShadow, style.borderTopWidth];
      };

      await expect
        .element(screen.getByTestId("inner"))
        .toHaveAttribute("data-placed");
      expect(look("Inner tab")).toEqual(look("Lone tab"));
    },
  );
});
