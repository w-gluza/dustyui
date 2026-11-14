import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getInitials } from "./getInitials.js";

describe("getInitials", () => {
  it("takes the first letter of the first and last word", () => {
    assert.equal(getInitials("Wioletta Gluza"), "WG");
  });

  it("skips middle names", () => {
    assert.equal(getInitials("Ada King Lovelace"), "AL");
  });

  it("returns one letter for a single word", () => {
    assert.equal(getInitials("Madonna"), "M");
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    assert.equal(getInitials("  Grace \t  Hopper\n"), "GH");
  });

  it("returns an empty string when there is no name", () => {
    assert.equal(getInitials(""), "");
    assert.equal(getInitials("   "), "");
  });

  it("keeps the original letter case", () => {
    assert.equal(getInitials("bell hooks"), "bh");
  });

  it("keeps an accented letter whole when it is written as two code points", () => {
    assert.equal(getInitials("E\u0301mile Zola"), "E\u0301Z");
  });

  it("keeps an emoji made of several code points whole", () => {
    assert.equal(getInitials("👩‍🚀 Ride"), "👩‍🚀R");
  });
});
