import { describe, expect, it } from "vitest";
import { getInitials } from "./getInitials.js";

describe("getInitials", () => {
  it("takes the first letter of the first and last word", () => {
    expect(getInitials("Wioletta Gluza")).toBe("WG");
  });

  it("skips middle names", () => {
    expect(getInitials("Ada King Lovelace")).toBe("AL");
  });

  it("returns one letter for a single word", () => {
    expect(getInitials("Madonna")).toBe("M");
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    expect(getInitials("  Grace \t  Hopper\n")).toBe("GH");
  });

  it("returns an empty string when there is no name", () => {
    expect(getInitials("")).toBe("");
    expect(getInitials("   ")).toBe("");
  });

  it("capitalises the initials", () => {
    expect(getInitials("bell hooks")).toBe("BH");
  });

  it("skips punctuation and words without a letter", () => {
    expect(getInitials("Ada Lovelace (she/her)")).toBe("AL");
    expect(getInitials("Ada Lovelace [admin]")).toBe("AL");
    expect(getInitials("- Ada")).toBe("A");
    expect(getInitials("Ada Lovelace -")).toBe("AL");
    expect(getInitials('"Grace" O\'Neil')).toBe("GO");
  });

  it("keeps an accented letter whole when it is written as two code points", () => {
    expect(getInitials("E\u0301mile Zola")).toBe("E\u0301Z");
  });

  it("keeps an emoji made of several code points whole", () => {
    expect(getInitials("👩‍🚀 Ride")).toBe("👩‍🚀R");
  });
});
