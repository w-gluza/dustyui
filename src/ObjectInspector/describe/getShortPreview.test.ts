import { describe, expect, it } from "vitest";
import { getShortPreview } from "./getShortPreview.js";

describe("getShortPreview", () => {
  it.each([
    ["array", "Array(7) [{…}, {…}, …]", "Array(7)"],
    ["array", "Uint8Array(3) [1, 2, 3]", "Uint8Array(3)"],
    ["map", 'Map(2) {"a" => 1, "b" => 2}', "Map(2)"],
    ["set", "Set(1) {1}", "Set(1)"],
    ["object", '{name: "Yosemite", area: 3027}', "{…}"],
    ["object", 'Park {name: "Yosemite"}', "Park"],
    ["object", "{…}", "{…}"],
    ["object", "{}", "{}"],
    ["error", "TypeError: nope", "TypeError: nope"],
    ["function", "ƒ run()", "ƒ run()"],
  ] as const)("shortens a %s preview of %s to %s", (kind, preview, short) => {
    expect(getShortPreview(kind, preview)).toBe(short);
  });
});
