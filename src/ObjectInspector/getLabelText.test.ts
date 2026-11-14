import { describe, expect, it } from "vitest";
import { getLabelText } from "./getLabelText.js";

describe("getLabelText", () => {
  it.each([
    [{ type: "property", key: "name" } as const, "name"],
    [{ type: "property", key: "" } as const, '""'],
    [{ type: "symbol", key: Symbol("tag") } as const, "Symbol(tag)"],
    [{ type: "index", index: 3 } as const, "3"],
    [{ type: "entry", index: 0 } as const, "0"],
    [{ type: "entryKey" } as const, "key"],
    [{ type: "entryValue" } as const, "value"],
  ])("turns %o into %s", (label, text) => {
    expect(getLabelText(label)).toBe(text);
  });
});
