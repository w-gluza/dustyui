import type { ValueKind } from "./getValueKind.js";

const ELLIPSIS = "…";

function before(text: string, mark: string): string {
  const at = text.indexOf(mark);
  return at < 0 ? text : text.slice(0, at);
}

export function getShortPreview(kind: ValueKind, preview: string): string {
  switch (kind) {
    case "array":
      return before(preview, " [");
    case "map":
    case "set":
      return before(preview, " {");
    case "object":
      if (preview === "{}") {
        return preview;
      }
      return preview.startsWith("{") ? `{${ELLIPSIS}}` : before(preview, " {");
    default:
      return preview;
  }
}
