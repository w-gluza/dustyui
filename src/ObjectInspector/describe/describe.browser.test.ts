import { describe as suite, expect, it } from "vitest";
import { describeValue } from "./describe.js";

suite("describe with values from another frame", () => {
  it("recognises built-in types that come from another realm", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const realm = frame.contentWindow as (Window & typeof globalThis) | null;
    const foreign: unknown = realm?.eval(
      "({ map: new Map([[1, 2]]), set: new Set([1]), date: new Date(0), pattern: /a/g, list: [1], bytes: new Uint8Array(2), plain: { a: 1 }, failure: new RangeError('far'), act: function act() {} })",
    );
    const root = describeValue(foreign);
    const kinds = root.children().map((child) => child.kind);
    frame.remove();

    expect(foreign instanceof Object).toBe(false);
    expect(root.kind).toBe("object");
    expect(kinds).toEqual([
      "map",
      "set",
      "date",
      "regexp",
      "array",
      "array",
      "object",
      "error",
      "function",
    ]);
    expect(root.children().at(-2)?.preview).toBe("RangeError: far");
  });
});
