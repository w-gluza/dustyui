import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { RecordSleeve, type RecordSleeveProps } from "../index.js";

const TRACKS = [
  { title: "Dawn Static", duration: "3:42" },
  { title: "Soft Transit", duration: "4:15" },
  { title: "Glass Fields", duration: "5:08" },
] as const;

function Sleeve(props: Partial<RecordSleeveProps>) {
  return (
    <RecordSleeve
      title="Helios"
      artist="Maya Chen"
      level={2}
      meta="2026 - Ambient - 38 min"
      artwork={<svg data-testid="artwork" viewBox="0 0 10 10" />}
      tracks={TRACKS}
      defaultExpanded
      {...(props as object)}
    />
  );
}

describe("RecordSleeve", () => {
  it("shows the cover, title, artist and meta while closed", async () => {
    const screen = await render(<Sleeve defaultExpanded={false} />);

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Helios" }))
      .toBeVisible();
    await expect.element(screen.getByText("Maya Chen")).toBeVisible();
    await expect
      .element(screen.getByText("2026 - Ambient - 38 min"))
      .toBeVisible();
    await expect.element(screen.getByTestId("artwork")).toBeVisible();
    expect(screen.getByRole("list").elements()).toHaveLength(0);
  });

  it("opens into a dialog with the track list", async () => {
    const screen = await render(<Sleeve defaultExpanded={false} />);

    await screen.getByRole("button", { name: "Helios" }).click();
    const dialog = screen.getByRole("dialog", { name: "Helios" });

    await expect.element(dialog).toBeVisible();
    await expect
      .element(dialog.getByRole("list", { name: "Tracks" }))
      .toBeVisible();
    expect(dialog.getByRole("listitem").elements()).toHaveLength(3);
    await expect
      .element(dialog.getByRole("button", { name: /Dawn Static/u }))
      .toHaveAttribute("aria-current", "true");
  });

  it("toggles between play and pause and reports it", async () => {
    const onPlayingChange = vi.fn();
    const screen = await render(<Sleeve onPlayingChange={onPlayingChange} />);

    await screen.getByRole("button", { name: "Play", exact: true }).click();
    await expect
      .element(screen.getByRole("button", { name: "Pause", exact: true }))
      .toBeVisible();
    await screen.getByRole("button", { name: "Pause", exact: true }).click();

    expect(onPlayingChange.mock.calls).toEqual([[true], [false]]);
  });

  it("spins the record only while playing and hides it from assistive technology", async () => {
    const screen = await render(<Sleeve />);
    const vinyl = () => document.querySelector("dialog [data-playing]");

    expect(vinyl()).toBeNull();
    await screen.getByRole("button", { name: "Play", exact: true }).click();

    await expect.poll(vinyl).not.toBeNull();
    expect(vinyl()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("starts playing the track that is picked", async () => {
    const onCurrentTrackChange = vi.fn();
    const onPlayingChange = vi.fn();
    const screen = await render(
      <Sleeve
        onCurrentTrackChange={onCurrentTrackChange}
        onPlayingChange={onPlayingChange}
      />,
    );

    await screen.getByRole("button", { name: /Glass Fields/u }).click();

    await expect
      .element(screen.getByRole("button", { name: /Glass Fields/u }))
      .toHaveAttribute("aria-current", "true");
    expect(onCurrentTrackChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(onPlayingChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("steps between tracks and stops at both ends", async () => {
    const onCurrentTrackChange = vi.fn();
    const screen = await render(
      <Sleeve onCurrentTrackChange={onCurrentTrackChange} />,
    );
    const previous = screen.getByRole("button", { name: "Previous track" });
    const next = screen.getByRole("button", { name: "Next track" });

    await expect.element(previous).toHaveAttribute("aria-disabled", "true");
    await previous.click({ force: true });
    await next.click();
    await next.click();

    await expect.element(next).toHaveAttribute("aria-disabled", "true");
    await next.click({ force: true });
    expect(onCurrentTrackChange.mock.calls).toEqual([[1], [2]]);
  });

  it("stays on the track and state its owner sets", async () => {
    const onCurrentTrackChange = vi.fn();
    const screen = await render(
      <Sleeve
        playing
        currentTrack={1}
        onCurrentTrackChange={onCurrentTrackChange}
      />,
    );

    await screen.getByRole("button", { name: /Glass Fields/u }).click();

    expect(onCurrentTrackChange).toHaveBeenCalledExactlyOnceWith(2);
    await expect
      .element(screen.getByRole("button", { name: /Soft Transit/u }))
      .toHaveAttribute("aria-current", "true");
    await expect
      .element(screen.getByRole("button", { name: "Pause", exact: true }))
      .toBeVisible();
  });

  it("shows progress only when given, clamped to the bar", async () => {
    const screen = await render(<Sleeve progress={1.4} />);
    const bar = screen.getByRole("progressbar", { name: "Track progress" });

    await expect.element(bar).toBeVisible();
    expect((bar.element() as HTMLProgressElement).value).toBe(1);
  });

  it("renders no progress bar without a value and no player without tracks", async () => {
    const screen = await render(
      <Sleeve tracks={[]} note={<p>Liner note</p>} />,
    );

    expect(screen.getByRole("progressbar").elements()).toHaveLength(0);
    expect(screen.getByRole("list").elements()).toHaveLength(0);
    await expect.element(screen.getByText("Liner note")).toBeVisible();
  });

  it("takes translated labels", async () => {
    const screen = await render(
      <Sleeve
        labels={{ play: "Odtwórz", tracks: "Utwory", close: "Zamknij" }}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Odtwórz" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("list", { name: "Utwory" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Zamknij" }))
      .toBeVisible();
  });

  it("slides the record out from behind the sleeve, the other way in right to left text", async () => {
    const screen = await render(
      <div dir="rtl">
        <Sleeve />
      </div>,
    );
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    const vinyl = document.querySelector("dialog [aria-hidden='true']");

    await expect
      .poll(() => getComputedStyle(vinyl as Element).translate)
      .toMatch(/^-55%/u);
  });
});
