import { describe as suite, expect, it } from "vitest";
import { getTruncatedText } from "./getTruncatedText.js";

suite("getTruncatedText", () => {
  it("returns short text unchanged", () => {
    expect(getTruncatedText("heron", 5)).toBe("heron");
    expect(getTruncatedText("", 5)).toBe("");
  });

  it("cuts longer text and marks the cut", () => {
    expect(getTruncatedText("kingfisher", 4)).toBe("king…");
  });

  it("counts a character outside the basic plane once and never splits it", () => {
    expect(getTruncatedText("🦆🦆🦆", 3)).toBe("🦆🦆🦆");
    expect(getTruncatedText("🦆🦆🦆🦆", 3)).toBe("🦆🦆🦆…");
    expect(getTruncatedText("a🦆b🦆c", 2)).toBe("a🦆…");
  });

  it("reads only the start of a very long text", () => {
    const long = "a".repeat(50_000_000);

    expect(getTruncatedText(long, 3)).toBe("aaa…");
  });
});
