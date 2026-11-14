import { getTruncatedText } from "./getTruncatedText.js";

const TYPE_NAME_LIMIT = 80;
const CLASS_SOURCE = /^class[\s{]/u;

function nativeGetter<Prototype extends object, Name extends keyof Prototype>(
  prototype: Prototype,
  name: Name,
): (target: unknown) => Prototype[Name] {
  const get = Object.getOwnPropertyDescriptor(prototype, name)?.get as
    ((this: unknown) => Prototype[Name]) | undefined;
  if (!get) {
    throw new TypeError(`Missing native getter: ${String(name)}`);
  }
  return (target) => get.call(target);
}

const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype) as Pick<
  Uint8Array,
  "length"
>;
const getTime = Date.prototype.getTime;
const functionToString = Function.prototype.toString;
const symbolToString = Symbol.prototype.toString;
const mapEntries = Map.prototype.entries;
const setValues = Set.prototype.values;
const mapIteratorNext = (
  Object.getPrototypeOf(new Map().entries()) as Iterator<
    readonly [unknown, unknown]
  >
).next as (this: unknown) => IteratorResult<readonly [unknown, unknown]>;
const setIteratorNext = (
  Object.getPrototypeOf(new Set().values()) as Iterator<unknown>
).next as (this: unknown) => IteratorResult<unknown>;

export const getMapSize = nativeGetter(Map.prototype, "size");
export const getSetSize = nativeGetter(Set.prototype, "size");
export const getTypedArrayLength = nativeGetter(typedArrayPrototype, "length");
export const getRegExpSource = nativeGetter(RegExp.prototype, "source");

const regExpFlags: readonly (readonly [
  string,
  (target: unknown) => boolean,
])[] = (
  [
    ["d", "hasIndices"],
    ["g", "global"],
    ["i", "ignoreCase"],
    ["m", "multiline"],
    ["s", "dotAll"],
    ["u", "unicode"],
    ["v", "unicodeSets"],
    ["y", "sticky"],
  ] as const
).flatMap(([flag, name]) =>
  Object.getOwnPropertyDescriptor(RegExp.prototype, name)?.get
    ? [[flag, nativeGetter(RegExp.prototype, name)] as const]
    : [],
);

function take<Item>(next: () => IteratorResult<Item>, limit: number): Item[] {
  const items: Item[] = [];
  while (items.length < limit) {
    const result = next();
    if (result.done) {
      break;
    }
    items.push(result.value);
  }
  return items;
}

export function getMapEntries(
  target: object,
  limit: number,
): (readonly [unknown, unknown])[] {
  const iterator: unknown = mapEntries.call(target);
  return take(() => mapIteratorNext.call(iterator), limit);
}

export function getSetItems(target: object, limit: number): unknown[] {
  const iterator: unknown = setValues.call(target);
  return take(() => setIteratorNext.call(iterator), limit);
}

export function getDateTime(value: object): number {
  return getTime.call(value);
}

export function getRegExpText(value: object): string {
  const flags = regExpFlags
    .filter(([, isSet]) => isSet(value))
    .map(([flag]) => flag)
    .join("");
  return `/${getRegExpSource(value)}/${flags}`;
}

export function getSymbolText(value: symbol): string {
  return symbolToString.call(value);
}

export function isClass(value: object): boolean {
  return CLASS_SOURCE.test(functionToString.call(value));
}

export function getDataProperty(target: object, key: PropertyKey): unknown {
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

export function getArrayLength(value: unknown): number | undefined {
  try {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const length = getDataProperty(value, "length");
    return typeof length === "number" ? length : undefined;
  } catch {
    return undefined;
  }
}

export function getConstructorName(value: object): string | undefined {
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype === null) {
    return undefined;
  }
  const constructor = getDataProperty(prototype, "constructor");
  if (typeof constructor !== "function") {
    return undefined;
  }
  const name = getDataProperty(constructor, "name");
  return typeof name === "string" && name !== ""
    ? getTruncatedText(name, TYPE_NAME_LIMIT)
    : undefined;
}

export function getFailureReason(error: unknown): string {
  try {
    if (typeof error === "string") {
      return error;
    }
    if (typeof error === "object" && error !== null) {
      const message = getDataProperty(error, "message");
      if (typeof message === "string" && message !== "") {
        return message;
      }
    }
  } catch {
    return "unknown error";
  }
  return "unknown error";
}
