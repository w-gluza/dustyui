import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { List, ListItem } from "../index.js";

const wide = { inlineSize: "320px" };

describe("List", () => {
  it("is an unordered list of its items", async () => {
    const screen = await render(
      <List aria-label="Rudiments">
        <ListItem title="Single Stroke Roll" description="70 BPM" />
        <ListItem title="Paradiddle" />
      </List>,
    );
    const list = screen.getByRole("list", { name: "Rudiments" });

    expect(list.element().tagName).toBe("UL");
    expect(list.getByRole("listitem").elements()).toHaveLength(2);
    await expect.element(screen.getByText("70 BPM")).toBeVisible();
  });

  it("is an ordered list that numbers its rows from 01 when numbered", async () => {
    const screen = await render(
      <List numbered data-testid="list">
        <ListItem title="Single Stroke Roll" />
        <ListItem title="Paradiddle" />
      </List>,
    );
    const list = screen.getByTestId("list").element();
    const number = (index: number) =>
      getComputedStyle(
        list.querySelectorAll("li > *")[index] as Element,
        "::before",
      ).content;

    expect(list.tagName).toBe("OL");
    expect(number(0)).toContain("decimal-leading-zero");
    expect(
      Array.from(
        list.children,
        (item) => getComputedStyle(item).counterIncrement,
      ),
    ).toEqual(["dusty-list 1", "dusty-list 1"]);
    expect(
      getComputedStyle(list.querySelector("li > *") as Element, "::before")
        .display,
    ).not.toBe("none");
  });

  it("orders a row as leading, overline, title, description, trailing", async () => {
    const screen = await render(
      <div style={wide}>
        <List>
          <ListItem
            leading={<span>L</span>}
            overline="3 min"
            title="Single Stroke Roll"
            description="70 BPM"
            trailing={<span>T</span>}
          />
        </List>
      </div>,
    );
    const box = (text: string) =>
      screen.getByText(text, { exact: true }).element().getBoundingClientRect();

    expect(box("L").right).toBeLessThanOrEqual(box("Single Stroke Roll").left);
    expect(box("T").left).toBeGreaterThanOrEqual(
      box("Single Stroke Roll").right,
    );
    expect(box("3 min").bottom).toBeLessThanOrEqual(
      box("Single Stroke Roll").top,
    );
    expect(box("70 BPM").top).toBeGreaterThanOrEqual(
      box("Single Stroke Roll").bottom,
    );
    expect(Math.round(box("T").right)).toBe(
      Math.round(
        screen.getByRole("list").element().getBoundingClientRect().right,
      ),
    );
  });

  it("renders no empty slots", async () => {
    const screen = await render(
      <List>
        <ListItem title="Only a title" />
      </List>,
    );
    const row = screen.getByRole("listitem").element()
      .firstElementChild as Element;

    expect(row.children).toHaveLength(1);
    expect(row.firstElementChild?.children).toHaveLength(1);
  });

  it("rules off every row but the last when divided, and none when plain", async () => {
    const screen = await render(
      <>
        <List data-testid="divided">
          <ListItem title="A" />
          <ListItem title="B" />
        </List>
        <List variant="plain" data-testid="plain">
          <ListItem title="A" />
          <ListItem title="B" />
        </List>
      </>,
    );
    const rules = (id: string) =>
      Array.from(
        screen.getByTestId(id).element().children,
        (item) => getComputedStyle(item).borderBottomWidth,
      );

    expect(rules("divided")).toEqual(["1px", "0px"]);
    expect(rules("plain")).toEqual(["0px", "0px"]);
  });

  it("sets a contained list on a bordered raised surface with inset rows", async () => {
    const screen = await render(
      <>
        <List variant="contained" data-testid="contained">
          <ListItem title="A" />
        </List>
        <List data-testid="divided">
          <ListItem title="A" />
        </List>
      </>,
    );
    const contained = screen.getByTestId("contained").element();
    const row = (id: string) =>
      getComputedStyle(
        screen.getByTestId(id).element().querySelector("li > *") as Element,
      );

    expect(getComputedStyle(contained).borderTopWidth).toBe("1px");
    expect(getComputedStyle(contained).backgroundColor).not.toBe(
      getComputedStyle(screen.getByTestId("divided").element()).backgroundColor,
    );
    expect(row("contained").paddingLeft).toBe("16px");
    expect(row("divided").paddingLeft).toBe("0px");
  });

  it("makes the whole row a link when given an address", async () => {
    const screen = await render(
      <div style={wide}>
        <List>
          <ListItem
            title="Paradiddle"
            description="80 BPM"
            href="#paradiddle"
          />
        </List>
      </div>,
    );
    const link = screen.getByRole("link", { name: "Paradiddle 80 BPM" });

    await expect.element(link).toHaveAttribute("href", "#paradiddle");
    expect(link.element().getBoundingClientRect().width).toBe(320);
  });

  it("makes the whole row a button when given a click handler", async () => {
    const onClick = vi.fn();
    const screen = await render(
      <List>
        <ListItem title="Paradiddle" onClick={onClick} />
      </List>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Paradiddle" }));

    expect(onClick).toHaveBeenCalledOnce();
    await expect
      .element(screen.getByRole("button", { name: "Paradiddle" }))
      .toHaveAttribute("type", "button");
  });

  it("marks the selected row as current and tints it", async () => {
    const screen = await render(
      <List>
        <ListItem title="A" onClick={() => undefined} />
        <ListItem title="B" onClick={() => undefined} selected />
      </List>,
    );
    const a = screen.getByRole("button", { name: "A" }).element();
    const b = screen.getByRole("button", { name: "B" }).element();

    expect(a.hasAttribute("aria-current")).toBe(false);
    expect(b.getAttribute("aria-current")).toBe("true");
    expect(getComputedStyle(b).backgroundColor).not.toBe(
      getComputedStyle(a).backgroundColor,
    );
  });

  it("shows placeholder rows and says it is loading, in place of its items", async () => {
    const screen = await render(
      <List
        loading
        loadingRows={2}
        loadingLabel="Loading rudiments"
        data-testid="list"
      >
        <ListItem title="Hidden while loading" />
      </List>,
    );
    const list = screen.getByTestId("list").element();

    await expect
      .element(screen.getByTestId("list"))
      .toHaveAttribute("aria-busy", "true");
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Loading rudiments");
    expect(list.querySelectorAll("li[aria-hidden='true']")).toHaveLength(2);
    expect(screen.getByText("Hidden while loading").elements()).toHaveLength(0);
  });

  it("keeps consumer class names and forwards native attributes", async () => {
    const screen = await render(
      <List className="mine" data-testid="list">
        <ListItem title="A" className="my-item" data-testid="item" />
      </List>,
    );

    await expect.element(screen.getByTestId("list")).toHaveClass("mine");
    await expect.element(screen.getByTestId("item")).toHaveClass("my-item");
  });

  it("sets the quiet text of a selected row in the full text colour", async () => {
    const screen = await render(
      <List>
        <ListItem
          title="A"
          description="Quiet"
          onClick={() => undefined}
          selected
        />
      </List>,
    );

    expect(getComputedStyle(screen.getByText("Quiet").element()).color).toBe(
      getComputedStyle(screen.getByText("A", { exact: true }).element()).color,
    );
  });
});
