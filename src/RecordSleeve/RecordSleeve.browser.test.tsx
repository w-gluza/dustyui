import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
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
});
