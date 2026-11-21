import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { PlaybackControls } from "../index.js";

describe("PlaybackControls", () => {
  it("toggles between play and pause and reports it", async () => {
    const onPlayingChange = vi.fn();
    const screen = await render(
      <PlaybackControls onPlayingChange={onPlayingChange} />,
    );

    await screen.getByRole("button", { name: "Play", exact: true }).click();
    await expect
      .element(screen.getByRole("button", { name: "Pause", exact: true }))
      .toBeVisible();
    await screen.getByRole("button", { name: "Pause", exact: true }).click();

    expect(onPlayingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("starts playing when asked to", async () => {
    const screen = await render(<PlaybackControls defaultPlaying />);

    await expect
      .element(screen.getByRole("button", { name: "Pause", exact: true }))
      .toBeVisible();
  });

  it("stays as it is told when controlled, and only asks to change", async () => {
    const onPlayingChange = vi.fn();
    const screen = await render(
      <PlaybackControls playing={false} onPlayingChange={onPlayingChange} />,
    );

    await screen.getByRole("button", { name: "Play", exact: true }).click();

    expect(onPlayingChange).toHaveBeenCalledExactlyOnceWith(true);
    await expect
      .element(screen.getByRole("button", { name: "Play", exact: true }))
      .toBeVisible();
  });

  it("steps to the previous and next track", async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const screen = await render(
      <PlaybackControls onPrevious={onPrevious} onNext={onNext} />,
    );

    await screen.getByRole("button", { name: "Previous track" }).click();
    await screen.getByRole("button", { name: "Next track" }).click();
    await screen.getByRole("button", { name: "Next track" }).click();

    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("disables a step that has nowhere to go", async () => {
    const screen = await render(<PlaybackControls onNext={() => undefined} />);

    await expect
      .element(screen.getByRole("button", { name: "Previous track" }))
      .toHaveAttribute("aria-disabled", "true");
    await expect
      .element(screen.getByRole("button", { name: "Next track" }))
      .toHaveAttribute("aria-disabled", "false");
  });

  it("shows progress only when given, clamped to the bar", async () => {
    const screen = await render(
      <>
        <PlaybackControls progress={1.4} />
        <PlaybackControls labels={{ progress: "Other" }} />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Track progress" });

    expect((bar.element() as HTMLProgressElement).value).toBe(1);
    expect(screen.getByRole("progressbar").elements()).toHaveLength(1);
  });

  it("takes translated labels", async () => {
    const screen = await render(
      <PlaybackControls
        progress={0.5}
        labels={{ play: "Odtwórz", next: "Następny", progress: "Postęp" }}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Odtwórz" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Następny" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("progressbar", { name: "Postęp" }))
      .toBeVisible();
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <PlaybackControls className="mine" data-testid="controls" />,
    );

    await expect.element(screen.getByTestId("controls")).toHaveClass("mine");
  });

  it("draws the play button as a circle around its icon", async () => {
    const screen = await render(<PlaybackControls />);
    const button = screen.getByRole("button", { name: "Play" }).element();
    const box = button.getBoundingClientRect();

    expect(box.width).toBe(box.height);
    expect(
      Number.parseFloat(getComputedStyle(button).borderTopLeftRadius),
    ).toBeGreaterThanOrEqual(box.height / 2);
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("leaves out a step that is not there at all", async () => {
    const screen = await render(
      <PlaybackControls onPrevious={null} onNext={null} />,
    );

    expect(screen.getByRole("button").elements()).toHaveLength(1);
    await expect
      .element(screen.getByRole("button", { name: "Play" }))
      .toBeVisible();
  });

  it("words the progress as asked and shows the elapsed time and duration at its ends", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <PlaybackControls
          progress={0.35}
          progressValueLabel="1:18 of 3:42"
          elapsed="1:18"
          duration="3:42"
        />
      </div>,
    );
    const bar = screen.getByRole("progressbar", { name: "Track progress" });
    const elapsed = screen.getByText("1:18", { exact: true }).element();
    const duration = screen.getByText("3:42", { exact: true }).element();

    await expect.element(bar).toHaveAttribute("aria-valuetext", "1:18 of 3:42");
    expect(elapsed.getBoundingClientRect().left).toBeLessThan(
      duration.getBoundingClientRect().left,
    );
  });

  it("shows no times without a progress bar to put them on", async () => {
    const screen = await render(
      <PlaybackControls elapsed="1:18" duration="3:42" />,
    );

    expect(screen.getByText("1:18").elements()).toHaveLength(0);
  });

  it("keeps the transport order and the direction of progress when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={{ inlineSize: "320px" }}>
        <PlaybackControls
          progress={0.25}
          elapsed="1:18"
          duration="3:42"
          onPrevious={() => {}}
          onNext={() => {}}
          data-testid="player"
        />
      </div>,
    );
    const left = (name: string) =>
      screen.getByRole("button", { name }).element().getBoundingClientRect()
        .left;
    const player = screen.getByTestId("player").element();
    const fill = player.querySelector("progress + span > span") as Element;
    const track = fill.parentElement as Element;

    expect(left("Previous track")).toBeLessThan(left("Play"));
    expect(left("Play")).toBeLessThan(left("Next track"));
    expect(Math.round(fill.getBoundingClientRect().left)).toBe(
      Math.round(track.getBoundingClientRect().left) + 1,
    );
    expect(
      screen
        .getByText("1:18", { exact: true })
        .element()
        .getBoundingClientRect().left,
    ).toBeLessThan(
      screen
        .getByText("3:42", { exact: true })
        .element()
        .getBoundingClientRect().left,
    );
  });
});
