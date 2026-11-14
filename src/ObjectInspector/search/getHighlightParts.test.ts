import fc from "fast-check";
import { describe as suite, expect, it } from "vitest";
import { getHighlightParts } from "./getHighlightParts.js";

suite("getHighlightParts", () => {
  it("splits the text around every match, keeping the original letters", () => {
    expect(getHighlightParts("Guanaco guanaco", "GUA")).toEqual([
      { text: "Gua", isMatch: true },
      { text: "naco ", isMatch: false },
      { text: "gua", isMatch: true },
      { text: "naco", isMatch: false },
    ]);
  });

  it("returns the whole text when nothing matches or the query is blank", () => {
    expect(getHighlightParts("Puma", "x")).toEqual([
      { text: "Puma", isMatch: false },
    ]);
    expect(getHighlightParts("Puma", " ")).toEqual([
      { text: "Puma", isMatch: false },
    ]);
  });

  it("leaves text alone when lower-casing changes its length", () => {
    expect(getHighlightParts("İstanbul", "i")).toEqual([
      { text: "İstanbul", isMatch: false },
    ]);
  });

  it("always adds back up to the original text", () => {
    fc.assert(
      fc.property(fc.string(), fc.string({ maxLength: 3 }), (text, query) => {
        const parts = getHighlightParts(text, query);

        expect(parts.map((part) => part.text).join("")).toBe(text);
      }),
      { numRuns: 500 },
    );
  });
});
