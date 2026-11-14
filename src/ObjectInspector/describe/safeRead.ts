function nativeGetter<T>(
  prototype: object,
  name: string,
): (target: unknown) => T {
  const get = Object.getOwnPropertyDescriptor(prototype, name)?.get;
  if (!get) {
    throw new TypeError(`Missing native getter: ${name}`);
  }
  return (target) => get.call(target) as T;
}

const typedArrayPrototype: object = Object.getPrototypeOf(Uint8Array.prototype);
const getTime = Date.prototype.getTime;
const functionToString = Function.prototype.toString;
const symbolToString = Symbol.prototype.toString;

export const getMapSize = nativeGetter<number>(Map.prototype, "size");
export const getSetSize = nativeGetter<number>(Set.prototype, "size");
export const getTypedArrayLength = nativeGetter<number>(
  typedArrayPrototype,
  "length",
);
export const getRegExpSource = nativeGetter<string>(RegExp.prototype, "source");

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
    ? [[flag, nativeGetter<boolean>(RegExp.prototype, name)] as const]
    : [],
);

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
  return functionToString.call(value).startsWith("class");
}

export function getDataProperty(target: object, key: PropertyKey): unknown {
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
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
  return typeof name === "string" && name !== "" ? name : undefined;
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
