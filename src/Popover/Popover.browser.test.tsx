import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Popover } from "../index.js";

function panelOf(testId = "panel"): HTMLElement {
  const panel = document.querySelector<HTMLElement>(
    `[data-testid="${testId}"]`,
  );

  if (!panel) {
    throw new Error("No panel");
  }
  return panel;
}

const isOpen = () => panelOf().matches(":popover-open");

describe("Popover", () => {
  it("keeps its content hidden until the trigger is pressed", async () => {
    const screen = await render(
      <Popover trigger="Options" data-testid="panel">
        <a href="#one">One</a>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Options" });

    expect(isOpen()).toBe(false);
    expect(screen.getByRole("link").elements()).toHaveLength(0);
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();

    expect(isOpen()).toBe(true);
    await expect
      .element(screen.getByRole("link", { name: "One" }))
      .toBeVisible();
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens from the keyboard and closes with Escape, giving focus back", async () => {
    const screen = await render(
      <Popover trigger="Options" data-testid="panel">
        <a href="#one">One</a>
      </Popover>,
    );

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(isOpen()).toBe(true);
    await userEvent.tab();
    await expect.element(screen.getByRole("link")).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(isOpen()).toBe(false);
    await expect
      .element(screen.getByRole("button", { name: "Options" }))
      .toHaveFocus();
  });

  it("closes on a press outside and on a second press of the trigger", async () => {
    const screen = await render(
      <>
        <Popover trigger="Options" data-testid="panel">
          Content
        </Popover>
        <p style={{ marginBlockStart: "300px" }}>Elsewhere</p>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Options" });

    await trigger.click();
    await screen.getByText("Elsewhere").click();
    expect(isOpen()).toBe(false);

    await trigger.click();
    await trigger.click();
    expect(isOpen()).toBe(false);
  });

  it("drops below the trigger, lined up with its starting edge", async () => {
    const screen = await render(
      <div style={{ padding: "40px 200px" }}>
        <Popover trigger="Options" data-testid="panel">
          Content
        </Popover>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Options" });

    await trigger.click();
    const button = trigger.element().getBoundingClientRect();
    const panel = panelOf().getBoundingClientRect();

    expect(panel.top).toBeGreaterThan(button.bottom);
    expect(Math.round(panel.left)).toBe(Math.round(button.left));
  });

  it("lines up with the far edge when aligned to the end", async () => {
    const screen = await render(
      <div style={{ padding: "40px 200px" }}>
        <Popover trigger="Options" align="end" data-testid="panel">
          Content
        </Popover>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Options" });

    await trigger.click();

    expect(Math.round(panelOf().getBoundingClientRect().right)).toBe(
      Math.round(trigger.element().getBoundingClientRect().right),
    );
  });

  it("flips above the trigger when there is no room below", async () => {
    const screen = await render(
      <div
        style={{
          position: "fixed",
          insetBlockEnd: "8px",
          insetInlineStart: "8px",
        }}
      >
        <Popover trigger="Options" data-testid="panel">
          <p style={{ blockSize: "120px" }}>Tall content</p>
        </Popover>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Options" });

    await trigger.click();

    expect(panelOf().getBoundingClientRect().bottom).toBeLessThan(
      trigger.element().getBoundingClientRect().top,
    );
  });

  it("keeps two popovers on one page apart", async () => {
    const screen = await render(
      <div style={{ display: "flex", gap: "40px", padding: "40px" }}>
        <Popover trigger="First" data-testid="first">
          One
        </Popover>
        <Popover trigger="Second" data-testid="second">
          Two
        </Popover>
      </div>,
    );
    const second = screen.getByRole("button", { name: "Second" });

    await second.click();

    expect(panelOf("first").matches(":popover-open")).toBe(false);
    expect(Math.round(panelOf("second").getBoundingClientRect().left)).toBe(
      Math.round(second.element().getBoundingClientRect().left),
    );
  });

  it("names its trigger as asked and can drop the chevron", async () => {
    const screen = await render(
      <Popover
        trigger="4/4"
        triggerLabel="Time signature, 4/4"
        chevron={false}
        className="mine"
        data-testid="panel"
      >
        Content
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Time signature, 4/4" });

    await expect.element(trigger).toBeVisible();
    expect(trigger.element().children).toHaveLength(0);
    expect(panelOf().classList.contains("mine")).toBe(true);
  });

  it("stays open after a choice unless asked to close", async () => {
    const screen = await render(
      <Popover trigger="Options" data-testid="panel">
        <label>
          <input type="checkbox" /> Loud
        </label>
      </Popover>,
    );

    await screen.getByRole("button", { name: "Options" }).click();
    await screen.getByRole("checkbox", { name: "Loud" }).click();

    expect(isOpen()).toBe(true);
  });

  it("closes after a choice made by pointer or with Enter, but not while arrowing", async () => {
    const screen = await render(
      <Popover trigger="Options" closeOnSelect data-testid="panel">
        <label>
          <input type="radio" name="meter" defaultChecked /> 3/4
        </label>
        <label>
          <input type="radio" name="meter" /> 4/4
        </label>
        <label>
          <input type="radio" name="meter" /> 6/8
        </label>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Options" });

    await trigger.click();
    await screen.getByRole("radio", { name: "4/4" }).click();
    expect(isOpen()).toBe(false);

    await trigger.click();
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    await expect
      .element(screen.getByRole("radio", { name: "6/8" }))
      .toBeChecked();
    expect(isOpen()).toBe(true);

    await userEvent.keyboard("{Enter}");
    expect(isOpen()).toBe(false);
  });
});
