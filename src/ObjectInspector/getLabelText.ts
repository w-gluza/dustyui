import type { NodeLabel } from "./describe/describe.js";
import { getSymbolText } from "./describe/safeRead.js";

export function getLabelText(label: NodeLabel): string {
  switch (label.type) {
    case "property":
      return label.key === "" ? '""' : label.key;
    case "symbol":
      return getSymbolText(label.key);
    case "index":
    case "entry":
      return String(label.index);
    case "entryKey":
      return "key";
    case "entryValue":
      return "value";
    case "rest":
      return "…";
  }
}
