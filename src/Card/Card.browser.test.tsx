import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardMedia,
  CardTitle,
} from "../index.js";

const picture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 5'%3E%3C/svg%3E";

function box(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

describe("Card", () => {
  it("is an article unless another element is asked for", async () => {
    const screen = await render(
      <>
        <Card>Default</Card>
        <Card as="section" aria-label="Section card">
          Section
        </Card>
        <Card as="div" data-testid="plain">
          Plain
        </Card>
      </>,
    );

    await expect
      .element(screen.getByRole("article"))
      .toHaveTextContent("Default");
    await expect
      .element(screen.getByRole("region", { name: "Section card" }))
      .toHaveTextContent("Section");
    expect(screen.getByTestId("plain").element().tagName).toBe("DIV");
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <Card className="mine" title="Featured story">
        Story
      </Card>,
    );

    await expect
      .element(screen.getByTitle("Featured story"))
      .toHaveClass("mine");
  });

  it.each([2, 3, 4, 5, 6] as const)(
    "gives the title a level %s heading",
    async (level) => {
      const screen = await render(
        <Card>
          <CardTitle level={level}>Death Valley</CardTitle>
        </Card>,
      );

      await expect
        .element(screen.getByRole("heading", { level, name: "Death Valley" }))
        .toBeVisible();
    },
  );

  it("stretches the picture across the media area", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <Card>
          <CardMedia data-testid="media">
            <img alt="" src={picture} />
          </CardMedia>
        </Card>
      </div>,
    );
    const media = screen.getByTestId("media").element();
    const image = media.querySelector("img");

    await expect.poll(() => image?.complete).toBe(true);

    expect(media.children).toHaveLength(1);
    expect(box(image ?? media).width).toBe(box(media).width);
  });

  it("tucks the label into the starting bottom corner of the media", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <Card>
          <CardMedia label="Featured" data-testid="media">
            <img alt="" src={picture} />
          </CardMedia>
        </Card>
      </div>,
    );
    const media = box(screen.getByTestId("media").element());
    const label = box(screen.getByText("Featured").element());

    expect(label.left).toBe(media.left);
    expect(label.bottom).toBe(media.bottom);
    expect(label.right).toBeLessThan(media.right);
  });

  it("tucks the label into the other corner when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={{ inlineSize: "320px" }}>
        <Card>
          <CardMedia label="Featured" data-testid="media">
            <img alt="" src={picture} />
          </CardMedia>
        </Card>
      </div>,
    );
    const media = box(screen.getByTestId("media").element());
    const label = box(screen.getByText("Featured").element());

    expect(label.right).toBe(media.right);
    expect(label.left).toBeGreaterThan(media.left);
  });

  it("lines the label up with the text below it", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <Card>
          <CardMedia label="Featured">
            <img alt="" src={picture} />
          </CardMedia>
          <CardContent>
            <CardDescription>Salt flats below sea level.</CardDescription>
          </CardContent>
        </Card>
      </div>,
    );
    const label = screen.getByText("Featured").element();
    const labelStart =
      box(label).left + Number.parseFloat(getComputedStyle(label).paddingLeft);

    expect(labelStart).toBe(
      box(screen.getByText("Salt flats below sea level.").element()).left,
    );
  });

  it("pushes the end of the footer to the far side", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <Card>
          <CardContent>
            <CardFooter end="6 min read" data-testid="footer">
              Wioletta Gluza
            </CardFooter>
          </CardContent>
        </Card>
      </div>,
    );
    const footer = screen.getByTestId("footer").element();

    expect(footer.tagName).toBe("FOOTER");
    expect(box(screen.getByText("6 min read").element()).right).toBe(
      box(footer).right,
    );
  });

  it("renders no end wrapper in a footer without one", async () => {
    const screen = await render(
      <Card>
        <CardFooter data-testid="footer">Wioletta Gluza</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId("footer").element().children).toHaveLength(0);
  });
});
