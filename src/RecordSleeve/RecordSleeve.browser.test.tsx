import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { cdp } from "vitest/browser";
import { RecordSleeve } from "../index.js";

const artwork = <svg data-testid="artwork" viewBox="0 0 10 10" />;

function vinylOf(root: Element): HTMLElement {
  const vinyl = root.querySelector<HTMLElement>("[aria-hidden='true']");

  if (!vinyl) {
    throw new Error("The sleeve holds no record");
  }
  return vinyl;
}

describe("RecordSleeve", () => {
  it("is a square cover with the record tucked away until revealed", async () => {
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <RecordSleeve artwork={artwork} data-testid="sleeve" />
      </div>,
    );
    const sleeve = screen.getByTestId("sleeve").element();
    const box = sleeve.getBoundingClientRect();

    await expect.element(screen.getByTestId("artwork")).toBeVisible();
    expect(box.width).toBe(200);
    expect(box.height).toBe(200);
    expect(getComputedStyle(vinylOf(sleeve)).visibility).toBe("hidden");
  });

  it("slides the record out past the sleeve when revealed", async () => {
    const screen = await render(
      <div style={{ inlineSize: "400px" }}>
        <RecordSleeve artwork={artwork} revealed data-testid="sleeve" />
      </div>,
    );
    const sleeve = screen.getByTestId("sleeve").element();
    const vinyl = vinylOf(sleeve);
    const cover = screen.getByTestId("artwork").element();

    expect(getComputedStyle(vinyl).visibility).toBe("visible");
    await expect.poll(() => getComputedStyle(vinyl).translate).toMatch(/^55%/u);
    await expect
      .poll(
        () =>
          vinyl.getBoundingClientRect().right -
          cover.getBoundingClientRect().right,
      )
      .toBeGreaterThan(50);
  });

  it("slides the other way when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <RecordSleeve artwork={artwork} revealed data-testid="sleeve" />
      </div>,
    );
    const vinyl = vinylOf(screen.getByTestId("sleeve").element());

    await expect
      .poll(() => getComputedStyle(vinyl).translate)
      .toMatch(/^-55%/u);
  });

  it("spins the record only while playing and revealed", async () => {
    const screen = await render(
      <>
        <RecordSleeve artwork={artwork} revealed data-testid="still" />
        <RecordSleeve
          artwork={artwork}
          revealed
          playing
          data-testid="playing"
        />
        <RecordSleeve artwork={artwork} playing data-testid="tucked" />
      </>,
    );
    const spinning = (id: string) =>
      vinylOf(screen.getByTestId(id).element()).hasAttribute("data-playing");

    expect(spinning("still")).toBe(false);
    expect(spinning("playing")).toBe(true);
    expect(spinning("tucked")).toBe(false);
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <RecordSleeve artwork={artwork} className="mine" data-testid="sleeve" />,
    );

    await expect.element(screen.getByTestId("sleeve")).toHaveClass("mine");
  });

  it("neither slides nor spins the record when motion is reduced", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    try {
      const screen = await render(
        <div style={{ inlineSize: "320px" }}>
          <RecordSleeve
            artwork={artwork}
            revealed
            playing
            data-testid="sleeve"
          />
        </div>,
      );
      const vinyl = vinylOf(screen.getByTestId("sleeve").element());

      expect(vinyl.getAnimations({ subtree: true })).toHaveLength(0);
      expect(getComputedStyle(vinyl).visibility).toBe("visible");
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "" }],
      });
    }
  });

  it.each([
    [
      "an image",
      <img
        key="a"
        alt=""
        data-testid="art"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 5'%3E%3C/svg%3E"
      />,
    ],
    [
      "a picture",
      <picture key="b" data-testid="art">
        <img
          alt=""
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 5'%3E%3C/svg%3E"
        />
      </picture>,
    ],
    [
      "a wrapped drawing",
      <div key="c" data-testid="art">
        <svg viewBox="0 0 10 10" />
      </div>,
    ],
  ])("fills the square cover with %s", async (_name, art) => {
    const screen = await render(
      <div style={{ inlineSize: "200px" }}>
        <RecordSleeve artwork={art} />
      </div>,
    );
    const box = screen.getByTestId("art").element().getBoundingClientRect();

    expect([box.width, box.height]).toEqual([200, 200]);
  });

  it("centres the sleeve and the record in the stage once the record has slid out", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    try {
      const screen = await render(
        <div style={{ inlineSize: "400px" }}>
          <RecordSleeve artwork={artwork} revealed data-testid="sleeve" />
        </div>,
      );
      const stage = screen.getByTestId("sleeve").element();
      const cover = screen.getByTestId("artwork").element();
      const startGap =
        cover.getBoundingClientRect().left - stage.getBoundingClientRect().left;
      const endGap =
        stage.getBoundingClientRect().right -
        vinylOf(stage).getBoundingClientRect().right;

      expect(Math.round(endGap)).toBe(Math.round(startGap));
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "" }],
      });
    }
  });
});
