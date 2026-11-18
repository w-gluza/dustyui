import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { TempoDial } from "../index.js";

function pointer(
  dial: Element,
  type: string,
  [x, y]: [number, number],
  pointerId = 1,
) {
  const box = dial.getBoundingClientRect();
  dial.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      pointerId,
      clientX: box.left + box.width * x,
      clientY: box.top + box.height * y,
    }),
  );
}

function drag(dial: Element, from: [number, number], to: [number, number]) {
  const capture = vi
    .spyOn(dial, "setPointerCapture")
    .mockImplementation(() => {});
  try {
    pointer(dial, "pointerdown", from);
    pointer(dial, "pointermove", to);
    pointer(dial, "pointerup", to);
  } finally {
    capture.mockRestore();
  }
}

function Dial(props: { onValueChange?: (value: number) => void }) {
  return (
    <div style={{ inlineSize: "200px" }}>
      <TempoDial
        label="Tempo"
        unit="BPM"
        min={40}
        max={240}
        defaultValue={140}
        data-testid="dial"
        {...props}
      />
    </div>
  );
}

describe("TempoDial", () => {
  it("ignores a second pointer and stops when the active pointer loses capture", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Dial onValueChange={onValueChange} />);
    const dial = screen.getByTestId("dial").element();
    const capture = vi
      .spyOn(dial, "setPointerCapture")
      .mockImplementation(() => {});
    try {
      pointer(dial, "pointerdown", [0.5, 0.05]);
      pointer(dial, "pointerdown", [0.05, 0.5], 2);
      pointer(dial, "pointermove", [0.95, 0.5], 2);
      pointer(dial, "pointerup", [0.95, 0.5], 2);
      expect(onValueChange).not.toHaveBeenCalled();

      pointer(dial, "pointermove", [0.95, 0.5]);
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(200);

      pointer(dial, "lostpointercapture", [0.95, 0.5]);
      pointer(dial, "pointermove", [0.5, 0.95]);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    } finally {
      capture.mockRestore();
    }
  });

  it("is a named slider that reads its value with the unit", async () => {
    const screen = await render(<Dial />);
    const slider = screen.getByRole("slider", { name: "Tempo" });

    await expect.element(slider).toHaveValue("140");
    await expect.element(slider).toHaveAttribute("aria-valuetext", "140 BPM");
    await expect.element(slider).toHaveAttribute("min", "40");
    await expect.element(slider).toHaveAttribute("max", "240");
    await expect.element(screen.getByText("140")).toBeVisible();
    await expect.element(screen.getByText("BPM")).toBeVisible();
  });

  it("changes by one step from the keyboard and stops at the ends", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Dial onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");

    await userEvent.tab();
    await expect.element(slider).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowDown}");
    await expect.element(slider).toHaveValue("141");
    await userEvent.keyboard("{End}");
    await expect.element(slider).toHaveValue("240");
    await userEvent.keyboard("{ArrowUp}");

    expect(onValueChange.mock.calls).toEqual([[141], [142], [141], [240]]);
  });

  it("shows a focus ring on the dial while its slider has keyboard focus", async () => {
    const screen = await render(<Dial />);
    const dial = screen.getByTestId("dial").element();

    expect(getComputedStyle(dial).outlineStyle).toBe("none");
    await userEvent.tab();

    expect(getComputedStyle(dial).outlineStyle).toBe("solid");
  });

  it("turns with a drag around the ring", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Dial onValueChange={onValueChange} />);
    const dial = screen.getByTestId("dial").element();

    drag(dial, [0.5, 0.05], [0.95, 0.5]);

    await expect.element(screen.getByRole("slider")).toHaveValue("200");
    expect(onValueChange).toHaveBeenLastCalledWith(200);
    await expect.element(screen.getByRole("slider")).toHaveFocus();
  });

  it("ignores a drag that starts in the middle", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Dial onValueChange={onValueChange} />);

    drag(screen.getByTestId("dial").element(), [0.5, 0.5], [0.95, 0.5]);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("stays as it is told when controlled, and only asks to change", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <TempoDial
        label="Tempo"
        min={40}
        max={240}
        value={100}
        onValueChange={onValueChange}
      />,
    );

    await userEvent.tab();
    await userEvent.keyboard("{ArrowUp}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(101);
    await expect.element(screen.getByRole("slider")).toHaveValue("100");
  });

  it("follows the value its owner keeps", async () => {
    function Owner() {
      const [value, setValue] = useState(60);
      return (
        <TempoDial
          label="Tempo"
          min={40}
          max={240}
          step={5}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    const screen = await render(<Owner />);

    await userEvent.tab();
    await userEvent.keyboard("{ArrowUp}");

    await expect.element(screen.getByRole("slider")).toHaveValue("65");
  });

  it("starts at the minimum, clamps a value out of range and words it as asked", async () => {
    const screen = await render(
      <>
        <TempoDial label="Low" min={40} max={240} />
        <TempoDial
          label="High"
          min={40}
          max={240}
          defaultValue={900}
          valueText={(value) => `${String(value)} beats per minute`}
        />
      </>,
    );

    await expect
      .element(screen.getByRole("slider", { name: "Low" }))
      .toHaveValue("40");
    await expect
      .element(screen.getByRole("slider", { name: "High" }))
      .toHaveAttribute("aria-valuetext", "240 beats per minute");
  });

  it("lights the ticks up to the marker", async () => {
    const screen = await render(<Dial />);
    const dial = screen.getByTestId("dial").element();
    const lit = () => dial.querySelectorAll("line[data-active]").length;
    const all = dial.querySelectorAll("line").length;

    expect(all).toBe(101);
    expect(lit()).toBe(51);
    await userEvent.tab();
    await userEvent.keyboard("{End}");

    await expect.poll(lit).toBe(all);
  });

  it.each([
    ["%", "0 %"],
    [undefined, "0"],
  ])("says a value of zero with a unit of %j as %j", async (unit, expected) => {
    const screen = await render(
      <TempoDial label="Volume" min={0} max={100} value={0} unit={unit} />,
    );

    await expect
      .element(screen.getByRole("slider", { name: "Volume" }))
      .toHaveAttribute("aria-valuetext", expected);
  });

  it.each([
    [[0.95, 0.5], 200],
    [[0.05, 0.5], 80],
    [[0.5, 0.05], 140],
    [[0.5, 0.95], 240],
  ] as const)(
    "sets the value where the ring is tapped at %j",
    async (spot, expected) => {
      const onValueChange = vi.fn();
      const screen = await render(<Dial onValueChange={onValueChange} />);

      drag(screen.getByTestId("dial").element(), [...spot], [...spot]);

      await expect
        .element(screen.getByRole("slider"))
        .toHaveValue(String(expected));
    },
  );

  it("ignores a tap in the middle", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Dial onValueChange={onValueChange} />);

    drag(screen.getByTestId("dial").element(), [0.5, 0.5], [0.5, 0.5]);

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
