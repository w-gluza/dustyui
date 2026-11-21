import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, userEvent } from "vitest/browser";
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

  it("keeps focus on the slider after a real mouse press on the ring", async () => {
    const screen = await render(<Dial />);
    const slider = screen.getByRole("slider");

    await userEvent.click(screen.getByTestId("dial"), {
      position: { x: 190, y: 100 },
    });

    await expect.element(slider).toHaveValue("200");
    await expect.element(slider).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect.element(slider).toHaveValue("201");
  });

  it("hands the dial element to a consumer ref", async () => {
    const ref = { current: null as HTMLDivElement | null };
    const screen = await render(
      <TempoDial
        ref={ref}
        label="Tempo"
        min={40}
        max={240}
        data-testid="dial"
      />,
    );

    expect(ref.current).toBe(screen.getByTestId("dial").element());
  });

  it("runs a consumer's pointer handlers and stands back when one prevents the default", async () => {
    const onValueChange = vi.fn();
    const onPointerDown = vi.fn();
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <TempoDial
          label="Tempo"
          min={40}
          max={240}
          defaultValue={140}
          data-testid="dial"
          onValueChange={onValueChange}
          onPointerDown={onPointerDown}
          onPointerMove={(event) => {
            event.preventDefault();
          }}
        />
      </div>,
    );

    drag(screen.getByTestId("dial").element(), [0.5, 0.05], [0.95, 0.5]);

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onValueChange).not.toHaveBeenCalledWith(200);
  });

  it("stretches the slider over the whole dial for touch screen readers", async () => {
    const screen = await render(<Dial />);
    const dial = screen.getByTestId("dial").element().getBoundingClientRect();
    const slider = screen.getByRole("slider").element();
    const box = slider.getBoundingClientRect();

    expect([box.left, box.top, box.width, box.height]).toEqual([
      dial.left,
      dial.top,
      dial.width,
      dial.height,
    ]);
    expect(getComputedStyle(slider).opacity).toBe("0");
    expect(getComputedStyle(slider).pointerEvents).toBe("none");
  });

  it("shows fractional steps without floating-point noise", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <TempoDial
          label="Gain"
          min={0}
          max={1}
          step={0.1}
          defaultValue={0.1}
          data-testid="dial"
          onValueChange={onValueChange}
        />
      </div>,
    );
    const slider = screen.getByRole("slider");

    await userEvent.tab();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    await expect.element(slider).toHaveAttribute("aria-valuetext", "0.3");
    await expect
      .element(screen.getByText("0.3", { exact: true }))
      .toBeVisible();

    drag(screen.getByTestId("dial").element(), [0.5, 0.05], [0.72, 0.1]);

    for (const [value] of onValueChange.mock.calls as [number][]) {
      expect(String(value).length).toBeLessThanOrEqual(3);
    }
  });

  it("shows the same snapped value on screen and in the slider when given one off the step", async () => {
    const screen = await render(
      <>
        <TempoDial
          label="Tempo"
          min={40}
          max={240}
          step={5}
          defaultValue={62}
        />
        <TempoDial label="Top" min={0} max={103} step={5} defaultValue={103} />
        <TempoDial label="Odd" min={40} max={240} defaultValue={Number.NaN} />
      </>,
    );
    const tempo = screen.getByRole("slider", { name: "Tempo" });
    const top = screen.getByRole("slider", { name: "Top" });

    await expect.element(tempo).toHaveValue("60");
    await expect.element(tempo).toHaveAttribute("aria-valuetext", "60");
    await expect.element(screen.getByText("60", { exact: true })).toBeVisible();
    await expect.element(top).toHaveValue("100");
    await expect.element(top).toHaveAttribute("aria-valuetext", "100");
    await expect
      .element(screen.getByRole("slider", { name: "Odd" }))
      .toHaveAttribute("aria-valuetext", "40");
  });

  it("holds a single value when the range is empty", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <TempoDial
          label="Fixed"
          min={5}
          max={5}
          data-testid="dial"
          onValueChange={onValueChange}
        />
      </div>,
    );

    drag(screen.getByTestId("dial").element(), [0.5, 0.05], [0.95, 0.5]);

    await expect
      .element(screen.getByRole("slider"))
      .toHaveAttribute("aria-valuetext", "5");
    expect(onValueChange.mock.calls.every(([value]) => value === 5)).toBe(true);
  });

  it("describes the slider, not the wrapper", async () => {
    const screen = await render(
      <>
        <p id="hint">Drag the ring or use the arrow keys</p>
        <TempoDial
          label="Tempo"
          min={40}
          max={240}
          aria-describedby="hint"
          data-testid="dial"
        />
      </>,
    );

    await expect
      .element(screen.getByRole("slider"))
      .toHaveAccessibleDescription("Drag the ring or use the arrow keys");
    expect(
      screen.getByTestId("dial").element().hasAttribute("aria-describedby"),
    ).toBe(false);
  });

  it("draws every tick in a system colour when colours are forced", async () => {
    const screen = await render(<Dial />);
    const tick = screen
      .getByTestId("dial")
      .element()
      .querySelector("line:not([data-active])") as Element;
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    const before = getComputedStyle(tick).stroke;

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    try {
      expect(getComputedStyle(tick).stroke).not.toBe(before);
    } finally {
      await session.send("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  it("ends the gesture even when a consumer cancels its end, so the next press still works", async () => {
    const onValueChange = vi.fn();
    const veto = (event: { preventDefault: () => void }) => {
      event.preventDefault();
    };
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <TempoDial
          label="Tempo"
          min={40}
          max={240}
          defaultValue={140}
          data-testid="dial"
          onValueChange={onValueChange}
          onPointerUp={veto}
          onPointerCancel={veto}
          onLostPointerCapture={veto}
        />
      </div>,
    );
    const dial = screen.getByTestId("dial").element();

    drag(dial, [0.95, 0.5], [0.95, 0.5]);
    expect(onValueChange).not.toHaveBeenCalled();

    drag(dial, [0.5, 0.05], [0.95, 0.5]);
    expect(onValueChange).toHaveBeenLastCalledWith(200);
  });

  it("lets a touch scroll the page from the centre, where a drag does nothing, and keeps the ring for dragging", async () => {
    const screen = await render(
      <div style={{ inlineSize: "300px" }}>
        <TempoDial label="Tempo" min={40} max={240} data-testid="dial" />
      </div>,
    );
    const box = screen.getByTestId("dial").element().getBoundingClientRect();
    const blocksTouch = (x: number, y: number) => {
      for (
        let element = document.elementFromPoint(box.left + x, box.top + y);
        element;
        element = element.parentElement
      ) {
        if (getComputedStyle(element).touchAction === "none") {
          return true;
        }
      }
      return false;
    };

    expect(blocksTouch(150, 150)).toBe(false);
    expect(blocksTouch(150, 100)).toBe(false);
    expect(blocksTouch(150, 80)).toBe(true);
    expect(blocksTouch(150, 10)).toBe(true);
    expect(blocksTouch(20, 150)).toBe(true);
  });
});
