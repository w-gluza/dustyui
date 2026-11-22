import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { pressedStyle } from "../test/pressedStyle.js";
import { cdp, userEvent } from "vitest/browser";
import { RadioGroup } from "../index.js";

const METERS = [
  { value: "3/4", label: "3/4" },
  { value: "4/4", label: "4/4" },
  { value: "6/8", label: "6/8" },
] as const;

describe("RadioGroup", () => {
  it.each([false, true])(
    "submits the named value when outside the form is %s",
    async (outside) => {
      const group = (
        <RadioGroup
          legend="Time signature"
          options={METERS}
          defaultValue="4/4"
          name="meter"
          form={outside ? "meter-form" : undefined}
        />
      );
      await render(
        <>
          <form id="meter-form">{outside ? null : group}</form>
          {outside ? group : null}
        </>,
      );

      const form = document.querySelector<HTMLFormElement>("#meter-form")!;
      expect(new FormData(form).get("meter")).toBe("4/4");
    },
  );

  it("is a named group of radios with the chosen one checked", async () => {
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={METERS}
        defaultValue="4/4"
      />,
    );
    const group = screen.getByRole("group", { name: "Time signature" });

    expect(group.getByRole("radio").elements()).toHaveLength(3);
    await expect
      .element(group.getByRole("radio", { name: "4/4" }))
      .toBeChecked();
    await expect
      .element(group.getByRole("radio", { name: "3/4" }))
      .not.toBeChecked();
  });

  it("starts with nothing chosen when given no value", async () => {
    const screen = await render(
      <RadioGroup legend="Time signature" options={METERS} />,
    );

    expect(
      screen
        .getByRole("radio")
        .elements()
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(0);
  });

  it("chooses the option whose row is pressed and reports it", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={METERS}
        defaultValue="4/4"
        onValueChange={onValueChange}
      />,
    );

    await screen.getByText("6/8").click();

    await expect
      .element(screen.getByRole("radio", { name: "6/8" }))
      .toBeChecked();
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("6/8");
  });

  it("is one tab stop and moves with the arrow keys", async () => {
    const screen = await render(
      <>
        <RadioGroup
          legend="Time signature"
          options={METERS}
          defaultValue="4/4"
        />
        <button type="button">After</button>
      </>,
    );

    await userEvent.tab();
    await expect
      .element(screen.getByRole("radio", { name: "4/4" }))
      .toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect
      .element(screen.getByRole("radio", { name: "6/8" }))
      .toBeChecked();
    await userEvent.tab();

    await expect
      .element(screen.getByRole("button", { name: "After" }))
      .toHaveFocus();
  });

  it("stays as it is told when controlled, and only asks to change", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={METERS}
        value="4/4"
        onValueChange={onValueChange}
      />,
    );

    await screen.getByText("3/4").click();

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("3/4");
    await expect
      .element(screen.getByRole("radio", { name: "4/4" }))
      .toBeChecked();
  });

  it("follows the value its owner keeps", async () => {
    function Owner() {
      const [value, setValue] = useState("4/4");
      return (
        <RadioGroup
          legend="Time signature"
          options={METERS}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    const screen = await render(<Owner />);

    await screen.getByText("3/4").click();

    await expect
      .element(screen.getByRole("radio", { name: "3/4" }))
      .toBeChecked();
  });

  it("keeps two groups on one page independent", async () => {
    const screen = await render(
      <>
        <RadioGroup legend="First" options={METERS} defaultValue="4/4" />
        <RadioGroup legend="Second" options={METERS} defaultValue="4/4" />
      </>,
    );
    const first = screen.getByRole("group", { name: "First" });
    const second = screen.getByRole("group", { name: "Second" });

    await second.getByText("3/4").click();

    await expect
      .element(first.getByRole("radio", { name: "4/4" }))
      .toBeChecked();
    await expect
      .element(second.getByRole("radio", { name: "3/4" }))
      .toBeChecked();
  });

  it("shows a tick only beside the chosen option", async () => {
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={METERS}
        defaultValue="4/4"
      />,
    );
    const tickOf = (name: string) =>
      getComputedStyle(
        screen
          .getByRole("radio", { name })
          .element()
          .parentElement?.querySelector("[aria-hidden]") as Element,
      ).visibility;

    expect(tickOf("4/4")).toBe("visible");
    expect(tickOf("3/4")).toBe("hidden");
  });

  it("can hide its legend from sight while keeping the group named", async () => {
    const screen = await render(
      <RadioGroup legend="Time signature" legendHidden options={METERS} />,
    );
    const legend = screen.getByText("Time signature").element();

    await expect
      .element(screen.getByRole("group", { name: "Time signature" }))
      .toBeVisible();
    expect(getComputedStyle(legend).clipPath).toBe("inset(50%)");
  });

  it("draws the same tick when the text runs right to left", async () => {
    const screen = await render(
      <>
        <RadioGroup
          legend="Left to right"
          options={METERS}
          defaultValue="4/4"
        />
        <div dir="rtl">
          <RadioGroup
            legend="Right to left"
            options={METERS}
            defaultValue="4/4"
          />
        </div>
      </>,
    );
    const tick = (legend: string) => {
      const style = getComputedStyle(
        screen
          .getByRole("group", { name: legend })
          .element()
          .querySelector("[aria-hidden]") as Element,
      );
      const drawnOnTheRight =
        Number.parseFloat(style.borderRightWidth) > 0 !==
        style.scale.startsWith("-1");

      return { drawnOnTheRight, rotate: style.rotate };
    };

    expect(tick("Right to left")).toEqual(tick("Left to right"));
    expect(tick("Left to right").drawnOnTheRight).toBe(true);
  });

  it("asks for a choice before its form can be submitted when required", async () => {
    const screen = await render(
      <form data-testid="form">
        <RadioGroup legend="Time signature" options={METERS} required />
      </form>,
    );
    const form = screen.getByTestId("form").element() as HTMLFormElement;

    expect(form.checkValidity()).toBe(false);
    await screen.getByText("6/8").click();
    expect(form.checkValidity()).toBe(true);
  });

  it("still asks for a choice when the chosen option is switched off", async () => {
    const options = [
      { value: "3/4", label: "3/4", disabled: true },
      { value: "4/4", label: "4/4" },
    ];
    const screen = await render(
      <form data-testid="form">
        <RadioGroup
          legend="Time signature"
          name="meter"
          options={options}
          defaultValue="3/4"
          required
        />
      </form>,
    );
    const form = screen.getByTestId("form").element() as HTMLFormElement;

    await expect
      .element(screen.getByRole("radio", { name: "3/4" }))
      .toBeChecked();
    expect(new FormData(form).has("meter")).toBe(false);
    expect(form.checkValidity()).toBe(false);

    await screen.getByText("4/4").click();
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).get("meter")).toBe("4/4");
  });

  it("looks and acts switched off when the whole group is disabled", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <>
        <RadioGroup legend="Live" options={METERS} defaultValue="4/4" />
        <RadioGroup
          legend="Off"
          options={METERS}
          defaultValue="4/4"
          disabled
          onValueChange={onValueChange}
        />
      </>,
    );
    const row = (legend: string) =>
      screen
        .getByRole("group", { name: legend })
        .getByText("3/4")
        .element()
        .closest("label") as Element;

    await userEvent.hover(row("Off"));
    const off = getComputedStyle(row("Off"));
    const live = getComputedStyle(row("Live"));

    expect(off.cursor).toBe("not-allowed");
    expect(off.backgroundColor).toBe(live.backgroundColor);
    expect(off.color).not.toBe(live.color);
    await userEvent.click(row("Off"), { force: true });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("switches off a single option and steps over it with the arrow keys", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={[
          { value: "3/4", label: "3/4" },
          { value: "4/4", label: "4/4", disabled: true },
          { value: "6/8", label: "6/8" },
        ]}
        defaultValue="3/4"
        onValueChange={onValueChange}
      />,
    );
    const rowOf = (name: string) =>
      screen.getByText(name).element().closest("label") as Element;

    await expect
      .element(screen.getByRole("radio", { name: "4/4" }))
      .toBeDisabled();
    expect(getComputedStyle(rowOf("4/4")).cursor).toBe("not-allowed");
    expect(getComputedStyle(rowOf("6/8")).cursor).toBe("pointer");
    await userEvent.click(rowOf("4/4"), { force: true });
    expect(onValueChange).not.toHaveBeenCalled();

    (
      screen.getByRole("radio", { name: "3/4" }).element() as HTMLElement
    ).focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("6/8");
  });

  it("rings the row whose radio has keyboard focus", async () => {
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={METERS}
        defaultValue="4/4"
      />,
    );
    const rowOf = (name: string) =>
      getComputedStyle(
        screen.getByText(name).element().closest("label") as Element,
      ).outlineStyle;

    expect(rowOf("4/4")).toBe("none");
    await userEvent.tab();

    expect(rowOf("4/4")).toBe("solid");
    expect(rowOf("3/4")).toBe("none");
  });

  it("draws the tick in a system colour, and greys a disabled row, when colours are forced", async () => {
    const screen = await render(
      <RadioGroup
        legend="Time signature"
        options={[
          { value: "3/4", label: "3/4" },
          { value: "4/4", label: "4/4", disabled: true },
        ]}
        defaultValue="3/4"
      />,
    );
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    const group = screen.getByRole("group").element();
    const tick = group.querySelector("[aria-hidden]") as Element;
    const rowOf = (name: string) =>
      getComputedStyle(
        screen.getByText(name).element().closest("label") as Element,
      ).color;
    const before = getComputedStyle(tick).borderBottomColor;

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    try {
      expect(getComputedStyle(tick).borderBottomColor).not.toBe(before);
      expect(rowOf("4/4")).not.toBe(rowOf("3/4"));
    } finally {
      await session.send("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  it("fills an option while it is pressed, unless it is disabled", async () => {
    const screen = await render(
      <RadioGroup
        legend="Sound"
        options={[
          { value: "on", label: "On" },
          { value: "off", label: "Off", disabled: true },
        ]}
      />,
    );
    const pressed = (name: string) =>
      pressedStyle(
        screen.getByText(name).element().closest("label") as Element,
        "background-color",
      );

    expect(pressed("On")).toBe("var(--dusty-surface-selected)");
    expect(pressed("Off")).toBe("");
  });
});
