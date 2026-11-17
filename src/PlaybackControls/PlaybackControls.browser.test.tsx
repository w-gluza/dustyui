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

  it("rounds the play button into a pill", async () => {
    const screen = await render(<PlaybackControls />);
    const button = screen.getByRole("button", { name: "Play" }).element();

    expect(
      Number.parseFloat(getComputedStyle(button).borderTopLeftRadius),
    ).toBeGreaterThanOrEqual(button.getBoundingClientRect().height / 2);
  });
});
