import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { CopyButton } from "../index.js";
import { announcements, resetAnnouncer } from "../test/announcements.js";

async function settledBackground(button: Element): Promise<string> {
  await Promise.all(
    button.getAnimations().map((animation) => animation.finished),
  );
  return getComputedStyle(button).backgroundColor;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function clipboard() {
  return vi.spyOn(navigator.clipboard, "writeText");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyButton", () => {
  it("copies its value and reports success with the copied value", async () => {
    const write = clipboard().mockResolvedValue();
    const onCopied = vi.fn();
    const screen = await render(
      <CopyButton value="npm install dustyui" onCopied={onCopied} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(write).toHaveBeenCalledExactlyOnceWith("npm install dustyui");
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toHaveAttribute("data-status", "copied");
    expect(onCopied).toHaveBeenCalledExactlyOnceWith("npm install dustyui");
  });

  it("announces success to assistive technology", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton value="abc" copiedLabel="Link copied" />,
    );

    await userEvent.click(screen.getByRole("button"));

    await expect
      .poll(() => document.querySelector("[data-dusty-announcer]")?.textContent)
      .toContain("Link copied");
  });

  it("returns to its resting label after the feedback time", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton value="abc" feedbackDuration={60} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();

    await expect
      .element(screen.getByRole("button", { name: "Copy" }))
      .toBeVisible();
  });

  it("reports a failure and hands over the error", async () => {
    const denied = new Error("denied");
    clipboard().mockRejectedValue(denied);
    const onCopyError = vi.fn();
    const onCopied = vi.fn();
    const screen = await render(
      <CopyButton value="abc" onCopied={onCopied} onCopyError={onCopyError} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copy failed" }))
      .toHaveAttribute("data-status", "failed");
    expect(onCopyError).toHaveBeenCalledExactlyOnceWith(denied);
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("still reports success when the consumer's success handler throws", async () => {
    clipboard().mockResolvedValue();
    const broken = new Error("handler broke");
    const reported: unknown[] = [];
    const collect = (event: ErrorEvent) => {
      event.preventDefault();
      reported.push(event.error);
    };
    window.addEventListener("error", collect);
    const onCopyError = vi.fn();
    const screen = await render(
      <CopyButton
        value="abc"
        onCopied={() => {
          throw broken;
        }}
        onCopyError={onCopyError}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toHaveAttribute("data-status", "copied");
    await expect.poll(() => reported).toEqual([broken]);
    expect(onCopyError).not.toHaveBeenCalled();
    window.removeEventListener("error", collect);
  });

  it("keeps its width when the label changes", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(<CopyButton value="abc" />);
    const button = screen.getByRole("button").element();
    const before = button.getBoundingClientRect().width;

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();

    expect(button.getBoundingClientRect().width).toBe(before);
  });

  it("takes translated labels", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton value="abc" label="Kopiuj" copiedLabel="Skopiowano" />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Kopiuj" }));

    await expect
      .element(screen.getByRole("button", { name: "Skopiowano" }))
      .toBeVisible();
  });

  it("shows only an icon when asked, keeping its name", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(<CopyButton value="abc" iconOnly />);
    const button = screen.getByRole("button", { name: "Copy" }).element();
    const box = button.getBoundingClientRect();

    expect(box.width).toBe(box.height);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
  });

  it("does not copy when a click handler prevents it", async () => {
    const write = clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton
        value="abc"
        onClick={(event) => {
          event.preventDefault();
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(write).not.toHaveBeenCalled();
  });

  it("does not copy while unavailable", async () => {
    const write = clipboard().mockResolvedValue();
    const screen = await render(<CopyButton value="abc" aria-disabled />);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }), {
      force: true,
    });

    expect(write).not.toHaveBeenCalled();
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <CopyButton value="abc" className="mine" data-testid="copy" />,
    );

    await expect.element(screen.getByTestId("copy")).toHaveClass("mine");
  });

  it("stays still until first used, then brings the tick in without turning it", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(<CopyButton value="abc" />);
    const button = screen.getByRole("button").element();
    const names = () =>
      button
        .getAnimations({ subtree: true })
        .map((animation) =>
          animation instanceof CSSAnimation ? animation.animationName : "",
        )
        .join(" ");

    expect(names()).toBe("");

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();

    expect(names()).toMatch(/enter/u);
    expect(
      getComputedStyle(button.querySelector("svg[data-shown]") as Element)
        .rotate,
    ).toBe("none");
  });

  it("shows exactly one icon at a time, stacked in one place", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(<CopyButton value="abc" />);
    const button = screen.getByRole("button").element();
    const icons = Array.from(button.querySelectorAll("svg"));
    const centres = icons.map((icon) => {
      const box = icon.getBoundingClientRect();

      return Math.round(box.left + box.width / 2);
    });

    expect(button.querySelectorAll("svg[data-shown]")).toHaveLength(1);
    expect(new Set(centres).size).toBe(1);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();

    expect(button.querySelectorAll("svg[data-shown]")).toHaveLength(1);
    expect(icons[1]?.hasAttribute("data-shown")).toBe(true);
  });

  it("tints a quiet button on success and returns to its resting look", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton value="abc" feedbackDuration={300} />,
    );
    const button = screen.getByRole("button").element();
    await userEvent.hover(screen.getByRole("button"));
    const resting = await settledBackground(button);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
    await expect
      .poll(() => getComputedStyle(button).backgroundColor)
      .not.toBe(resting);

    await expect
      .element(screen.getByRole("button", { name: "Copy" }))
      .toBeVisible();
    await expect
      .poll(() => getComputedStyle(button).backgroundColor)
      .toBe(resting);
  });

  it("leaves a primary button its own colours on success", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(<CopyButton value="abc" variant="primary" />);
    const button = screen.getByRole("button").element();
    await userEvent.hover(screen.getByRole("button"));
    const resting = await settledBackground(button);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();

    expect(getComputedStyle(button).backgroundColor).toBe(resting);
  });

  it("marks a failure with the danger colour, not the success tint", async () => {
    clipboard().mockRejectedValue(new Error("denied"));
    const screen = await render(<CopyButton value="abc" />);
    const button = screen.getByRole("button").element();
    await userEvent.hover(screen.getByRole("button"));
    const resting = await settledBackground(button);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copy failed" }))
      .toBeVisible();

    expect(getComputedStyle(button).backgroundColor).toBe(resting);
    await expect
      .poll(() => getComputedStyle(button).borderTopColor)
      .toBe(
        getComputedStyle(button.querySelector("svg[data-shown]") as Element)
          .color,
      );
  });

  it("restarts the feedback time when clicked again", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton value="abc" feedbackDuration={400} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
    await wait(250);
    await userEvent.click(screen.getByRole("button", { name: "Copied" }));
    await wait(250);

    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Copy" }))
      .toBeVisible();
  });

  it("does not show success before the clipboard has answered", async () => {
    let finish: () => void = () => undefined;
    clipboard().mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const screen = await render(<CopyButton value="abc" />);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copy" }))
      .toHaveAttribute("data-status", "idle");

    finish();

    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
  });

  it("keeps the resting icon and label still while the clipboard is answering", async () => {
    let finish: () => void = () => undefined;
    clipboard().mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const screen = await render(<CopyButton value="abc" />);
    const button = screen.getByRole("button").element();

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(button.hasAttribute("data-animated")).toBe(false);
    expect(
      button
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation),
    ).toEqual([]);
    finish();
    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toHaveAttribute("data-animated", "true");
  });

  it("gives the copied label of a plain button the full text colour", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <>
        <CopyButton value="abc" variant="plain" />
        <span data-testid="text" style={{ color: "var(--dusty-text)" }} />
      </>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    const copied = screen.getByRole("button", { name: "Copied" });
    await expect.element(copied).toBeVisible();
    await Promise.all(
      copied
        .element()
        .getAnimations()
        .map((animation) => animation.finished),
    );

    expect(getComputedStyle(copied.element()).color).toBe(
      getComputedStyle(screen.getByTestId("text").element()).color,
    );
  });

  it.each([Number.NaN, -5])(
    "falls back to the default feedback time for a duration of %s",
    async (duration) => {
      clipboard().mockResolvedValue();
      const screen = await render(
        <CopyButton value="abc" feedbackDuration={duration} />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Copy" }));
      await wait(300);

      await expect
        .element(screen.getByRole("button", { name: "Copied" }))
        .toBeVisible();
    },
  );

  it("keeps the feedback until the next press for an infinite duration", async () => {
    clipboard().mockResolvedValue();
    const screen = await render(
      <CopyButton value="abc" feedbackDuration={Infinity} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await wait(300);

    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
  });

  it("names an icon-only button after the failure", async () => {
    clipboard().mockRejectedValue(new Error("denied"));
    const screen = await render(<CopyButton value="abc" iconOnly />);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copy failed" }))
      .toHaveAttribute("data-status", "failed");
  });

  it("announces a failure assertively", async () => {
    resetAnnouncer();
    clipboard().mockRejectedValue(new Error("denied"));
    const screen = await render(<CopyButton value="abc" />);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .poll(() => announcements("assertive"))
      .toEqual(["Copy failed"]);
  });

  it("reports a failure where there is no clipboard, as on an insecure page", async () => {
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(
      undefined as unknown as Clipboard,
    );
    const onCopyError = vi.fn();
    const screen = await render(
      <CopyButton value="abc" onCopyError={onCopyError} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copy failed" }))
      .toBeVisible();
    expect(onCopyError).toHaveBeenCalledOnce();
  });

  it("keeps its width when copying fails", async () => {
    clipboard().mockRejectedValue(new Error("denied"));
    const screen = await render(<CopyButton value="abc" />);
    const button = screen.getByRole("button").element();
    const before = button.getBoundingClientRect().width;

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await expect
      .element(screen.getByRole("button", { name: "Copy failed" }))
      .toBeVisible();

    expect(button.getBoundingClientRect().width).toBe(before);
  });

  it("works the value out only when it is asked to copy", async () => {
    clipboard().mockResolvedValue();
    const read = vi.fn(() => "late");
    const onCopied = vi.fn();
    const screen = await render(
      <CopyButton value={read} onCopied={onCopied} />,
    );

    expect(read).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copied" }))
      .toBeVisible();
    expect(clipboard()).toHaveBeenCalledWith("late");
    expect(onCopied).toHaveBeenCalledWith("late");
  });

  it("reports a value that cannot be worked out as a failed copy", async () => {
    const onCopyError = vi.fn();
    const screen = await render(
      <CopyButton
        value={() => {
          throw new Error("unreadable");
        }}
        onCopyError={onCopyError}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    await expect
      .element(screen.getByRole("button", { name: "Copy failed" }))
      .toBeVisible();
    expect(onCopyError).toHaveBeenCalledOnce();
  });
});
