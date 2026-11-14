import { isIdentifier } from "./isIdentifier.js";
import { getSymbolText } from "./safeRead.js";

export const ROOT_ID = "$";

export type PathStep =
  | { readonly type: "property"; readonly key: string }
  | {
      readonly type: "symbol";
      readonly key: symbol;
      readonly position: number;
    }
  | { readonly type: "index"; readonly index: number }
  | { readonly type: "entry"; readonly index: number }
  | { readonly type: "item"; readonly index: number }
  | { readonly type: "entryKey" }
  | { readonly type: "entryValue" }
  | { readonly type: "hole"; readonly index: number }
  | { readonly type: "rest" };

const CANONICAL_INDEX = /^(?:0|[1-9]\d*)$/u;
const MAX_ARRAY_INDEX = 2 ** 32 - 2;

export function getArrayIndex(key: string): number | undefined {
  if (!CANONICAL_INDEX.test(key)) {
    return undefined;
  }
  const index = Number(key);
  return index <= MAX_ARRAY_INDEX ? index : undefined;
}

function getSegment(step: PathStep): string {
  switch (step.type) {
    case "property":
      return `.${step.key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
    case "symbol":
      return `@${step.position}`;
    case "index":
    case "hole":
      return `[${step.index}]`;
    case "entry":
    case "item":
      return `#${step.index}`;
    case "entryKey":
      return "key";
    case "entryValue":
      return "value";
    case "rest":
      return "rest";
  }
}

export function getChildId(parentId: string, step: PathStep): string {
  return `${parentId}/${getSegment(step)}`;
}

export function getPath(parentPath: string, step: PathStep): string {
  switch (step.type) {
    case "property":
      return isIdentifier(step.key)
        ? `${parentPath}.${step.key}`
        : `${parentPath}[${JSON.stringify(step.key)}]`;
    case "symbol":
      return `${parentPath}[${getSymbolText(step.key)}]`;
    case "index":
    case "hole":
      return `${parentPath}[${step.index}]`;
    case "entry":
      return `${parentPath}[entry ${step.index}]`;
    case "item":
      return `${parentPath}[item ${step.index}]`;
    case "entryKey":
      return `${parentPath}.key`;
    case "entryValue":
      return `${parentPath}.value`;
    case "rest":
      return `${parentPath}[…]`;
  }
}

export function getAncestorIds(id: string): string[] {
  const segments = id.split("/");
  return segments
    .slice(0, -1)
    .map((_segment, index) => segments.slice(0, index + 1).join("/"));
}
