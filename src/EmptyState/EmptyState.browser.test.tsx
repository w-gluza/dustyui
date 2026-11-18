import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Button, EmptyState } from "../index.js";

const picture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";

describe("EmptyState", () => {
  it.each([2, 3, 4, 5, 6] as const)(
    "titles itself with a level %s heading",
    async (level) => {
      const screen = await render(
        <EmptyState title="No trips yet" level={level} />,
      );

      await expect
        .element(screen.getByRole("heading", { level, name: "No trips yet" }))
        .toBeVisible();
    },
  );

  it("renders only the title when given nothing else", async () => {
    const screen = await render(
      <EmptyState title="No trips yet" level={2} data-testid="empty" />,
    );

    expect(screen.getByTestId("empty").element().children).toHaveLength(1);
  });

  it("shows the picture, the description and the actions in reading order", async () => {
    const screen = await render(
      <EmptyState
        title="No trips yet"
        level={2}
        data-testid="empty"
        media={<img alt="" src={picture} />}
        description="Plan your first one."
        actions={<Button>Plan a trip</Button>}
      />,
    );
    const parts = [...screen.getByTestId("empty").element().children];

    expect(parts).toHaveLength(4);
    expect(parts[0]?.querySelector("img")).not.toBeNull();
    expect(parts[1]?.textContent).toBe("No trips yet");
    expect(parts[2]?.textContent).toBe("Plan your first one.");
    await expect
      .element(screen.getByRole("button", { name: "Plan a trip" }))
      .toBeVisible();
  });

  it("centres its content", async () => {
    const screen = await render(
      <div style={{ inlineSize: "400px" }}>
        <EmptyState
          title="No trips yet"
          level={2}
          data-testid="empty"
          actions={<Button>Plan a trip</Button>}
        />
      </div>,
    );
    const empty = screen.getByTestId("empty").element().getBoundingClientRect();
    const button = screen.getByRole("button").element().getBoundingClientRect();

    expect(
      Math.abs(button.left - empty.left - (empty.right - button.right)),
    ).toBeLessThan(1);
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <EmptyState
        title="No trips yet"
        level={2}
        className="mine"
        data-testid="empty"
      />,
    );

    await expect.element(screen.getByTestId("empty")).toHaveClass("mine");
  });

  it("keeps a plain text description in a paragraph", async () => {
    const screen = await render(
      <EmptyState title="Nothing here" level={2} description="Add a trip." />,
    );

    expect(screen.getByText("Add a trip.").element().tagName).toBe("P");
  });

  it("holds a description made of blocks without nesting them in a paragraph", async () => {
    const screen = await render(
      <EmptyState
        title="Nothing here"
        level={2}
        description={
          <>
            <p>Add a trip.</p>
            <ul>
              <li>Pick a park</li>
            </ul>
          </>
        }
      />,
    );
    const paragraph = screen.getByText("Add a trip.").element();

    expect(paragraph.parentElement?.tagName).toBe("DIV");
    expect(paragraph.parentElement?.querySelector("ul")).not.toBeNull();
    expect(getComputedStyle(paragraph).marginTop).toBe("0px");
  });
});
