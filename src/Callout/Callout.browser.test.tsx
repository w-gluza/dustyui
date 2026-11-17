import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Callout } from "../index.js";

function Probe({ token }: { token: string }) {
  return <span data-testid={token} style={{ color: `var(${token})` }} />;
}

function tokenColour(token: string): string {
  const probe = document.querySelector(`[data-testid="${token}"]`);

  return probe ? getComputedStyle(probe).color : "";
}

describe("Callout", () => {
  it("is a note that holds its content", async () => {
    const screen = await render(<Callout>Carry four litres of water.</Callout>);

    await expect
      .element(screen.getByRole("note"))
      .toHaveTextContent("Carry four litres of water.");
  });

  it("shows a title above the content only when given one", async () => {
    const screen = await render(
      <>
        <Callout title="Heat warning">Start before sunrise.</Callout>
        <Callout data-testid="untitled">No title here.</Callout>
      </>,
    );
    const titled = screen.getByText("Heat warning").element();

    expect(titled.nextElementSibling?.textContent).toBe(
      "Start before sunrise.",
    );
    expect(screen.getByTestId("untitled").element().children).toHaveLength(1);
  });

  it("marks its starting edge in the illustration colour, or the action colour for accent", async () => {
    const screen = await render(
      <>
        <Callout data-testid="neutral">Neutral</Callout>
        <Callout tone="accent" data-testid="accent">
          Accent
        </Callout>
        <Probe token="--dusty-illustration-primary" />
        <Probe token="--dusty-action" />
      </>,
    );
    const edge = (id: string) =>
      getComputedStyle(screen.getByTestId(id).element()).borderLeftColor;

    expect(edge("neutral")).toBe(tokenColour("--dusty-illustration-primary"));
    expect(edge("accent")).toBe(tokenColour("--dusty-action"));
  });

  it("moves the marker to the other edge when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <Callout data-testid="callout">Note</Callout>
      </div>,
    );
    const style = getComputedStyle(screen.getByTestId("callout").element());

    expect(style.borderRightWidth).toBe("4px");
    expect(style.borderLeftWidth).toBe("0px");
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <Callout className="mine" data-testid="callout">
        Note
      </Callout>,
    );

    await expect.element(screen.getByTestId("callout")).toHaveClass("mine");
  });
});
