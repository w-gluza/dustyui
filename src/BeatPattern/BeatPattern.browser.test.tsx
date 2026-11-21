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

  it("announces nothing when its owner refuses the change", async () => {
    resetAnnouncer();
    const onBeatChange = vi.fn();
    const screen = await render(
      <BeatPattern label="Beats" beats={BEATS} onBeatChange={onBeatChange} />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={[...BEATS]}
        onBeatChange={onBeatChange}
      />,
    );

    expect(onBeatChange).toHaveBeenCalledExactlyOnceWith(1, "accent");
    expect(announcements()).toEqual([]);
  });

  it("does not announce a refused change when a later update happens to match it", async () => {
    resetAnnouncer();
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
      />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={["accent", "accent", "skipped", "normal"]}
        onBeatChange={() => undefined}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Beat 2, accent" }))
      .toBeVisible();
    expect(announcements()).toEqual([]);
  });

  it("forgets a refused change once the beats change to something else", async () => {
    resetAnnouncer();
    const screen = await render(
      <BeatPattern
        label="Beats"
        beats={BEATS}
        onBeatChange={() => undefined}
      />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={["normal", "normal", "skipped", "normal"]}
        onBeatChange={() => undefined}
      />,
    );
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={["normal", "accent", "skipped", "normal"]}
        onBeatChange={() => undefined}
      />,
    );

    expect(announcements()).toEqual([]);
  });

  it("announces a change its owner accepts later, once the returned promise settles", async () => {
    resetAnnouncer();
    let accept: () => void = () => undefined;
    const saved = new Promise<void>((resolve) => {
      accept = resolve;
    });
    const onBeatChange = () => saved;
    const screen = await render(
      <BeatPattern label="Beats" beats={BEATS} onBeatChange={onBeatChange} />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(announcements()).toEqual([]);
    accept();
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={["accent", "accent", "skipped", "normal"]}
        onBeatChange={onBeatChange}
      />,
    );

    await expect.poll(() => announcements()).toEqual(["Beat 2, accent"]);
  });

  it("announces nothing when the returned promise is rejected, even if a later update matches", async () => {
    resetAnnouncer();
    const onBeatChange = () => Promise.reject(new Error("not saved"));
    const screen = await render(
      <BeatPattern label="Beats" beats={BEATS} onBeatChange={onBeatChange} />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={["accent", "accent", "skipped", "normal"]}
        onBeatChange={onBeatChange}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Beat 2, accent" }))
      .toBeVisible();
    expect(announcements()).toEqual([]);
  });

  it.each(["resolves", "rejects"] as const)(
    "waits for the returned promise when the beats already match, and it %s",
    async (outcome) => {
      resetAnnouncer();
      let accept: () => void = () => undefined;
      let refuse: (reason: Error) => void = () => undefined;
      const saved = new Promise<void>((resolve, reject) => {
        accept = resolve;
        refuse = reject;
      });
      const onBeatChange = () => saved;
      const screen = await render(
        <BeatPattern label="Beats" beats={BEATS} onBeatChange={onBeatChange} />,
      );

      await screen.getByRole("button", { name: "Beat 2, normal" }).click();
      await screen.rerender(
        <BeatPattern
          label="Beats"
          beats={["accent", "accent", "skipped", "normal"]}
          onBeatChange={onBeatChange}
        />,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
      expect(announcements()).toEqual([]);

      if (outcome === "resolves") {
        accept();
      } else {
        refuse(new Error("not saved"));
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      expect(announcements()).toEqual(
        outcome === "resolves" ? ["Beat 2, accent"] : [],
      );
    },
  );

  it("announces nothing when the promise resolves after the pattern is gone", async () => {
    resetAnnouncer();
    let accept: () => void = () => undefined;
    const saved = new Promise<void>((resolve) => {
      accept = resolve;
    });
    const onBeatChange = () => saved;
    const screen = await render(
      <BeatPattern label="Beats" beats={BEATS} onBeatChange={onBeatChange} />,
    );

    await screen.getByRole("button", { name: "Beat 2, normal" }).click();
    await screen.rerender(
      <BeatPattern
        label="Beats"
        beats={["accent", "accent", "skipped", "normal"]}
        onBeatChange={onBeatChange}
      />,
    );
    await screen.rerender(<p>Gone</p>);
    accept();
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    expect(announcements()).toEqual([]);
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

  it("lays the beats in one row inside a parent that centres its children", async () => {
    const screen = await render(
      <div
        style={{ display: "grid", justifyItems: "center", inlineSize: "320px" }}
      >
        <BeatPattern
          label="Beats"
          beats={BEATS}
          onBeatChange={() => undefined}
        />
      </div>,
    );
    const tops = screen
      .getByRole("button")
      .elements()
      .map((beat) => beat.getBoundingClientRect().top);

    expect(new Set(tops).size).toBe(1);
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

  it("shows a pattern for reading only when no change handler is given", async () => {
    const screen = await render(
      <>
        <BeatPattern label="Preset" beats={BEATS} playingBeat={1} />
        <BeatPattern
          label="Editable"
          beats={BEATS}
          onBeatChange={() => undefined}
        />
      </>,
    );
    const preset = screen.getByRole("list", { name: "Preset" });
    const beats = preset.getByRole("listitem").elements();
    const editable = screen
      .getByRole("button", { name: "Beat 1, accent" })
      .element();
    const shown = beats[0]?.firstElementChild as HTMLElement;

    expect(preset.getByRole("button").elements()).toHaveLength(0);
    expect(beats.map((beat) => beat.textContent.replace(">", ""))).toEqual([
      "Beat 1, accent",
      "Beat 2, normal",
      "Beat 3, skipped",
      "Beat 4, normal",
    ]);
    expect(getComputedStyle(shown).cursor).not.toBe("pointer");
    expect(shown.getBoundingClientRect().width).toBe(
      editable.getBoundingClientRect().width,
    );
    expect(shown.getBoundingClientRect().height).toBe(
      editable.getBoundingClientRect().height,
    );
    expect(shown.dataset.kind).toBe("accent");
    expect((beats[1]?.firstElementChild as HTMLElement).dataset.playing).toBe(
      "true",
    );
  });
});
