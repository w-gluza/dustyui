import type { NodeLabel } from "./describe/describe.js";

export function getLabelText(label: NodeLabel): string {
  switch (label.type) {
    case "property":
      return label.key === "" ? '""' : label.key;
    case "symbol":
      return Symbol.prototype.toString.call(label.key);
    case "index":
    case "entry":
      return String(label.index);
    case "entryKey":
      return "key";
    case "entryValue":
      return "value";
  }
}
