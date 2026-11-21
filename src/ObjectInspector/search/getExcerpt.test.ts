import { describe, expect, it } from "vitest";
import { getExcerpt } from "./getExcerpt.js";

const long = `${"a".repeat(300)} condor ${"b".repeat(300)}`;

describe("getExcerpt", () => {
  it("keeps text that fits", () => {
    expect(getExcerpt("short", "or", 80)).toBe("short");
  });

  it("cuts long text at the limit when nothing is searched", () => {
    expect(getExcerpt(long, "", 80)).toBe(`${"a".repeat(80)}…`);
  });

  it("cuts at the limit when the match is inside the cut", () => {
    expect(getExcerpt(`condor ${long}`, "condor", 80)).toMatch(/^condor a+…$/u);
  });

  it("cuts at the limit when there is no match", () => {
    expect(getExcerpt(long, "zeppelin", 80)).toBe(`${"a".repeat(80)}…`);
  });

  it("moves the window to a match that lies past the cut", () => {
    const excerpt = getExcerpt(long, "Condor", 80);

    expect(excerpt).toContain(" condor ");
    expect(excerpt.startsWith("…")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).toHaveLength(82);
  });

  it("drops the closing ellipsis when the window reaches the end", () => {
    expect(getExcerpt(`${"a".repeat(300)} condor`, "condor", 80)).toMatch(
      /^…a+ condor$/u,
    );
  });

  it("never leaves half of a character pair at either end", () => {
    const text = `${"😀".repeat(200)}condor${"😀".repeat(200)}`;

    expect(getExcerpt(text, "condor", 81).isWellFormed()).toBe(true);
  });
});
