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

  it("is plain unless asked to be a poster", async () => {
    const screen = await render(
      <>
        <Card data-testid="plain">Plain</Card>
        <Card variant="plain" data-testid="named">
          Named
        </Card>
      </>,
    );
    const plain = getComputedStyle(screen.getByTestId("plain").element());
    const named = getComputedStyle(screen.getByTestId("named").element());

    expect(plain.boxShadow).toBe("none");
    expect(named.borderTopColor).toBe(plain.borderTopColor);
    expect(named.borderTopLeftRadius).toBe(plain.borderTopLeftRadius);
  });

  it("gives a poster a text-coloured outline, a hard shadow and rounder corners", async () => {
    const screen = await render(
      <>
        <Card data-testid="plain">Plain</Card>
        <Card variant="poster" data-testid="poster">
          Poster
        </Card>
      </>,
    );
    const plain = getComputedStyle(screen.getByTestId("plain").element());
    const poster = getComputedStyle(screen.getByTestId("poster").element());

    expect(poster.borderTopColor).toBe(poster.color);
    expect(poster.boxShadow).toMatch(/6px 8px 0px 0px$/u);
    expect(Number.parseFloat(poster.borderTopLeftRadius)).toBeGreaterThan(
      Number.parseFloat(plain.borderTopLeftRadius),
    );
  });

  it("throws the poster shadow to the other side when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <Card variant="poster" data-testid="poster">
          Poster
        </Card>
      </div>,
    );

    expect(
      getComputedStyle(screen.getByTestId("poster").element()).boxShadow,
    ).toMatch(/-6px 8px 0px 0px$/u);
  });

  it("sets a larger title and an unruled footer on a poster", async () => {
    const screen = await render(
      <>
        <Card>
          <CardTitle level={2}>Plain title</CardTitle>
          <CardFooter data-testid="plain-footer">Plain footer</CardFooter>
        </Card>
        <Card variant="poster">
          <CardTitle level={2}>Poster title</CardTitle>
          <CardFooter data-testid="poster-footer">Poster footer</CardFooter>
        </Card>
      </>,
    );
    const fontSize = (name: string) =>
      Number.parseFloat(
        getComputedStyle(screen.getByRole("heading", { name }).element())
          .fontSize,
      );
    const rule = (id: string) =>
      getComputedStyle(screen.getByTestId(id).element()).borderTopWidth;

    expect(fontSize("Poster title")).toBeGreaterThan(fontSize("Plain title"));
    expect(rule("plain-footer")).toBe("1px");
    expect(rule("poster-footer")).toBe("0px");
  });

  it("lets poster artwork run past the media area up to the card edge", async () => {
    const screen = await render(
      <>
        <Card>
          <CardMedia data-testid="plain-media">
            <img alt="" src={picture} />
          </CardMedia>
        </Card>
        <Card variant="poster" data-testid="poster">
          <CardMedia data-testid="poster-media">
            <img alt="" src={picture} />
          </CardMedia>
        </Card>
      </>,
    );
    const overflow = (id: string) =>
      getComputedStyle(screen.getByTestId(id).element()).overflow;

    expect(overflow("plain-media")).toBe("hidden");
    expect(overflow("poster-media")).toBe("visible");
    expect(overflow("poster")).toBe("clip");
  });
});
