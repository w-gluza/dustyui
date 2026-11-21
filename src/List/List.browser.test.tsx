import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, userEvent } from "vitest/browser";
import { List, ListItem } from "../index.js";
import { announcements, resetAnnouncer } from "../test/announcements.js";

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
        <ListItem title="Flam" href="#flam" />
      </List>,
    );
    const list = screen.getByTestId("list").element();
    const number = (index: number) =>
      getComputedStyle(
        list.querySelectorAll("li > *")[index] as Element,
        "::before",
      ).content;
    const linkNumber = getComputedStyle(
      list.querySelector("a > span") as Element,
      "::before",
    ).content;

    expect(list.tagName).toBe("OL");
    expect(number(0)).toContain("decimal-leading-zero");
    expect(linkNumber).toContain("decimal-leading-zero");
    expect(
      Array.from(
        list.children,
        (item) => getComputedStyle(item).counterIncrement,
      ),
    ).toEqual(["dusty-list 1", "dusty-list 1", "dusty-list 1"]);
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
    resetAnnouncer();
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
    await expect.poll(() => announcements()).toEqual(["Loading rudiments"]);
    expect(list.querySelectorAll("li[aria-hidden='true']")).toHaveLength(2);
    expect(list.children).toHaveLength(2);
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

  it("keeps the list role that a list without markers loses in Safari", async () => {
    const screen = await render(
      <>
        <List data-testid="plain">
          <ListItem title="A" />
        </List>
        <List numbered data-testid="numbered">
          <ListItem title="A" />
        </List>
      </>,
    );

    await expect
      .element(screen.getByTestId("plain"))
      .toHaveAttribute("role", "list");
    await expect
      .element(screen.getByTestId("numbered"))
      .toHaveAttribute("role", "list");
  });

  it.each(["page", "step", "location"] as const)(
    "marks a selected link as the current %s",
    async (kind) => {
      const screen = await render(
        <List>
          <ListItem title="Paradiddle" href="#paradiddle" selected={kind} />
        </List>,
      );

      await expect
        .element(screen.getByRole("link", { name: "Paradiddle" }))
        .toHaveAttribute("aria-current", kind);
    },
  );

  it("keeps a trailing control beside the row's link or button, never inside it", async () => {
    const onRow = vi.fn();
    const onPlay = vi.fn();
    const screen = await render(
      <div style={wide}>
        <List data-testid="list">
          <ListItem
            title="Paradiddle"
            onClick={onRow}
            trailing={
              <button type="button" onClick={onPlay}>
                Play
              </button>
            }
          />
          <ListItem
            title="Flam"
            href="#flam"
            trailing={
              <button type="button" onClick={onPlay}>
                Play flam
              </button>
            }
          />
        </List>
      </div>,
    );
    const list = screen.getByTestId("list").element();

    expect(list.querySelector("button button, a button")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Play" }));

    expect(onPlay).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
  });

  it("opens the row from a click on its trailing text", async () => {
    const onRow = vi.fn();
    const screen = await render(
      <div style={wide}>
        <List>
          <ListItem title="Paradiddle" onClick={onRow} trailing="80 BPM" />
        </List>
      </div>,
    );

    const end = screen.getByText("80 BPM").element().getBoundingClientRect();
    const target = document.elementFromPoint(
      end.left + end.width / 2,
      end.top + end.height / 2,
    );

    expect(target).toBe(screen.getByRole("button").element());
    (target as HTMLElement).click();
    expect(onRow).toHaveBeenCalledOnce();
  });

  it("lays an interactive row out exactly like a static one", async () => {
    const screen = await render(
      <div style={wide}>
        <List variant="contained" numbered>
          <ListItem
            leading={<span>L</span>}
            title="Static"
            description="70 BPM"
            trailing={<span data-testid="static-end">T</span>}
            data-testid="static"
          />
          <ListItem
            leading={<span>L</span>}
            title="Linked"
            description="70 BPM"
            trailing={<span data-testid="linked-end">T</span>}
            href="#linked"
            data-testid="linked"
          />
          <ListItem title="Bare" data-testid="bare" />
          <ListItem title="Open" href="#open" data-testid="open" />
          <ListItem title="Last" />
        </List>
      </div>,
    );
    const box = (id: string) =>
      screen.getByTestId(id).element().getBoundingClientRect();
    const text = (name: string) =>
      screen.getByText(name, { exact: true }).element().getBoundingClientRect();

    expect(box("linked").height).toBe(box("static").height);
    expect(box("open").height).toBe(box("bare").height);
    expect(text("Linked").left).toBe(text("Static").left);
    expect(text("Linked").top - box("linked").top).toBe(
      text("Static").top - box("static").top,
    );
    expect(text("Open").left).toBe(text("Bare").left);
    expect(text("Open").width).toBe(text("Bare").width);
    expect(box("linked-end").right).toBe(box("static-end").right);
    expect(box("linked-end").top - box("linked").top).toBe(
      box("static-end").top - box("static").top,
    );
  });

  it("keeps a long trailing value inside the row and leaves the title room", async () => {
    const screen = await render(
      <div style={wide}>
        <List variant="contained" data-testid="list">
          <ListItem
            title="Single Stroke Roll"
            trailing="Seventy beats per minute for the first three minutes, then eighty"
          />
          <ListItem
            title="Double Stroke Roll"
            href="#double"
            trailing="Sixty beats per minute for the first three minutes, then seventy"
          />
        </List>
      </div>,
    );
    const list = screen.getByTestId("list").element();

    expect(list.scrollWidth).toBe(list.clientWidth);
    for (const title of ["Single Stroke Roll", "Double Stroke Roll"]) {
      expect(
        screen.getByText(title).element().getBoundingClientRect().width,
      ).toBeGreaterThan(120);
    }
  });

  it("does not number the rows of a plain list nested in a numbered one", async () => {
    const screen = await render(
      <List numbered>
        <ListItem
          title="Outer"
          trailing={
            <List data-testid="inner">
              <ListItem title="Inner" />
            </List>
          }
        />
      </List>,
    );

    expect(
      getComputedStyle(
        screen
          .getByTestId("inner")
          .element()
          .querySelector("li > *") as Element,
        "::before",
      ).content,
    ).toBe("none");
  });

  it("shows focus on the selected row in forced colours", async () => {
    const session = cdp() as unknown as {
      send: (method: string, params: object) => Promise<unknown>;
    };
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
    });
    const screen = await render(
      <List>
        <ListItem title="A" onClick={() => undefined} />
        <ListItem title="B" onClick={() => undefined} selected />
      </List>,
    );
    const selected = screen.getByRole("button", { name: "B" }).element();
    const resting = getComputedStyle(selected).outlineStyle;

    await userEvent.keyboard("{Tab}{Tab}");
    const focused = getComputedStyle(selected).outlineStyle;
    await session.send("Emulation.setEmulatedMedia", { features: [] });

    expect(document.activeElement).toBe(selected);
    expect(resting).toBe("none");
    expect(focused).not.toBe("none");
  });

  it("leaves the row alone when anything in its actions is clicked", async () => {
    const onRow = vi.fn();
    const onPlay = vi.fn();
    const screen = await render(
      <div style={wide}>
        <List>
          <ListItem
            title="Paradiddle"
            onClick={onRow}
            trailing="80 BPM"
            actions={<span>Play</span>}
          />
        </List>
      </div>,
    );
    const play = screen.getByText("Play").element();
    const box = play.getBoundingClientRect();
    const target = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );

    play.addEventListener("click", onPlay);

    expect(target).toBe(play);
    (target as HTMLElement).click();
    expect(onPlay).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
    expect(
      screen.getByText("80 BPM").element().getBoundingClientRect().right,
    ).toBeLessThan(box.left);
  });

  it("shows actions on a static row after its trailing content", async () => {
    const screen = await render(
      <div style={wide}>
        <List>
          <ListItem
            title="Paradiddle"
            trailing="80 BPM"
            actions={<button type="button">Play</button>}
          />
        </List>
      </div>,
    );

    expect(
      screen.getByText("80 BPM").element().getBoundingClientRect().right,
    ).toBeLessThan(
      screen.getByRole("button").element().getBoundingClientRect().left,
    );
  });

  it("keeps a role its owner asks for", async () => {
    const asked = { role: "presentation" } as const;
    const screen = await render(
      <List {...asked} data-testid="list">
        <ListItem title="A" />
      </List>,
    );

    await expect
      .element(screen.getByTestId("list"))
      .toHaveAttribute("role", "presentation");
  });

  it.each([
    ["static", {}],
    ["linked", { href: "#paradiddle" }],
  ] as const)(
    "keeps every action of a %s row inside a narrow list and clickable",
    async (_kind, action) => {
      const screen = await render(
        <div style={{ inlineSize: "180px" }}>
          <List variant="contained" data-testid="list">
            <ListItem
              title="Paradiddle"
              {...action}
              actions={
                <>
                  <button type="button">Play</button>
                  <button type="button">Save</button>
                  <button type="button">Share</button>
                </>
              }
            />
          </List>
        </div>,
      );
      const list = screen.getByTestId("list").element().getBoundingClientRect();

      for (const name of ["Play", "Save", "Share"]) {
        const button = screen.getByRole("button", { name }).element();
        const box = button.getBoundingClientRect();

        expect(box.left).toBeGreaterThanOrEqual(list.left);
        expect(box.right).toBeLessThanOrEqual(list.right);
        expect(
          document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          ),
        ).toBe(button);
      }
    },
  );

  it("starts the numbering where it is told to", async () => {
    const screen = await render(
      <List numbered start={5} aria-label="Queue">
        <ListItem title="First" />
        <ListItem title="Second" />
      </List>,
    );
    const list = screen.getByRole("list", { name: "Queue" }).element();
    expect(getComputedStyle(list).counterReset).toBe("dusty-list 4");
  });

  it("passes action props and a ref to the link or button of a row", async () => {
    let link: HTMLAnchorElement | null = null;
    let button: HTMLButtonElement | null = null;
    const screen = await render(
      <List aria-label="Files">
        <ListItem
          title="Report"
          href="/report.pdf"
          className="row"
          actionProps={{
            download: "report.pdf",
            rel: "noopener",
            className: "mine",
            ref: (element) => {
              link = element;
            },
          }}
        />
        <ListItem
          title="Rename"
          onClick={() => undefined}
          actionProps={{
            "aria-describedby": "hint",
            ref: (element) => {
              button = element;
            },
          }}
        />
      </List>,
    );
    const report = screen.getByRole("link", { name: "Report" });
    const rename = screen.getByRole("button", { name: "Rename" });

    await expect.element(report).toHaveAttribute("download", "report.pdf");
    await expect.element(report).toHaveAttribute("rel", "noopener");
    await expect.element(report).toHaveAttribute("href", "/report.pdf");
    await expect.element(report).toHaveClass("mine");
    expect(report.element().className).not.toBe("mine");
    expect(report.element().closest("li")).toHaveClass("row");
    await expect.element(rename).toHaveAttribute("aria-describedby", "hint");
    await expect.element(rename).toHaveAttribute("type", "button");
    expect(link).toBe(report.element());
    expect(button).toBe(rename.element());
  });
});
