import { StrictMode } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, type ButtonProps } from "../index.js";
import { announcements, resetAnnouncer } from "../test/announcements.js";

function size(element: Element): [number, number] {
  const { width, height } = element.getBoundingClientRect();
  return [width, height];
}

describe("Button", () => {
  beforeEach(resetAnnouncer);

  it("calls onClick when activated by pointer and by keyboard", async () => {
    const onClick = vi.fn();
    const screen = await render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    await button.click();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("defaults to the primary variant and exposes the variant as data", async () => {
    const screen = await render(
      <>
        <Button>Save</Button>
        <Button variant="secondary">Cancel</Button>
      </>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Save" }))
      .toHaveAttribute("data-variant", "primary");
    await expect
      .element(screen.getByRole("button", { name: "Cancel" }))
      .toHaveAttribute("data-variant", "secondary");
  });

  it("is medium by default and grows from small to large", async () => {
    const screen = await render(
      <>
        <Button size="small">Small</Button>
        <Button>Default</Button>
        <Button size="medium">Medium</Button>
        <Button size="large">Large</Button>
      </>,
    );
    const heights = ["Small", "Default", "Medium", "Large"].map(
      (name) => size(screen.getByRole("button", { name }).element())[1],
    );

    expect(heights).toEqual([34, 46, 46, 54]);
    await expect
      .element(screen.getByRole("button", { name: "Default" }))
      .toHaveAttribute("data-size", "medium");
  });

  it("keeps a consumer class name and forwards native attributes and the ref", async () => {
    const ref = vi.fn();
    const screen = await render(
      <Button ref={ref} className="mine" id="save" name="intent">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });

    await expect.element(button).toHaveClass("mine");
    await expect.element(button).toHaveAttribute("id", "save");
    await expect.element(button).toHaveAttribute("name", "intent");
    expect(ref).toHaveBeenCalledWith(button.element());
  });

  it("does not submit a form unless asked to", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const screen = await render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button>Save</Button>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Save" });

    await expect.element(button).toHaveAttribute("type", "button");
    await button.click();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits its form by click and by Enter in a field when type is submit", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const screen = await render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <label htmlFor="name">Name</label>
        <input id="name" />
        <Button type="submit">Save</Button>
      </form>,
    );

    await screen.getByRole("button", { name: "Save" }).click();
    await screen.getByRole("textbox", { name: "Name" }).fill("Wiola");
    await userEvent.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("requires children and rejects raw HTML content", () => {
    type Content = Pick<ButtonProps, "children">;

    expectTypeOf<Content>().not.toEqualTypeOf<Partial<Content>>();
    expectTypeOf<ButtonProps>().not.toHaveProperty("dangerouslySetInnerHTML");
  });

  it("lets an active click reach a surrounding click handler", async () => {
    const onRowClick = vi.fn();
    const clickableRow = { onClick: onRowClick };
    const screen = await render(
      <div {...clickableRow}>
        <Button>Save</Button>
      </div>,
    );

    await screen.getByRole("button", { name: "Save" }).click();

    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it.each([
    ["loading", { loading: true }],
    ["aria-disabled", { "aria-disabled": true }],
  ])(
    "keeps a click from reaching a surrounding click handler while %s",
    async (_state, props) => {
      const onRowClick = vi.fn();
      const clickableRow = { onClick: onRowClick };
      const screen = await render(
        <div {...clickableRow}>
          <Button {...props}>Save</Button>
        </div>,
      );

      await screen.getByRole("button", { name: "Save" }).click({ force: true });
      await userEvent.keyboard("{Enter}");

      expect(onRowClick).not.toHaveBeenCalled();
    },
  );

  describe("disabled", () => {
    it("ignores activation and cannot be focused", async () => {
      const onClick = vi.fn();
      const screen = await render(
        <Button disabled onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Save" });

      await button.click({ force: true });
      await userEvent.tab();

      expect(onClick).not.toHaveBeenCalled();
      await expect.element(button).toBeDisabled();
      await expect.element(button).not.toHaveFocus();
    });
  });

  describe("loading", () => {
    it("ignores activation by pointer and by keyboard", async () => {
      const onClick = vi.fn();
      const screen = await render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );

      await screen.getByRole("button", { name: "Save" }).click({ force: true });
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");

      expect(onClick).not.toHaveBeenCalled();
    });

    it("stays focusable and keeps focus when it starts loading", async () => {
      const screen = await render(<Button>Save</Button>);
      const button = screen.getByRole("button", { name: "Save" });
      await button.click();
      await expect.element(button).toHaveFocus();

      await screen.rerender(<Button loading>Save</Button>);

      await expect.element(button).toHaveFocus();
      await expect.element(button).not.toHaveAttribute("disabled");
      await expect.element(button).toHaveAttribute("aria-disabled", "true");
    });

    it("keeps its accessible name and its size while the spinner shows", async () => {
      const screen = await render(<Button>Save changes</Button>);
      const button = screen.getByRole("button", { name: "Save changes" });
      const idleSize = size(button.element());

      await screen.rerender(<Button loading>Save changes</Button>);

      await expect.element(button).toHaveAttribute("data-loading", "true");
      expect(size(button.element())).toEqual(idleSize);
    });

    it("announces the default loading message once", async () => {
      await render(<Button loading>Save</Button>);

      await expect.poll(() => announcements()).toEqual(["Loading"]);
    });

    it("announces once under strict mode", async () => {
      await render(
        <StrictMode>
          <Button loading>Save</Button>
        </StrictMode>,
      );

      await expect.poll(() => announcements()).toEqual(["Loading"]);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(announcements()).toEqual(["Loading"]);
    });

    it("does not announce when it stops loading straight away", async () => {
      const screen = await render(<Button loading>Save</Button>);

      await screen.rerender(<Button>Save</Button>);
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(announcements()).toEqual([]);
    });

    it("keeps its name and describes itself with the loading message", async () => {
      const screen = await render(
        <>
          <Button loading loadingLabel="Saving" aria-describedby="hint">
            Save
          </Button>
          <p id="hint">Stores the draft.</p>
        </>,
      );
      const button = screen.getByRole("button", { name: "Save", exact: true });

      await expect
        .element(button)
        .toHaveAccessibleDescription("Stores the draft. Saving");

      await screen.rerender(
        <>
          <Button aria-describedby="hint">Save</Button>
          <p id="hint">Stores the draft.</p>
        </>,
      );
      await expect
        .element(button)
        .toHaveAccessibleDescription("Stores the draft.");
    });

    it("says its status inside an open modal dialog", async () => {
      const screen = await render(
        <dialog aria-label="Confirm">
          <Button>Save</Button>
        </dialog>,
      );
      const dialog = document.querySelector("dialog");
      dialog?.showModal();

      await screen.rerender(
        <dialog aria-label="Confirm">
          <Button loading>Save</Button>
        </dialog>,
      );

      await expect.poll(() => announcements()).toEqual(["Loading"]);
      expect(dialog?.querySelector("[data-dusty-announcer]")).not.toBeNull();
      dialog?.close();
    });

    it("runs none of the consumer's activation handlers while unavailable", async () => {
      const handler = vi.fn();
      const screen = await render(
        <Button
          aria-disabled
          onClick={handler}
          onKeyDown={handler}
          onPointerDown={handler}
          onMouseDown={handler}
          onDoubleClick={handler}
        >
          Save
        </Button>,
      );

      await screen.getByRole("button").click({ force: true });
      await screen.getByRole("button").dblClick({ force: true });
      await userEvent.keyboard("{Enter}");

      expect(handler).not.toHaveBeenCalled();
    });

    it("announces a custom loading message", async () => {
      await render(
        <Button loading loadingLabel="Saving your changes">
          Save
        </Button>,
      );

      await expect.poll(() => announcements()).toEqual(["Saving your changes"]);
    });

    it("announces nothing when it is not loading", async () => {
      await render(<Button>Save</Button>);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(announcements()).toEqual([]);
    });

    it("does not submit its form by click or by Enter in a field", async () => {
      const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
      const screen = await render(
        <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
          <label htmlFor="name">Name</label>
          <input id="name" />
          <Button type="submit" loading>
            Save
          </Button>
        </form>,
      );

      await screen.getByRole("button", { name: "Save" }).click({ force: true });
      await screen.getByRole("textbox", { name: "Name" }).fill("Wiola");
      await userEvent.keyboard("{Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("becomes active again when loading ends", async () => {
      const onClick = vi.fn();
      const screen = await render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Save" });

      await screen.rerender(<Button onClick={onClick}>Save</Button>);
      await button.click();

      expect(onClick).toHaveBeenCalledOnce();
      await expect.element(button).not.toHaveAttribute("aria-disabled");
    });
  });

  describe("aria-disabled", () => {
    it("ignores activation but stays focusable", async () => {
      const onClick = vi.fn();
      const screen = await render(
        <Button aria-disabled onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Save" });

      await button.click({ force: true });
      await userEvent.keyboard("{Enter}");

      expect(onClick).not.toHaveBeenCalled();
      await expect.element(button).toHaveFocus();
    });
  });

  describe("variants", () => {
    it("outlines a secondary button in the text colour", async () => {
      const screen = await render(
        <Button variant="secondary">Learn more</Button>,
      );
      const style = getComputedStyle(screen.getByRole("button").element());

      expect(style.borderTopColor).toBe(style.color);
      expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    it("shows a plain button as underlined text with no box", async () => {
      const screen = await render(<Button variant="plain">Cancel</Button>);
      const button = screen.getByRole("button", { name: "Cancel" }).element();
      const style = getComputedStyle(button);
      const label = getComputedStyle(button.firstElementChild ?? button);

      expect(style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
      expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(label.textDecorationLine).toBe("underline");
      expect(button).toHaveAttribute("data-variant", "plain");
    });

    it("keeps a plain button as tall as the others", async () => {
      const screen = await render(
        <>
          <Button>Save</Button>
          <Button variant="plain">Cancel</Button>
        </>,
      );

      expect(
        size(screen.getByRole("button", { name: "Cancel" }).element())[1],
      ).toBe(size(screen.getByRole("button", { name: "Save" }).element())[1]);
    });
  });

  describe("icon", () => {
    it("hides the icon from assistive technology and keeps the name", async () => {
      const screen = await render(<Button icon="→">Learn more</Button>);
      const button = screen.getByRole("button", { name: "Learn more" });

      await expect.element(button).toBeVisible();
      await expect
        .element(screen.getByText("→"))
        .toHaveAttribute("aria-hidden", "true");
    });

    it("places the icon before the text by default and after it at the end", async () => {
      const screen = await render(
        <>
          <Button icon="←">Back</Button>
          <Button icon="→" iconPosition="end">
            Next
          </Button>
        </>,
      );
      const before = screen.getByText("←").element().getBoundingClientRect();
      const after = screen.getByText("→").element().getBoundingClientRect();
      const back = screen.getByRole("button", { name: "Back" }).element();
      const next = screen.getByRole("button", { name: "Next" }).element();

      expect(before.left - back.getBoundingClientRect().left).toBeLessThan(
        back.getBoundingClientRect().right - before.right,
      );
      expect(next.getBoundingClientRect().right - after.right).toBeLessThan(
        after.left - next.getBoundingClientRect().left,
      );
    });

    it("renders no icon wrapper without an icon", async () => {
      const screen = await render(<Button>Save</Button>);

      expect(
        screen.getByRole("button").element().querySelector("[aria-hidden]"),
      ).toBeNull();
    });

    it("does not make the button taller", async () => {
      const screen = await render(
        <>
          <Button>Save</Button>
          <Button icon="→">Next</Button>
        </>,
      );

      expect(
        size(screen.getByRole("button", { name: "Next" }).element())[1],
      ).toBe(size(screen.getByRole("button", { name: "Save" }).element())[1]);
    });

    it("hides the icon with the text while loading", async () => {
      const screen = await render(
        <Button icon="→" loading>
          Next
        </Button>,
      );
      const label = screen.getByText("→").element().parentElement;

      expect(label && getComputedStyle(label).opacity).toBe("0");
    });
  });

  it("is rounded unless asked to be a pill", async () => {
    const screen = await render(
      <>
        <Button>Rounded</Button>
        <Button shape="pill">Pill</Button>
      </>,
    );
    const radius = (name: string) =>
      Number.parseFloat(
        getComputedStyle(screen.getByRole("button", { name }).element())
          .borderTopLeftRadius,
      );

    expect(radius("Pill")).toBeGreaterThan(radius("Rounded") * 10);
  });
});
