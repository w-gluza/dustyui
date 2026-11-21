import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, userEvent } from "vitest/browser";
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

  it("keeps its list role explicit so the track position survives the unstyled markers", async () => {
    const screen = await render(
      <TrackList label="Tracks" tracks={TRACKS} onTrackSelect={() => {}} />,
    );

    await expect
      .element(screen.getByRole("list", { name: "Tracks" }))
      .toHaveAttribute("role", "list");
  });

  it("lists tracks as plain rows, with no buttons, when nothing can be picked", async () => {
    const screen = await render(
      <TrackList label="Tracks" tracks={TRACKS} currentTrack={1} />,
    );
    const list = screen.getByRole("list", { name: "Tracks" });
    const row = screen.getByText("Soft Transit").element().parentElement;

    expect(list.getByRole("listitem").elements()).toHaveLength(3);
    expect(screen.getByRole("button").elements()).toHaveLength(0);
    expect(row?.getAttribute("aria-current")).toBe("true");
    expect(getComputedStyle(row as Element).cursor).not.toBe("pointer");
    await userEvent.hover(screen.getByText("Dawn Static"));
    expect(
      getComputedStyle(
        screen.getByText("Dawn Static").element().parentElement as Element,
      ).backgroundColor,
    ).toBe("rgba(0, 0, 0, 0)");
  });

  it("draws nothing for an empty list", async () => {
    const screen = await render(
      <TrackList label="Tracks" tracks={[]} data-testid="list" />,
    );

    expect(
      screen.getByTestId("list").element().getBoundingClientRect().height,
    ).toBe(0);
  });

  it("marks the current track with a system-colour bar when colours are forced, without moving its text", async () => {
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        currentTrack={1}
        onTrackSelect={() => {}}
      />,
    );
    const current = screen.getByRole("button", { name: /Soft Transit/u });
    const other = screen.getByRole("button", { name: /Dawn Static/u });
    const edge = (row: typeof current) =>
      getComputedStyle(row.element()).borderInlineStartWidth;
    const titleStart = () =>
      screen.getByText("Soft Transit").element().getBoundingClientRect().left;
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    const before = titleStart();

    expect(edge(current)).toBe("0px");
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    try {
      expect(edge(current)).not.toBe("0px");
      expect(edge(other)).toBe("0px");
      expect(titleStart()).toBe(before);
    } finally {
      await session.send("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  it("keeps a long title and a three-digit number inside the row", async () => {
    const tracks = Array.from({ length: 100 }, (_, index) => ({
      id: String(index),
      title:
        index === 99
          ? "An_unbroken_title_that_is_far_too_long_for_one_narrow_row.flac"
          : `Track ${String(index + 1)}`,
      duration: "3:42",
    }));
    const screen = await render(
      <div style={{ inlineSize: "240px" }}>
        <TrackList label="Tracks" tracks={tracks} data-testid="list" />
      </div>,
    );
    const list = screen.getByTestId("list").element();
    const number = screen.getByText("100", { exact: true }).element();
    const title = screen.getByText(/An_unbroken/u).element();

    expect(list.scrollWidth).toBeLessThanOrEqual(240);
    expect(number.getBoundingClientRect().right).toBeLessThanOrEqual(
      title.getBoundingClientRect().left,
    );
  });

  it("keeps a role its consumer asks for", async () => {
    const screen = await render(
      <TrackList
        label="Tracks"
        tracks={TRACKS}
        role="none"
        data-testid="list"
      />,
    );

    await expect
      .element(screen.getByTestId("list"))
      .toHaveAttribute("role", "none");
  });
});
