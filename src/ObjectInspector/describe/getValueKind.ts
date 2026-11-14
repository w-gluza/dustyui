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
  | "uninspectable";

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
  const { isError: nativeIsError } = Error as {
    isError?: (candidate: unknown) => boolean;
  };
  return nativeIsError ? nativeIsError(value) : value instanceof Error;
}

function getObjectKind(value: object): ValueKind {
  if (Array.isArray(value) || succeeds(() => getTypedArrayLength(value))) {
    return "array";
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
      return typeof value as ValueKind;
  }
}
