import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
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
});
