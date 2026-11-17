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

  it("folds the people past the maximum into one count", async () => {
    const screen = await render(
      <AvatarGroup label="Contributors" avatars={people} max={3} />,
    );

    expect(screen.getByRole("listitem").elements()).toHaveLength(4);
    await expect
      .element(screen.getByRole("img", { name: "2 more" }))
      .toHaveTextContent("+2");
    expect(screen.getByRole("img", { name: "Ines Costa" }).elements()).toEqual(
      [],
    );
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
        max={2}
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
