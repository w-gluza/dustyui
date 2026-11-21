import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { StatList } from "../index.js";

const STATS = [
  {
    label: "Total practice time",
    value: "4h 12m",
    icon: <svg data-testid="icon" />,
  },
  { label: "Total sessions", value: 18 },
] as const;

describe("StatList", () => {
  it("is a description list pairing each label with its value", async () => {
    const screen = await render(<StatList stats={STATS} data-testid="stats" />);
    const list = screen.getByTestId("stats").element();

    expect(list.tagName).toBe("DL");
    expect(
      Array.from(list.querySelectorAll("dt"), (term) => term.textContent),
    ).toEqual(["Total practice time", "Total sessions"]);
    expect(
      Array.from(list.querySelectorAll("dd"), (value) => value.textContent),
    ).toEqual(["4h 12m", "18"]);
    await expect
      .element(screen.getByRole("term").first())
      .toHaveTextContent("Total practice time");
  });

  it("hides the icon from assistive technology, keeps its place empty on a row without one and renders none in a list without icons", async () => {
    const screen = await render(
      <>
        <StatList stats={STATS} data-testid="stats" />
        <StatList stats={[{ label: "Tracks", value: 9 }]} data-testid="plain" />
      </>,
    );
    const termsOf = (id: string) =>
      screen.getByTestId(id).element().querySelectorAll("dt");
    const slot = termsOf("stats")[1]?.firstElementChild;

    expect(
      screen.getByTestId("icon").element().closest("[aria-hidden='true']"),
    ).not.toBeNull();
    expect(slot?.getAttribute("aria-hidden")).toBe("true");
    expect(slot?.children).toHaveLength(0);
    expect(termsOf("plain")[0]?.children).toHaveLength(0);
  });

  it("pushes the value to the far side and rules off every row but the last", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <StatList stats={STATS} data-testid="stats" />
      </div>,
    );
    const list = screen.getByTestId("stats").element();
    const rows = list.querySelectorAll("div");
    const rule = (index: number) =>
      getComputedStyle(rows[index] as Element).borderBottomWidth;

    expect(
      Math.round(
        (list.querySelector("dd") as Element).getBoundingClientRect().right,
      ),
    ).toBe(Math.round(list.getBoundingClientRect().right));
    expect(rule(0)).toBe("1px");
    expect(rule(1)).toBe("0px");
  });

  it("puts the value on the other side when the text runs right to left", async () => {
    const screen = await render(
      <div dir="rtl" style={{ inlineSize: "320px" }}>
        <StatList stats={STATS} data-testid="stats" />
      </div>,
    );
    const list = screen.getByTestId("stats").element();

    expect(
      Math.round(
        (list.querySelector("dd") as Element).getBoundingClientRect().left,
      ),
    ).toBe(Math.round(list.getBoundingClientRect().left));
  });

  it("keeps a consumer class name and forwards native attributes", async () => {
    const screen = await render(
      <StatList stats={STATS} className="mine" aria-label="Your activity" />,
    );

    await expect
      .element(screen.getByLabelText("Your activity"))
      .toHaveClass("mine");
  });

  it("keeps a long unbroken label and value inside the list", async () => {
    const screen = await render(
      <div style={{ inlineSize: "240px" }}>
        <StatList
          data-testid="list"
          stats={[
            {
              label: "Primary_contact_address_for_billing",
              value: "a.very.long.address@an-unbroken-example-domain.example",
            },
          ]}
        />
      </div>,
    );
    const list = screen.getByTestId("list").element();
    const term = screen.getByText(/Primary_contact/u).element();

    expect(list.scrollWidth).toBeLessThanOrEqual(240);
    expect(term.getBoundingClientRect().width).toBeGreaterThan(60);
  });

  it("renders an empty list with no rows and no height", async () => {
    const screen = await render(<StatList stats={[]} data-testid="list" />);
    const list = screen.getByTestId("list").element();

    expect(list.children).toHaveLength(0);
    expect(list.getBoundingClientRect().height).toBe(0);
  });

  it("keeps a row's own state when rows with ids are reordered", async () => {
    const stat = (id: string) => ({
      id,
      label: id,
      value: <input aria-label={id} defaultValue="" />,
    });
    const screen = await render(
      <StatList stats={[stat("One"), stat("Two")]} />,
    );
    const field = screen.getByRole("textbox", { name: "Two" });

    await field.fill("kept");
    await screen.rerender(<StatList stats={[stat("Two"), stat("One")]} />);

    await expect
      .element(screen.getByRole("textbox", { name: "Two" }))
      .toHaveValue("kept");
  });

  it("lines up every label when only some rows have an icon", async () => {
    const screen = await render(
      <div style={{ inlineSize: "320px" }}>
        <StatList
          stats={[
            { label: "Elevation", value: "3,776 m", icon: <svg /> },
            { label: "Season", value: "July" },
          ]}
        />
        <StatList
          stats={[{ label: "Plain", value: "1" }]}
          data-testid="plain"
        />
      </div>,
    );
    const textStart = (label: string) => {
      const range = document.createRange();
      range.selectNodeContents(
        screen.getByText(label).element().lastChild as Node,
      );
      return range.getBoundingClientRect().left;
    };
    const plain = screen.getByTestId("plain").element();

    expect(textStart("Season")).toBe(textStart("Elevation"));
    expect(textStart("Plain")).toBe(plain.getBoundingClientRect().left);
  });
});
