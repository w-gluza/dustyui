import {
  getArrayIndex,
  getSegment,
  type PathStep,
  type RangeUnit,
} from "./getPath.js";
import type { ValueKind } from "./getValueKind.js";
import {
  getArrayLength,
  getFailureReason,
  getMapIterator,
  getMapSize,
  getSetIterator,
  getSetSize,
  getTypedArrayLength,
} from "./safeRead.js";

export const KEY_SCAN_LIMIT = 100_000;

export type ChildSource =
  | { readonly type: "value"; readonly value: unknown }
  | { readonly type: "getter" }
  | { readonly type: "failure"; readonly reason: string }
  | { readonly type: "entry"; readonly key: unknown; readonly value: unknown }
  | { readonly type: "hole"; readonly count: number };

export interface Child {
  readonly step: PathStep;
  readonly source: ChildSource;
}

export interface ChildList {
  readonly unit: RangeUnit;
  readonly size: number;
  read(start: number, count: number): Child[];
  find(segment: string): number | undefined;
}

const INDEX_SEGMENT = /^\[(\d+)\]$/u;
const POSITION_SEGMENT = /^#(\d+)$/u;

function getPosition(pattern: RegExp, segment: string): number | undefined {
  const digits = pattern.exec(segment)?.[1];
  return digits === undefined ? undefined : Number(digits);
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

export function getIndexList(target: object, length: number): ChildList {
  return {
    unit: "items",
    size: length,
    read(start, count) {
      const children: Child[] = [];
      const end = Math.min(start + count, length);
      let holeStart: number | undefined;

      function closeHole(at: number) {
        if (holeStart !== undefined) {
          children.push({
            step: { type: "hole", index: holeStart },
            source: { type: "hole", count: at - holeStart },
          });
          holeStart = undefined;
        }
      }

      for (let index = start; index < end; index++) {
        const source = getPropertySource(target, String(index));
        if (source) {
          closeHole(index);
          children.push({ step: { type: "index", index }, source });
        } else {
          holeStart ??= index;
        }
      }
      closeHole(end);
      return children;
    },
    find: (segment) => getPosition(INDEX_SEGMENT, segment),
  };
}

function getIteratedList<Item>(
  unit: RangeUnit,
  size: number,
  open: () => () => IteratorResult<Item>,
  toChild: (item: Item, index: number) => Child,
): ChildList {
  let next = open();
  let cursor = 0;

  return {
    unit,
    size,
    read(start, count) {
      if (start < cursor) {
        next = open();
        cursor = 0;
      }
      while (cursor < start) {
        if (next().done) {
          return [];
        }
        cursor++;
      }
      const children: Child[] = [];
      while (children.length < count) {
        const result = next();
        if (result.done) {
          break;
        }
        children.push(toChild(result.value, cursor));
        cursor++;
      }
      return children;
    },
    find: (segment) => getPosition(POSITION_SEGMENT, segment),
  };
}

function getMapList(target: object): ChildList {
  return getIteratedList(
    "entries",
    getMapSize(target),
    () => getMapIterator(target),
    ([key, value], index) => ({
      step: { type: "entry", index },
      source: { type: "entry", key, value },
    }),
  );
}

function getSetList(target: object): ChildList {
  return getIteratedList(
    "items",
    getSetSize(target),
    () => getSetIterator(target),
    (value, index) => ({
      step: { type: "item", index },
      source: { type: "value", value },
    }),
  );
}

function isIndexKey(key: string | symbol): boolean {
  return typeof key === "string" && getArrayIndex(key) !== undefined;
}

function getPropertyList(target: object, hasIndexes: boolean): ChildList {
  const own = Reflect.ownKeys(target);
  const keys = hasIndexes ? own.filter((key) => !isIndexKey(key)) : own;
  const firstSymbol = keys.findIndex((key) => typeof key === "symbol");
  let positions: Map<string, number> | undefined;

  function toStep(key: string | symbol, position: number): PathStep {
    return typeof key === "symbol"
      ? { type: "symbol", key, position: position - firstSymbol }
      : { type: "property", key };
  }

  return {
    unit: "properties",
    size: keys.length,
    read(start, count) {
      const children: Child[] = [];
      const end = Math.min(start + count, keys.length);
      for (let position = start; position < end; position++) {
        const key = keys[position];
        const source =
          key === undefined ? undefined : getPropertySource(target, key);
        if (key !== undefined && source) {
          children.push({ step: toStep(key, position), source });
        }
      }
      return children;
    },
    find(segment) {
      positions ??= new Map(
        keys.map((key, position) => [
          getSegment(toStep(key, position)),
          position,
        ]),
      );
      return positions.get(segment);
    },
  };
}

export function getListLength(target: object): number | undefined {
  try {
    return getTypedArrayLength(target);
  } catch {
    return getArrayLength(target);
  }
}

export function getEntryList(key: unknown, value: unknown): ChildList {
  const children: Child[] = [
    { step: { type: "entryKey" }, source: { type: "value", value: key } },
    { step: { type: "entryValue" }, source: { type: "value", value } },
  ];
  return {
    unit: "properties",
    size: children.length,
    read: (start, count) => children.slice(start, start + count),
    find(segment) {
      const position = children.findIndex(
        (child) => getSegment(child.step) === segment,
      );
      return position < 0 ? undefined : position;
    },
  };
}

function getCollectionList(
  target: object,
  kind: ValueKind,
): ChildList | undefined {
  switch (kind) {
    case "map":
      return getMapList(target);
    case "set":
      return getSetList(target);
    case "array": {
      const length = getListLength(target);
      return length === undefined ? undefined : getIndexList(target, length);
    }
    default:
      return undefined;
  }
}

export function getChildLists(target: object, kind: ValueKind): ChildList[] {
  const collection = getCollectionList(target, kind);
  const hasIndexes = collection !== undefined && kind === "array";
  const lists = collection ? [collection] : [];
  if (!hasIndexes || collection.size <= KEY_SCAN_LIMIT) {
    lists.push(getPropertyList(target, hasIndexes));
  }
  return lists.filter((list) => list.size > 0);
}
