import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button } from "../index.js";
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
});
