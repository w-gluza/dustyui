import { describe, expect, it } from "vitest";
import { createRef } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { render } from "vitest-browser-react";
import { Avatar } from "../index.js";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";

function size(element: Element): [number, number] {
  const { width, height } = element.getBoundingClientRect();
  return [width, height];
}

describe("Avatar", () => {
  it("is an image named after the person and shows their initials", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" />);

    await expect
      .element(screen.getByRole("img", { name: "Wioletta Gluza" }))
      .toHaveTextContent("WG");
  });

  it("shows a custom fallback instead of the initials", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" fallback="W" />);

    expect(
      screen.getByRole("img", { name: "Wioletta Gluza" }).element().textContent,
    ).toBe("W");
  });

  it("lays the image over the initials and keeps the name", async () => {
    const screen = await render(
      <Avatar name="Wioletta Gluza" image={<img alt="" src={portrait} />} />,
    );
    const avatar = screen
      .getByRole("img", { name: "Wioletta Gluza" })
      .element();
    const image = avatar.querySelector("img");
    const initials = screen.getByText("WG").element();

    expect(image?.getBoundingClientRect()).toEqual(
      initials.getBoundingClientRect(),
    );
    expect(
      initials.compareDocumentPosition(image ?? initials) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hides an image that cannot be loaded so only the initials show", async () => {
    const screen = await render(
      <Avatar
        name="Wioletta Gluza"
        image={<img alt="Broken portrait" src="/missing-portrait.png" />}
      />,
    );
    const image = document.querySelector("img");

    await expect
      .poll(() => image && getComputedStyle(image).visibility)
      .toBe("hidden");
    await expect.element(screen.getByText("WG")).toBeVisible();
  });

  it("shows the portrait again when a failed image gets a working source", async () => {
    const screen = await render(
      <Avatar
        name="Wioletta Gluza"
        image={<img alt="" src="/missing-portrait.png" />}
      />,
    );
    const visibility = () => {
      const image = document.querySelector("img");
      return image && getComputedStyle(image).visibility;
    };
    await expect.poll(visibility).toBe("hidden");

    await screen.rerender(
      <Avatar name="Wioletta Gluza" image={<img alt="" src={portrait} />} />,
    );

    await expect.poll(visibility).toBe("visible");
  });

  it("hides an image that failed before the page became interactive", async () => {
    const avatar = (
      <Avatar
        name="Wioletta Gluza"
        image={<img alt="" src="/missing-portrait.png" />}
      />
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(avatar);
    document.body.append(host);
    const image = host.querySelector("img");
    await expect.poll(() => image?.complete).toBe(true);
    expect(image && getComputedStyle(image).visibility).toBe("visible");

    const root = hydrateRoot(host, avatar);

    await expect
      .poll(() => image && getComputedStyle(image).visibility)
      .toBe("hidden");
    root.unmount();
    host.remove();
  });

  it("shows replacement artwork after an image failed", async () => {
    const screen = await render(
      <Avatar
        name="Wioletta Gluza"
        image={<img alt="" src="/missing-portrait.png" />}
      />,
    );
    await expect
      .poll(() => {
        const image = document.querySelector("img");
        return image && getComputedStyle(image).visibility;
      })
      .toBe("hidden");

    await screen.rerender(
      <Avatar name="Wioletta Gluza" image={<svg viewBox="0 0 1 1" />} />,
    );

    await expect
      .poll(() => {
        const drawing = screen.container.querySelector("svg");
        return drawing && getComputedStyle(drawing).visibility;
      })
      .toBe("visible");
  });

  it("gives the caller its root element through an object or a function ref", async () => {
    const objectRef = createRef<HTMLSpanElement>();
    let fromFunction: HTMLSpanElement | null = null;
    const screen = await render(
      <>
        <Avatar name="Object" ref={objectRef} />
        <Avatar
          name="Function"
          ref={(node) => {
            fromFunction = node;
          }}
        />
      </>,
    );

    expect(objectRef.current).toBe(
      screen.getByRole("img", { name: "Object" }).element(),
    );
    expect(fromFunction).toBe(
      screen.getByRole("img", { name: "Function" }).element(),
    );
  });

  it("still calls a consumer error handler", async () => {
    let errors = 0;
    await render(
      <Avatar
        name="Wioletta Gluza"
        onErrorCapture={() => {
          errors += 1;
        }}
        image={<img alt="" src="/missing-portrait.png" />}
      />,
    );

    await expect.poll(() => errors).toBe(1);
  });

  it("is hidden from assistive technology when decorative", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" decorative />);

    expect(screen.getByRole("img").elements()).toHaveLength(0);
    await expect.element(screen.getByText("WG")).toBeVisible();
  });

  it("is 64 pixels square by default and follows the size prop", async () => {
    const screen = await render(
      <>
        <Avatar name="Default Size" />
        <Avatar name="Small Size" size={32} />
      </>,
    );

    expect(
      size(screen.getByRole("img", { name: "Default Size" }).element()),
    ).toEqual([64, 64]);
    expect(
      size(screen.getByRole("img", { name: "Small Size" }).element()),
    ).toEqual([32, 32]);
  });

  it.each([
    ["small", 32],
    ["medium", 48],
    ["large", 64],
  ] as const)(
    "sizes a %s avatar from a class, with no inline style",
    async (name, pixels) => {
      const screen = await render(<Avatar name="Wioletta Gluza" size={name} />);
      const avatar = screen.getByRole("img").element() as HTMLElement;

      expect(size(avatar)).toEqual([pixels, pixels]);
      expect(avatar.getAttribute("style")).toBeNull();
    },
  );

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to the default size for an invalid size of %s",
    async (invalid) => {
      const screen = await render(
        <Avatar name="Wioletta Gluza" size={invalid} />,
      );

      expect(size(screen.getByRole("img").element())).toEqual([64, 64]);
    },
  );

  it("keeps consumer styles alongside its size", async () => {
    const screen = await render(
      <Avatar
        name="Wioletta Gluza"
        size={64}
        style={{ outlineWidth: "3px" }}
      />,
    );
    const avatar = screen.getByRole("img").element() as HTMLElement;

    expect(avatar.style.outlineWidth).toBe("3px");
    expect(avatar.style.getPropertyValue("--avatar-size")).toBe("4rem");
  });

  it("has no ring unless asked for one", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" />);
    const avatar = screen.getByRole("img").element();

    expect(getComputedStyle(avatar).borderTopWidth).toBe("0px");
    expect(screen.getByText("WG").element().getBoundingClientRect()).toEqual(
      avatar.getBoundingClientRect(),
    );
  });

  it.each(["neutral", "accent"] as const)(
    "draws a %s ring inside its size, with a gap around the picture",
    async (ring) => {
      const screen = await render(
        <Avatar name="Wioletta Gluza" size="medium" ring={ring} />,
      );
      const avatar = screen.getByRole("img").element();
      const initials = screen.getByText("WG").element();
      const ringWidth = Number.parseFloat(
        getComputedStyle(avatar).borderTopWidth,
      );

      expect(size(avatar)).toEqual([48, 48]);
      expect(ringWidth).toBeGreaterThan(0);
      expect(size(initials)[0]).toBeLessThan(48 - 2 * ringWidth);
      expect(size(initials)[0]).toBe(size(initials)[1]);
    },
  );

  it("draws the accent ring thicker and in the action colour", async () => {
    const screen = await render(
      <>
        <Avatar name="Neutral Ring" ring="neutral" />
        <Avatar name="Accent Ring" ring="accent" />
        <button style={{ color: "var(--dusty-action)" }}>Probe</button>
      </>,
    );
    const neutral = getComputedStyle(
      screen.getByRole("img", { name: "Neutral Ring" }).element(),
    );
    const accent = getComputedStyle(
      screen.getByRole("img", { name: "Accent Ring" }).element(),
    );
    const action = getComputedStyle(
      screen.getByRole("button", { name: "Probe" }).element(),
    ).color;

    expect(accent.borderTopColor).toBe(action);
    expect(neutral.borderTopColor).not.toBe(action);
    expect(Number.parseFloat(accent.borderTopWidth)).toBeGreaterThan(
      Number.parseFloat(neutral.borderTopWidth),
    );
  });

  it("keeps an absolutely positioned image inside the circle", async () => {
    const screen = await render(
      <div style={{ inlineSize: "300px", blockSize: "200px" }}>
        <Avatar
          name="Wioletta Gluza"
          image={
            <img
              alt=""
              src={portrait}
              style={{ position: "absolute", inset: 0 }}
            />
          }
        />
      </div>,
    );
    const avatar = screen.getByRole("img", { name: "Wioletta Gluza" });
    const image = avatar.element().querySelector("img");

    expect(size(image ?? avatar.element())).toEqual([64, 64]);
  });

  it("fills the circle with an image wrapped in a picture or drawn as svg", async () => {
    const screen = await render(
      <>
        <Avatar
          name="Picture"
          image={
            <picture>
              <img alt="" src={portrait} />
            </picture>
          }
        />
        <Avatar name="Drawing" image={<svg viewBox="0 0 1 1" />} />
      </>,
    );
    const inner = (name: string, selector: string) =>
      screen.getByRole("img", { name }).element().querySelector(selector);

    expect(size(inner("Picture", "img")!)).toEqual([64, 64]);
    expect(size(inner("Drawing", "svg")!)).toEqual([64, 64]);
  });

  it("is hidden from assistive technology when it has no name", async () => {
    const screen = await render(
      <>
        <Avatar name="" data-testid="empty" />
        <Avatar name="   " data-testid="blank" />
      </>,
    );

    expect(screen.getByRole("img").elements()).toHaveLength(0);
    await expect
      .element(screen.getByTestId("empty"))
      .toHaveAttribute("aria-hidden", "true");
    await expect
      .element(screen.getByTestId("blank"))
      .toHaveAttribute("aria-hidden", "true");
  });

  it("shows a custom fallback in the case it was given", async () => {
    const screen = await render(<Avatar name="Team" fallback="dev" />);
    const text = screen.getByText("dev").element();

    expect(getComputedStyle(text).textTransform).toBe("none");
  });

  it("never sets the initials smaller than 12 pixels", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" size="small" />);

    expect(getComputedStyle(screen.getByText("WG").element()).fontSize).toBe(
      "12px",
    );
  });

  it("sets a fallback of three or more characters smaller so it fits", async () => {
    const screen = await render(
      <>
        <Avatar name="Two" fallback="+9" size="small" />
        <Avatar name="Four" fallback="+100" size="small" />
      </>,
    );
    const fontSize = (text: string) =>
      Number.parseFloat(
        getComputedStyle(screen.getByText(text).element()).fontSize,
      );
    const long = screen.getByText("+100").element();
    const range = document.createRange();
    range.selectNodeContents(long);

    expect(fontSize("+100")).toBeLessThan(fontSize("+9"));
    expect(range.getBoundingClientRect().width).toBeLessThan(28);
  });

  it.each([undefined, "neutral", "accent"] as const)(
    "clips an image to the circle with a ring of %s",
    async (ring) => {
      function Portrait() {
        return <svg viewBox="0 0 1 1" data-testid="portrait" />;
      }
      const screen = await render(
        <Avatar
          name="Wioletta Gluza"
          {...(ring ? { ring } : {})}
          image={<Portrait />}
        />,
      );
      const avatar = screen
        .getByRole("img", { name: "Wioletta Gluza" })
        .element();
      const portrait = screen.getByTestId("portrait").element();

      expect(getComputedStyle(portrait).borderTopLeftRadius).toBe(
        getComputedStyle(avatar).borderTopLeftRadius,
      );
      expect(getComputedStyle(portrait).borderTopLeftRadius).not.toBe("0px");
    },
  );

  it("rounds the edge of the initials to the circle so it is not drawn as a square", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" />);
    const avatar = screen
      .getByRole("img", { name: "Wioletta Gluza" })
      .element();
    const initials = screen.getByText("WG").element();

    expect(getComputedStyle(initials).borderTopLeftRadius).toBe(
      getComputedStyle(avatar).borderTopLeftRadius,
    );
    expect(getComputedStyle(initials).borderTopLeftRadius).not.toBe("0px");
  });

  it("draws an edge around the initials so they stand out from the page", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" />);

    expect(
      getComputedStyle(screen.getByText("WG").element()).boxShadow,
    ).toContain("inset");
  });

  it("keeps its size when forced colours add a border", async () => {
    const screen = await render(<Avatar name="Wioletta Gluza" />);
    const avatar = screen
      .getByRole("img", { name: "Wioletta Gluza" })
      .element();
    avatar.style.border = "1px solid";

    expect(size(avatar)).toEqual([64, 64]);
  });
});
