import { getArrayIndex, type PathStep } from "./getPath.js";
import type { ValueKind } from "./getValueKind.js";
import { getFailureReason } from "./safeRead.js";

export type ChildSource =
  | { readonly type: "value"; readonly value: unknown }
  | { readonly type: "getter" }
  | { readonly type: "failure"; readonly reason: string }
  | { readonly type: "entry"; readonly key: unknown; readonly value: unknown };

export interface Child {
  readonly step: PathStep;
  readonly source: ChildSource;
}

function getPropertySource(
  target: object,
  key: PropertyKey,
): ChildSource | undefined {
  try {
    const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
    if (!descriptor?.enumerable) {
      return undefined;
    }
    return "value" in descriptor
      ? { type: "value", value: descriptor.value }
      : { type: "getter" };
  } catch (error) {
    return { type: "failure", reason: getFailureReason(error) };
  }
}

function getPropertyStep(
  key: string | symbol,
  symbolPosition: number,
  indexed: boolean,
): PathStep {
  if (typeof key === "symbol") {
    return { type: "symbol", key, position: symbolPosition };
  }
  const index = indexed ? getArrayIndex(key) : undefined;
  return index === undefined
    ? { type: "property", key }
    : { type: "index", index };
}

function getPropertyChildren(target: object, indexed: boolean): Child[] {
  const children: Child[] = [];
  let symbolPosition = 0;

  for (const key of Reflect.ownKeys(target)) {
    const step = getPropertyStep(key, symbolPosition, indexed);
    if (step.type === "symbol") {
      symbolPosition++;
    }
    const source = getPropertySource(target, key);
    if (source) {
      children.push({ step, source });
    }
  }

  return children;
}

function getMapChildren(target: object): Child[] {
  const children: Child[] = [];
  Map.prototype.forEach.call(target, (value: unknown, key: unknown) => {
    children.push({
      step: { type: "entry", index: children.length },
      source: { type: "entry", key, value },
    });
  });
  return children;
}

function getSetChildren(target: object): Child[] {
  const children: Child[] = [];
  Set.prototype.forEach.call(target, (value: unknown) => {
    children.push({
      step: { type: "item", index: children.length },
      source: { type: "value", value },
    });
  });
  return children;
}

export function getEntryChildren(key: unknown, value: unknown): Child[] {
  return [
    { step: { type: "entryKey" }, source: { type: "value", value: key } },
    { step: { type: "entryValue" }, source: { type: "value", value } },
  ];
}

export function getChildren(target: object, kind: ValueKind): Child[] {
  const properties = getPropertyChildren(target, kind === "array");
  switch (kind) {
    case "map":
      return [...getMapChildren(target), ...properties];
    case "set":
      return [...getSetChildren(target), ...properties];
    default:
      return properties;
  }
}
