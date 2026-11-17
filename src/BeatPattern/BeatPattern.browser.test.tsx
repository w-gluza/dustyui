import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { BeatPattern, nextBeatKind, type BeatKind } from "../index.js";

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
});
