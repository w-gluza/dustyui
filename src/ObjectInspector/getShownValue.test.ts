import { describe, expect, it } from "vitest";
import { getShownValue } from "./getShownValue.js";

describe("getShownValue", () => {
  it("shows a short text whole", () => {
    expect(getShownValue("heron")).toEqual({ text: "heron", isWhole: true });
  });

  it("shows the start of a long text and marks the cut", () => {
    const shown = getShownValue("a".repeat(3000));

    expect(shown.text).toBe(`${"a".repeat(2000)}…`);
    expect(shown.isWhole).toBe(false);
  });

  it("moves to the first match when it lies beyond the start", () => {
    const text = `${"a".repeat(5000)}Heron${"b".repeat(5000)}`;

    const shown = getShownValue(text, " heron ");

    expect(shown.text.startsWith(`…${"a".repeat(200)}Heron`)).toBe(true);
    expect(shown.text.endsWith("b…")).toBe(true);
    expect(shown.text).toHaveLength(2002);
  });

  it("stays at the start when the match is already in view or missing", () => {
    const text = `${"a".repeat(100)}heron${"b".repeat(5000)}`;

    expect(getShownValue(text, "heron").text.startsWith("aaa")).toBe(true);
    expect(getShownValue(text, "stork").text.startsWith("aaa")).toBe(true);
  });
});
