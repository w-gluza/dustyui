import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ObjectInspector } from "../index.js";

const park = {
  name: "Yellowstone",
  established: 1872,
  open: true,
  animals: ["bison", "wolf"],
};

function rowTexts(): string[] {
  return [...document.querySelectorAll('[role="treeitem"]')].map(
    (row) => row.textContent ?? "",
  );
}

function tokenColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const { color } = getComputedStyle(probe);
  probe.remove();
  return color;
}

function valueColour(text: string): string {
  const value = [...document.querySelectorAll("[data-kind]")].find(
    (element) => element.textContent === text,
  );
  return value ? getComputedStyle(value).color : "";
}

describe("ObjectInspector", () => {
  it("shows the value open one level, with a key and a preview per row", async () => {
    const screen = await render(<ObjectInspector label="Park" value={park} />);

    await expect
      .element(screen.getByRole("tree", { name: "Park" }))
      .toBeVisible();
    expect(rowTexts()).toEqual([
      '{name: "Yellowstone", established: 1872, open: true, animals: Array(2)}',
      'name: "Yellowstone"',
      "established: 1872",
      "open: true",
      'animals: Array(2) ["bison", "wolf"]',
    ]);
  });

  it("shows a primitive as a single row", async () => {
    await render(<ObjectInspector label="Answer" value={42} />);

    expect(rowTexts()).toEqual(["42"]);
  });

  it("opens a nested value with the keyboard", async () => {
    await render(<ObjectInspector label="Park" value={park} />);
    await userEvent.tab();

    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{ArrowRight}");

    expect(rowTexts().slice(-2)).toEqual(['0: "bison"', '1: "wolf"']);
  });

  it("jumps to a property by typing its name", async () => {
    await render(<ObjectInspector label="Park" value={park} />);
    await userEvent.tab();

    await userEvent.keyboard("o");

    expect(document.activeElement?.textContent).toBe("open: true");
  });

  it("starts closed when asked to", async () => {
    await render(
      <ObjectInspector label="Park" value={park} defaultExpanded={[]} />,
    );

    expect(rowTexts()).toHaveLength(1);
  });

  it("colours each kind of value with its theme token", async () => {
    await render(
      <ObjectInspector
        label="Kinds"
        value={{ text: "a", count: 1, flag: true, run() {} }}
      />,
    );

    expect(valueColour('"a"')).toBe(tokenColour("--dusty-syntax-string"));
    expect(valueColour("1")).toBe(tokenColour("--dusty-syntax-number"));
    expect(valueColour("true")).toBe(tokenColour("--dusty-syntax-boolean"));
    expect(valueColour("ƒ run()")).toBe(tokenColour("--dusty-syntax-function"));
    expect(tokenColour("--dusty-syntax-string")).not.toBe(
      tokenColour("--dusty-syntax-number"),
    );
  });

  it("shows a getter without running it and a circular reference without looping", async () => {
    let runs = 0;
    const value: Record<string, unknown> = {
      get expensive() {
        runs++;
        return 1;
      },
    };
    value.self = value;

    await render(<ObjectInspector label="Tricky" value={value} />);

    expect(rowTexts().slice(1)).toEqual([
      "expensive: (...)",
      "self: [Circular $]",
    ]);
    expect(runs).toBe(0);
  });

  it("shows a value it cannot read as a row and keeps the rest", async () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("refused");
        },
      },
    );

    await render(
      <ObjectInspector label="Hostile" value={{ before: 1, hostile }} />,
    );

    expect(rowTexts().slice(1)).toEqual([
      "before: 1",
      "hostile: Uninspectable: refused",
    ]);
  });

  it("keeps the same rows open when the value is replaced", async () => {
    const screen = await render(<ObjectInspector label="Park" value={park} />);
    await screen.getByRole("treeitem", { name: /^animals/u }).click();
    expect(rowTexts()).toContain('0: "bison"');

    await screen.rerender(
      <ObjectInspector
        label="Park"
        value={{ ...park, animals: ["elk", "bear", "moose"] }}
      />,
    );

    expect(rowTexts().slice(-3)).toEqual([
      '0: "elk"',
      '1: "bear"',
      '2: "moose"',
    ]);
  });
});
