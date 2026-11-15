import type { InspectorNode } from "./describe/describe.js";

export function getTypeText({ kind, typeName }: InspectorNode): string {
  switch (kind) {
    case "string":
      return "String";
    case "number":
      return "Number";
    case "bigint":
      return "BigInt";
    case "boolean":
      return "Boolean";
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    case "symbol":
      return "Symbol";
    case "function":
      return "Function";
    case "array":
      return typeName ?? "Array";
    case "object":
      return typeName ?? "Object";
    case "map":
      return "Map";
    case "set":
      return "Set";
    case "date":
      return "Date";
    case "regexp":
      return "RegExp";
    case "error":
      return typeName ?? "Error";
    case "entry":
      return "Map entry";
    case "getter":
      return "Getter (not run)";
    case "circular":
      return "Circular reference";
    case "uninspectable":
      return "Could not be read";
    case "hole":
      return "Empty items";
    case "range":
      return "Range";
  }
}
