import { getArrayIndex, type PathStep } from "./getPath.js";
import type { ValueKind } from "./getValueKind.js";
import {
  getArrayLength,
  getFailureReason,
  getMapEntries,
  getMapSize,
  getSetItems,
  getSetSize,
  getTypedArrayLength,
} from "./safeRead.js";

export const CHILD_LIMIT = 100_000;

export type ChildSource =
  | { readonly type: "value"; readonly value: unknown }
  | { readonly type: "getter" }
  | { readonly type: "failure"; readonly reason: string }
  | { readonly type: "entry"; readonly key: unknown; readonly value: unknown }
  | { readonly type: "hole"; readonly count: number }
  | { readonly type: "rest"; readonly count: number };

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

function addHole(children: Child[], start: number, end: number): void {
  if (end > start) {
    children.push({
      step: { type: "hole", index: start },
      source: { type: "hole", count: end - start },
    });
  }
}

function addProperties(
  children: Child[],
  target: object,
  length: number | undefined,
): number {
  const keys = Reflect.ownKeys(target);
  const indexed = length !== undefined;
  let symbolPosition = 0;
  let read = 0;
  let hasReadLength = false;
  let nextIndex = 0;

  for (const key of keys) {
    if (children.length >= CHILD_LIMIT) {
      break;
    }
    read++;
    hasReadLength ||= key === "length";
    const step = getPropertyStep(key, symbolPosition, indexed);
    if (step.type === "symbol") {
      symbolPosition++;
    }
    if (step.type !== "index" && nextIndex !== Infinity) {
      addHole(children, nextIndex, length ?? 0);
      nextIndex = Infinity;
    }
    const source = getPropertySource(target, key);
    if (source) {
      if (step.type === "index") {
        addHole(children, nextIndex, step.index);
        nextIndex = step.index + 1;
      }
      children.push({ step, source });
    }
  }
  if (read === keys.length) {
    addHole(children, nextIndex, length ?? 0);
  }

  const unread = keys.length - read;
  return unread > 0 && !hasReadLength && Array.isArray(target)
    ? unread - 1
    : unread;
}

function addLeadingItems(children: Child[], target: object): boolean {
  const start = children.length;
  for (let index = 0; index < CHILD_LIMIT; index++) {
    const source = getPropertySource(target, String(index));
    if (!source) {
      children.length = start;
      return false;
    }
    children.push({ step: { type: "index", index }, source });
  }
  return true;
}

function addMapEntries(children: Child[], target: object): number {
  for (const [key, value] of getMapEntries(target, CHILD_LIMIT)) {
    children.push({
      step: { type: "entry", index: children.length },
      source: { type: "entry", key, value },
    });
  }
  return getMapSize(target) - children.length;
}

function addSetItems(children: Child[], target: object): number {
  for (const value of getSetItems(target, CHILD_LIMIT)) {
    children.push({
      step: { type: "item", index: children.length },
      source: { type: "value", value },
    });
  }
  return getSetSize(target) - children.length;
}

function getListLength(target: object): number | undefined {
  try {
    return getTypedArrayLength(target);
  } catch {
    return getArrayLength(target);
  }
}

export function getEntryChildren(key: unknown, value: unknown): Child[] {
  return [
    { step: { type: "entryKey" }, source: { type: "value", value: key } },
    { step: { type: "entryValue" }, source: { type: "value", value } },
  ];
}

export function getChildren(target: object, kind: ValueKind): Child[] {
  const children: Child[] = [];
  let hidden = 0;

  if (kind === "map") {
    hidden += addMapEntries(children, target);
  }
  if (kind === "set") {
    hidden += addSetItems(children, target);
  }
  const length = kind === "array" ? getListLength(target) : undefined;
  if (
    length !== undefined &&
    length > CHILD_LIMIT &&
    addLeadingItems(children, target)
  ) {
    hidden += length - CHILD_LIMIT;
  } else {
    hidden += addProperties(children, target, length);
  }
  if (hidden > 0) {
    children.push({
      step: { type: "rest" },
      source: { type: "rest", count: hidden },
    });
  }
  return children;
}
