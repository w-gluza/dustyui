import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { TrackList } from "../index.js";

const TRACKS = [
  { title: "Dawn Static", duration: "3:42" },
  { title: "Soft Transit", duration: "4:15" },
  { title: "Glass Fields", duration: "5:08" },
] as const;

describe("TrackList", () => {
  it("preserves focus across reorder when tracks have stable IDs", async () => {
    const tracks = TRACKS.map((track, index) => ({
      ...track,
      id: String(index),
    }));
    const onTrackSelect = vi.fn();
    const example = (items: typeof tracks) => (
      <TrackList label="Tracks" tracks={items} onTrackSelect={onTrackSelect} />
    );
    const screen = await render(example(tracks));
    const first = screen.getByRole("button", { name: /Dawn Static/u });
    await userEvent.tab();
    await expect.element(first).toHaveFocus();

    await screen.rerender(example([...tracks].reverse()));
    await expect.element(first).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onTrackSelect).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("is a named, ordered list with one button per track", async () => {
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        onTrackSelect={() => undefined}
      />,
    );
    const list = screen.getByRole("list", { name: "Tracks" });

    await expect.element(list).toBeVisible();
    expect(list.element().tagName).toBe("OL");
    expect(list.getByRole("listitem").elements()).toHaveLength(3);
    await expect
      .element(list.getByRole("button", { name: "Soft Transit 4:15" }))
      .toBeVisible();
  });

  it("marks only the current track", async () => {
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        currentTrack={1}
        onTrackSelect={() => undefined}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: /Soft Transit/u }))
      .toHaveAttribute("aria-current", "true");
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("marks nothing when no track is current", async () => {
    await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        onTrackSelect={() => undefined}
      />,
    );

    expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
  });

  it("reports the picked track by pointer and keyboard", async () => {
    const onTrackSelect = vi.fn();
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        onTrackSelect={onTrackSelect}
      />,
    );

    await screen.getByRole("button", { name: /Glass Fields/u }).click();
    await userEvent.tab({ shift: true });
    await userEvent.keyboard("{Enter}");

    expect(onTrackSelect.mock.calls).toEqual([[2], [1]]);
  });

  it("keeps the track number out of the accessible name", async () => {
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        onTrackSelect={() => undefined}
      />,
    );

    await expect
      .element(
        screen.getByRole("button", { name: "Dawn Static 3:42", exact: true }),
      )
      .toBeVisible();
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        onTrackSelect={() => undefined}
        className="mine"
        data-testid="tracks"
      />,
    );

    await expect.element(screen.getByTestId("tracks")).toHaveClass("mine");
  });
});
