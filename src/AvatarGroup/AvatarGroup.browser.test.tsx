import { createRef, type CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AvatarGroup } from "../index.js";

const people = [
  { name: "Wioletta Gluza" },
  { name: "Maya Torres" },
  { name: "Leo Park" },
  { name: "Ines Costa" },
  { name: "Tom Becker" },
];

describe("AvatarGroup", () => {
  it("is a named list with one item for each person", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={people} />,
    );
    const list = screen.getByRole("list", { name: "Contributors" });

    await expect.element(list).toBeVisible();
    expect(screen.getByRole("listitem").elements()).toHaveLength(5);
    expect(
      screen
        .getByRole("img")
        .elements()
        .map((avatar) => avatar.ariaLabel),
    ).toEqual(people.map((person) => person.name));
  });

  it("never draws more circles than the maximum, counter included", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={people} max={3} />,
    );

    expect(screen.getByRole("listitem").elements()).toHaveLength(3);
    await expect
      .element(screen.getByRole("img", { name: "3 more" }))
      .toHaveTextContent("+3");
    expect(screen.getByRole("img", { name: "Leo Park" }).elements()).toEqual(
      [],
    );
  });

  it("never folds a single person into a counter", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={people} max={4} />,
    );

    expect(screen.getByText("+1").elements()).toHaveLength(0);
    await expect.element(screen.getByText("+2")).toBeVisible();
  });

  it("names the counter with the label it is given, which also receives the hidden people", async () => {
    const screen = await render(
      <AvatarGroup
        label="Autorzy"
        avatars={people}
        max={4}
        overflowLabel={(count, hidden) =>
          `i ${String(count)} innych: ${hidden.map((person) => person.name).join(", ")}`
        }
      />,
    );

    await expect
      .element(
        screen.getByRole("img", { name: "i 2 innych: Ines Costa, Tom Becker" }),
      )
      .toHaveTextContent("+2");
  });

  it("caps the visible count at 99 and keeps the full count in the name", async () => {
    const crowd = Array.from({ length: 150 }, (_, index) => ({
      name: `Person ${String(index)}`,
    }));
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={crowd} max={3} />,
    );

    await expect
      .element(screen.getByRole("img", { name: "148 more" }))
      .toHaveTextContent("99+");
  });

  it("sets the counter apart from the people beside it", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={people} max={3} />,
    );
    const fill = (text: string) =>
      getComputedStyle(screen.getByText(text).element()).backgroundColor;

    expect(fill("+3")).not.toBe(fill("WG"));
  });

  it("keeps the list role that a list without markers loses in Safari", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={people} />,
    );

    await expect
      .element(screen.getByRole("list", { name: "Contributors" }))
      .toHaveAttribute("role", "list");
  });

  it("overlaps from the other side when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl">
        <AvatarGroup label="Contributors" avatars={people} size="small" />
      </div>,
    );
    const boxes = screen
      .getByRole("img")
      .elements()
      .map((avatar) => avatar.getBoundingClientRect());

    expect(boxes[1]?.right).toBeGreaterThan(boxes[0]?.left ?? 0);
    expect(boxes[1]?.right).toBeLessThan(boxes[0]?.right ?? 0);
  });

  it("draws the gap between avatars in the colour the consumer sets", async () => {
    const screen = await render(
      <AvatarGroup
        label="Contributors"
        avatars={people}
        style={{ "--dusty-avatar-group-gap": "rgb(1, 2, 3)" } as CSSProperties}
      />,
    );
    const item = screen.getByRole("listitem").first().element();

    expect(getComputedStyle(item).boxShadow).toContain("rgb(1, 2, 3)");
  });

  it("keeps a consumer class name and passes the ref to the list", async () => {
    const ref = createRef<HTMLUListElement>();
    const screen = await render(
      <AvatarGroup
        label="Contributors"
        avatars={people}
        className="mine"
        ref={ref}
      />,
    );
    const list = screen.getByRole("list", { name: "Contributors" });

    await expect.element(list).toHaveClass("mine");
    expect(ref.current).toBe(list.element());
  });

  it.each([0, -2, 1.5, Number.NaN, 5, 9])(
    "shows everyone for a maximum of %s",
    async (max) => {
      const screen = await render(
        <AvatarGroup label="Contributors" avatars={people} max={max} />,
      );

      expect(screen.getByRole("listitem").elements()).toHaveLength(5);
    },
  );

  it("overlaps the avatars and keeps them the same size", async () => {
    const screen = await render(
      <AvatarGroup
        label="Contributors"
        avatars={people}
        max={3}
        size="small"
      />,
    );
    const boxes = screen
      .getByRole("img")
      .elements()
      .map((avatar) => avatar.getBoundingClientRect());

    expect(boxes.map((box) => box.width)).toEqual([32, 32, 32]);
    expect(boxes[1]?.left).toBeLessThan(boxes[0]?.right ?? 0);
    expect(boxes[1]?.left).toBeGreaterThan(boxes[0]?.left ?? 0);
  });

  it("renders an empty list for nobody", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={[]} />,
    );

    expect(
      screen.getByRole("list", { name: "Contributors" }).element().children,
    ).toHaveLength(0);
  });
});
