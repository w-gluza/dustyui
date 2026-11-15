import {
  getDateTime,
  getMapSize,
  getRegExpSource,
  getSetSize,
  getTypedArrayLength,
} from "./safeRead.js";

export type ValueKind =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "null"
  | "undefined"
  | "symbol"
  | "function"
  | "array"
  | "object"
  | "map"
  | "set"
  | "date"
  | "regexp"
  | "error"
  | "entry"
  | "getter"
  | "circular"
  | "uninspectable"
  | "hole"
  | "range";

function succeeds(read: () => unknown): boolean {
  try {
    read();
    return true;
  } catch {
    return false;
  }
}

function isRegExp(value: object): boolean {
  return value !== RegExp.prototype && succeeds(() => getRegExpSource(value));
}

function isError(value: object): boolean {
  return typeof Error.isError === "function"
    ? Error.isError(value)
    : value instanceof Error;
}

function isTypedArray(value: object): boolean {
  return (
    ArrayBuffer.isView(value) && succeeds(() => getTypedArrayLength(value))
  );
}

function hasPlainPrototype(value: object): boolean {
  try {
    const prototype: unknown = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function getObjectKind(value: object): ValueKind {
  if (Array.isArray(value) || isTypedArray(value)) {
    return "array";
  }
  if (hasPlainPrototype(value)) {
    return "object";
  }
  if (succeeds(() => getMapSize(value))) {
    return "map";
  }
  if (succeeds(() => getSetSize(value))) {
    return "set";
  }
  if (succeeds(() => getDateTime(value))) {
    return "date";
  }
  if (isRegExp(value)) {
    return "regexp";
  }
  if (isError(value)) {
    return "error";
  }
  return "object";
}

export function getValueKind(value: unknown): ValueKind {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "object":
      return getObjectKind(value);
    default:
      return typeof value;
  }
}
