import { describe, expect, it } from "vitest";
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

  it("still shows the initials when the image cannot be loaded", async () => {
    const screen = await render(
      <Avatar
        name="Wioletta Gluza"
        image={<img alt="" src="/missing-portrait.png" />}
      />,
    );
    const image = document.querySelector("img");

    await expect.poll(() => image?.complete).toBe(true);

    expect(image?.naturalWidth).toBe(0);
    await expect.element(screen.getByText("WG")).toBeVisible();
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
      <Avatar name="Wioletta Gluza" style={{ outlineWidth: "3px" }} />,
    );
    const avatar = screen.getByRole("img").element() as HTMLElement;

    expect(avatar.style.outlineWidth).toBe("3px");
    expect(avatar.style.getPropertyValue("--avatar-size")).toBe("4rem");
  });
});
