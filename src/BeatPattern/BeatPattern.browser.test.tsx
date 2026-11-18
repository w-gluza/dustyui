import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, userEvent } from "vitest/browser";
import { BeatPattern, nextBeatKind, type BeatKind } from "../index.js";
import { announcements, resetAnnouncer } from "../test/announcements.js";

const BEATS = ["accent", "normal", "skipped", "normal"] as const;

describe("BeatPattern", () => {
  it("is a named list with one button per beat, each saying its kind", async () => {
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
      />,
    );
    const list = screen.getByRole("list", { name: "Beats" });

    expect(list.getByRole("listitem").elements()).toHaveLength(4);
    await expect
      .element(screen.getByRole("button", { name: "Beat 1, accent" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Beat 3, skipped" }))
      .toBeVisible();
  });

  it("cycles normal, accent, skipped and back", () => {
    expect(nextBeatKind("normal")).toBe("accent");
    expect(nextBeatKind("accent")).toBe("skipped");
    expect(nextBeatKind("skipped")).toBe("normal");
  });

  it("asks for the next kind of the beat that is pressed, by pointer and keyboard", async () => {
    const onBeatChange = vi.fn();
    const screen = await render(
      <BeatPattern label="Beats" beats={BEATS} onBeatChange={onBeatChange} />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(onBeatChange.mock.calls).toEqual([
      [1, "accent"],
      [2, "normal"],
    ]);
  });

  it("follows the beats its owner keeps", async () => {
    function Owner() {
      const [beats, setBeats] = useState<readonly BeatKind[]>(BEATS);
      return (
        <BeatPattern
          label="Beats"
          beats={beats}
          onBeatChange={(index, kind) => {
            setBeats(beats.map((beat, i) => (i === index ? kind : beat)));
          }}
        />
      );
    }
    const screen = await render(<Owner />);

    await screen.getByRole("button", { name: "Beat 1, accent" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Beat 1, skipped" }))
      .toBeVisible();
  });

  it("shows the accent mark only on accented beats", async () => {
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
      />,
    );
    const markOf = (name: string) =>
      getComputedStyle(
        screen.getByRole("button", { name }).element()
          .firstElementChild as Element,
      ).visibility;

    expect(markOf("Beat 1, accent")).toBe("visible");
    expect(markOf("Beat 2, normal")).toBe("hidden");
  });

  it("marks only the beat that is playing", async () => {
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        playingBeat={2}
        onBeatChange={() => undefined}
      />,
    );

    const playing = document.querySelectorAll("[data-playing]");
    expect(playing).toHaveLength(1);
    expect(playing[0]).toBe(
      screen.getByRole("button", { name: "Beat 3, skipped" }).element(),
    );
  });

  it("takes translated beat names", async () => {
    const screen = await render(
      <BeatPattern
        label="Takty"
        beats={["accent"]}
        beatLabel={(beat) => `Uderzenie ${String(beat)}`}
        onBeatChange={() => undefined}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Uderzenie 1" }))
      .toBeVisible();
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
        className="mine"
        data-testid="pattern"
      />,
    );

    await expect.element(screen.getByTestId("pattern")).toHaveClass("mine");
  });

  it("announces the new kind of a beat after it is pressed", async () => {
    resetAnnouncer();
    function Owner() {
      const [beats, setBeats] = useState<readonly BeatKind[]>(BEATS);

      return (
        <BeatPattern
          label="Beats"
          beats={beats}
          onBeatChange={(index, kind) => {
            setBeats(beats.map((beat, i) => (i === index ? kind : beat)));
          }}
        />
      );
    }
    const screen = await render(<Owner />);

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();

    await expect.poll(() => announcements()).toEqual(["Beat 2, accent"]);
  });

  it("keeps the list role that a list without markers loses in Safari", async () => {
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
      />,
    );

    await expect
      .element(screen.getByRole("list", { name: "Beats" }))
      .toHaveAttribute("role", "list");
  });

  it("keeps the beats in columns when the pattern wraps", async () => {
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <BeatPattern
          label="Beats"
          beats={[...BEATS, ...BEATS, "normal"]}
          onBeatChange={() => undefined}
        />
      </div>,
    );
    const boxes = screen
      .getByRole("button")
      .elements()
      .map((beat) => beat.getBoundingClientRect());
    const firstRow = boxes.filter((box) => box.top === boxes[0]?.top);
    const last = boxes.at(-1);

    expect(firstRow.length).toBeLessThan(boxes.length);
    expect(firstRow.map((box) => box.left)).toContain(last?.left);
  });

  it("draws the playing mark in the text colour, thicker than a hairline", async () => {
    const screen = await render(
      <>
        <BeatPattern
          label="Beats"
          beats={BEATS}
          playingBeat={1}
          onBeatChange={() => undefined}
        />
        <span data-testid="text" style={{ color: "var(--dusty-text)" }} />
      </>,
    );
    const button = screen.getByRole("button", { name: "Beat 2, normal" });
    const mark = button.element().lastElementChild as Element;

    expect(getComputedStyle(mark).backgroundColor).toBe(
      getComputedStyle(screen.getByTestId("text").element()).color,
    );
    expect(mark.getBoundingClientRect().height).toBe(3);
  });

  it("tells a normal beat from a skipped one in forced colours", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
      />,
    );
    const fill = (name: string) =>
      getComputedStyle(
        screen.getByRole("button", { name }).element().children[1] as Element,
      ).backgroundColor;
    const normal = fill("Beat 2, normal");
    const skipped = fill("Beat 3, skipped");
    await session.send("Emulation.setEmulatedMedia", { features: [] });

    expect(matchMedia("(forced-colors: active)").matches).toBe(false);
    expect(normal).not.toBe(skipped);
  });
});
