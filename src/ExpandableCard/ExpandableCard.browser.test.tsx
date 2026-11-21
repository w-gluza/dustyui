import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, userEvent } from "vitest/browser";
import { ExpandableCard } from "../index.js";

function pressAndRelease(pressed: Element, released: Element): void {
  pressed.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  released.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function nameOf(element: Element | null): string {
  return element ? getComputedStyle(element).viewTransitionName : "";
}

describe("ExpandableCard", () => {
  it.each([2, 3, 4, 5, 6] as const)(
    "puts its trigger inside a level %s heading",
    async (level) => {
      const screen = await render(
        <ExpandableCard title="Monument Valley" level={level}>
          Details
        </ExpandableCard>,
      );
      const heading = screen.getByRole("heading", {
        level,
        name: "Monument Valley",
      });

      await expect
        .element(heading.getByRole("button", { name: "Monument Valley" }))
        .toBeVisible();
    },
  );

  it("starts collapsed, with no dialog and no details in the page", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        <a href="#route">Route</a>
      </ExpandableCard>,
    );
    const trigger = screen.getByRole("button");

    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    expect(document.querySelector("a")).toBeNull();
  });

  it("opens into a modal dialog named after the card and moves focus inside", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        <a href="#route">Route</a>
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    const dialog = screen.getByRole("dialog", { name: "Monument Valley" });

    await expect.element(dialog).toBeVisible();
    await expect
      .element(dialog.getByRole("link", { name: "Route" }))
      .toBeVisible();
    await expect
      .element(
        dialog.getByRole("heading", { level: 2, name: "Monument Valley" }),
      )
      .toBeVisible();
    expect(dialog.element().matches(":modal")).toBe(true);
    await expect
      .element(dialog.getByRole("button", { name: "Close" }))
      .toHaveFocus();
  });

  it.each([
    ["picture", 0.2],
    ["summary", 0.95],
  ])("opens from a click on its %s", async (_part, fraction) => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <ExpandableCard
          title="Monument Valley"
          level={2}
          data-testid="card"
          summary="Sandstone buttes on the Arizona-Utah border."
          media={<svg viewBox="0 0 12 5" />}
        >
          Details
        </ExpandableCard>
      </div>,
    );
    const card = screen.getByTestId("card");
    const { height } = card.element().getBoundingClientRect();

    await card.click({ position: { x: 40, y: height * fraction } });

    await expect.element(screen.getByRole("dialog")).toBeVisible();
  });

  it.each(["{Enter}", " "])("opens from the keyboard with %j", async (key) => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        Details
      </ExpandableCard>,
    );

    await userEvent.tab();
    await userEvent.keyboard(key);

    await expect.element(screen.getByRole("dialog")).toBeVisible();
  });

  it("closes with Escape and gives focus back to the card", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        Details
      </ExpandableCard>,
    );
    const trigger = screen.getByRole("button", { name: "Monument Valley" });

    await trigger.click();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    await userEvent.keyboard("{Escape}");

    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
    await expect.element(trigger).toHaveFocus();
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with its close button, which can be renamed", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2} closeLabel="Zamknij">
        Details
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await screen.getByRole("button", { name: "Zamknij" }).click();

    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("closes from a click on the backdrop but not on the content", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        Details
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog).toBeVisible();

    await screen.getByText("Details").click();
    await expect.element(dialog).toBeVisible();

    pressAndRelease(dialog.element(), dialog.element());
    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("stays open when a text selection starts inside and ends on the backdrop", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        Details
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog).toBeVisible();

    pressAndRelease(screen.getByText("Details").element(), dialog.element());

    await expect.element(dialog).toBeVisible();
  });

  it("morphs back into the card when closed straight after opening", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2} data-testid="card">
        Details
      </ExpandableCard>,
    );
    const card = screen.getByTestId("card").element();
    const names: string[] = [];
    const watcher = new MutationObserver(() => {
      names.push(nameOf(card));
    });
    watcher.observe(card, { attributes: true, attributeFilter: ["style"] });

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
    await expect.poll(() => nameOf(card)).toBe("none");
    watcher.disconnect();

    expect(names.filter((name) => name.endsWith("-card")).length).toBe(2);
  });

  it("leaves another card's morph running when a card is removed", async () => {
    function Pair({ both }: { both: boolean }) {
      return (
        <>
          <ExpandableCard title="Monument Valley" level={2}>
            Details
          </ExpandableCard>
          {both ? (
            <ExpandableCard title="Death Valley" level={2}>
              Other
            </ExpandableCard>
          ) : null}
        </>
      );
    }
    const screen = await render(<Pair both />);
    const skipped = vi.spyOn(ViewTransition.prototype, "skipTransition");

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await screen.rerender(<Pair both={false} />);

    await expect.element(screen.getByRole("dialog")).toBeVisible();
    expect(skipped).not.toHaveBeenCalled();
    skipped.mockRestore();
  });

  it("drops a queued change when its card is removed while another card is still morphing", async () => {
    const onExpandedChange = vi.fn();
    function Pair({ both }: { both: boolean }) {
      return (
        <>
          <ExpandableCard title="Monument Valley" level={2}>
            Details
          </ExpandableCard>
          {both ? (
            <ExpandableCard
              title="Death Valley"
              level={2}
              onExpandedChange={onExpandedChange}
            >
              Other
            </ExpandableCard>
          ) : null}
        </>
      );
    }
    const screen = await render(<Pair both />);
    const first = screen.getByRole("button", { name: "Monument Valley" });
    const second = screen.getByRole("button", { name: "Death Valley" });

    (first.element() as HTMLElement).click();
    (second.element() as HTMLElement).click();
    await screen.rerender(<Pair both={false} />);
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it("does not report a change for a card removed while its own morph is starting", async () => {
    const onExpandedChange = vi.fn();
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        onExpandedChange={onExpandedChange}
      >
        Details
      </ExpandableCard>,
    );

    (
      screen
        .getByRole("button", { name: "Monument Valley" })
        .element() as HTMLElement
    ).click();
    await screen.rerender(<p>Gone</p>);
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it("opens and closes without a morph when motion is reduced", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const started = vi.spyOn(document, "startViewTransition");
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        Details
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
    await session.send("Emulation.setEmulatedMedia", { features: [] });

    expect(started).not.toHaveBeenCalled();
    started.mockRestore();
  });

  it("holds a summary made of blocks without nesting them in a paragraph", async () => {
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        defaultExpanded
        summary={<p>Sandstone buttes.</p>}
      >
        Details
      </ExpandableCard>,
    );

    await expect.element(screen.getByRole("dialog")).toBeVisible();
    expect(document.querySelector("p p")).toBeNull();
    expect(screen.getByText("Sandstone buttes.").elements()).toHaveLength(2);
  });

  it("survives being closed while its details are still animating in", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2}>
        <p>First</p>
        <p>Second</p>
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    (
      screen.getByRole("button", { name: "Close" }).element() as HTMLElement
    ).click();

    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await expect.element(screen.getByText("Second")).toBeVisible();
  });

  it("starts open when asked to", async () => {
    const screen = await render(
      <ExpandableCard title="Monument Valley" level={2} defaultExpanded>
        Details
      </ExpandableCard>,
    );

    await expect
      .element(screen.getByRole("dialog", { name: "Monument Valley" }))
      .toBeVisible();
  });

  it("reports each change", async () => {
    const onExpandedChange = vi.fn();
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        onExpandedChange={onExpandedChange}
      >
        Details
      </ExpandableCard>,
    );

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    await screen.getByRole("button", { name: "Close" }).click();

    await expect
      .poll(() => onExpandedChange.mock.calls)
      .toEqual([[true], [false]]);
  });

  it("stays as it is told when controlled, and only asks to change", async () => {
    const onExpandedChange = vi.fn();
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        expanded={false}
        onExpandedChange={onExpandedChange}
      >
        Details
      </ExpandableCard>,
    );

    await screen.getByRole("button").click();

    await expect.poll(() => onExpandedChange.mock.calls).toEqual([[true]]);
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
  });

  it("follows the state its owner keeps", async () => {
    function Owner() {
      const [expanded, setExpanded] = useState(true);

      return (
        <ExpandableCard
          title="Monument Valley"
          level={2}
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          Details
        </ExpandableCard>
      );
    }
    const screen = await render(<Owner />);

    await expect.element(screen.getByRole("dialog")).toBeVisible();
    await screen.getByRole("button", { name: "Close" }).click();
    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("names its parts for the morph only while it is the card that is moving", async () => {
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        data-testid="card"
        media={<svg viewBox="0 0 12 5" />}
      >
        Details
      </ExpandableCard>,
    );
    const card = screen.getByTestId("card").element();

    expect(nameOf(card)).toBe("none");

    await screen.getByRole("button", { name: "Monument Valley" }).click();
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog).toBeVisible();

    expect(nameOf(dialog.element())).toMatch(
      /^dusty-expandable-card-\w+-card$/u,
    );
    expect(
      nameOf(dialog.element().querySelector("svg")?.parentElement ?? null),
    ).toMatch(/-media$/u);
    expect(nameOf(card)).toBe("none");

    await screen.getByRole("button", { name: "Close" }).click();
    await expect.poll(() => screen.getByRole("dialog").elements()).toEqual([]);
    await expect.poll(() => nameOf(card)).toBe("none");
  });

  it("shows a different picture once open when given one", async () => {
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        media={<svg data-testid="small" viewBox="0 0 12 5" />}
        expandedMedia={<svg data-testid="large" viewBox="0 0 12 5" />}
      >
        Details
      </ExpandableCard>,
    );

    expect(screen.getByTestId("large").elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Monument Valley" }).click();

    await expect
      .element(screen.getByRole("dialog").getByTestId("large"))
      .toBeVisible();
  });

  it("gives every card its own names so several can share a page", async () => {
    const screen = await render(
      <>
        <ExpandableCard title="Monument Valley" level={2} defaultExpanded>
          Details
        </ExpandableCard>
        <ExpandableCard title="Death Valley" level={2} defaultExpanded>
          Details
        </ExpandableCard>
      </>,
    );
    const [first, second] = screen.getByRole("dialog").elements();

    expect(nameOf(first ?? null)).toMatch(/-card$/u);
    expect(nameOf(first ?? null)).not.toBe(nameOf(second ?? null));
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <ExpandableCard
        title="Monument Valley"
        level={2}
        className="mine"
        data-testid="card"
      >
        Details
      </ExpandableCard>,
    );

    await expect.element(screen.getByTestId("card")).toHaveClass("mine");
  });

  it("passes consumer props to the dialog and keeps its own class", async () => {
    const screen = await render(
      <ExpandableCard
        title="Helios"
        level={2}
        defaultExpanded
        dialogProps={{
          className: "wide",
          "aria-describedby": "about",
          "data-testid": "dialog",
        }}
      >
        <p id="about">Nine tracks</p>
      </ExpandableCard>,
    );
    const dialog = screen.getByTestId("dialog");

    await expect.element(dialog).toHaveClass("wide");
    await expect.element(dialog).toHaveAccessibleDescription("Nine tracks");
    await expect.element(dialog).toHaveAccessibleName("Helios");
    expect(dialog.element().classList.length).toBe(2);
  });

  it("keeps the close button in view when long content is scrolled", async () => {
    const screen = await render(
      <ExpandableCard title="Helios" level={2} defaultExpanded>
        <div style={{ blockSize: "300vh" }}>Long notes</div>
      </ExpandableCard>,
    );
    const dialog = screen.getByRole("dialog").element();
    const close = screen.getByRole("button", { name: "Close" }).element();
    const before = close.getBoundingClientRect();

    dialog.scrollTop = dialog.scrollHeight;

    const view = dialog.getBoundingClientRect();
    const after = close.getBoundingClientRect();
    expect(dialog.scrollTop).toBeGreaterThan(200);
    expect(after.top).toBeGreaterThanOrEqual(view.top);
    expect(after.bottom).toBeLessThanOrEqual(view.bottom);
    expect(Math.round(after.right)).toBe(Math.round(before.right));
    expect(Math.round(before.top - view.top)).toBe(
      Math.round(after.top - view.top),
    );
  });
});
