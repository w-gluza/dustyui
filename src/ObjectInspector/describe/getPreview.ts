import type { Child, ChildSource } from "./getChildren.js";
import { getEscapedText } from "./getEscapedText.js";
import { getTruncatedText } from "./getTruncatedText.js";
import { isIdentifier } from "./isIdentifier.js";
import { getValueKind, type ValueKind } from "./getValueKind.js";
import {
  getConstructorName,
  getDataProperty,
  getDateTime,
  getFailureReason,
  getMapSize,
  getRegExpText,
  getSetSize,
  getSymbolText,
  getTypedArrayLength,
  isClass,
} from "./safeRead.js";

export interface PreviewInput {
  readonly kind: ValueKind;
  readonly typeName: string | undefined;
  readonly detail: string;
  readonly source: ChildSource;
  readonly children: readonly Child[];
}

const MAX_TEXT_LENGTH = 80;
const MAX_NESTED_TEXT_LENGTH = 20;
const MAX_MEMBERS = 5;
const ELLIPSIS = "…";
const GETTER = "(...)";
const HEX_DIGITS_SHOWN = 16;
const DECIMAL_BIGINT_LIMIT = 10n ** 60n;

function quote(text: string, limit: number): string {
  return JSON.stringify(getTruncatedText(text, limit));
}

function withSize(name: string, size: number): string {
  return `${name}(${size})`;
}

function getArrayLength(value: object): number {
  try {
    return getTypedArrayLength(value);
  } catch {
    const length = getDataProperty(value, "length");
    return typeof length === "number" ? length : 0;
  }
}

function getUninspectablePreview(reason: string): string {
  return `Could not be read: ${getTruncatedText(reason, MAX_TEXT_LENGTH)}`;
}

function getFunctionPreview(value: object): string {
  const name = getDataProperty(value, "name");
  const label =
    typeof name === "string"
      ? getTruncatedText(name, MAX_NESTED_TEXT_LENGTH)
      : "";
  return isClass(value) ? `class ${label}`.trimEnd() : `ƒ ${label}()`;
}

function getBigIntPreview(value: bigint): string {
  if (value > -DECIMAL_BIGINT_LIMIT && value < DECIMAL_BIGINT_LIMIT) {
    return `${value}n`;
  }
  const sign = value < 0n ? "-" : "";
  const digits = (value < 0n ? -value : value).toString(16);
  return `${sign}0x${digits.slice(0, HEX_DIGITS_SHOWN)}${ELLIPSIS}n (${digits.length.toLocaleString("en-GB")} hex digits)`;
}

function getHolePreview(count: number): string {
  return `<${count.toLocaleString("en-GB")} empty ${count === 1 ? "item" : "items"}>`;
}

function getRestPreview(count: number): string {
  return `${count.toLocaleString("en-GB")} more not shown`;
}

function getDatePreview(value: object): string {
  const time = getDateTime(value);
  return Number.isNaN(time) ? "Invalid Date" : new Date(time).toISOString();
}

function getErrorPreview(value: object): string {
  const name = getConstructorName(value) ?? "Error";
  const message = getDataProperty(value, "message");
  return typeof message === "string" && message !== ""
    ? `${name}: ${getTruncatedText(message, MAX_TEXT_LENGTH)}`
    : name;
}

function getPrimitivePreview(
  value: unknown,
  kind: ValueKind,
  textLimit: number,
): string | undefined {
  switch (kind) {
    case "string":
      return quote(value as string, textLimit);
    case "number":
      return Object.is(value, -0) ? "-0" : String(value);
    case "bigint":
      return getBigIntPreview(value as bigint);
    case "boolean":
      return value === true ? "true" : "false";
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    case "symbol":
      return getTruncatedText(getSymbolText(value as symbol), textLimit);
    default:
      return undefined;
  }
}

function getNestedObjectPreview(value: object, kind: ValueKind): string {
  switch (kind) {
    case "function":
      return getFunctionPreview(value);
    case "array":
      return withSize(
        getConstructorName(value) ?? "Array",
        getArrayLength(value),
      );
    case "map":
      return withSize("Map", getMapSize(value));
    case "set":
      return withSize("Set", getSetSize(value));
    case "date":
      return getDatePreview(value);
    case "regexp":
      return getTruncatedText(getRegExpText(value), MAX_NESTED_TEXT_LENGTH);
    case "error":
      return getConstructorName(value) ?? "Error";
    default: {
      const name = getConstructorName(value);
      return name && name !== "Object" ? name : `{${ELLIPSIS}}`;
    }
  }
}

function getNestedPreview(value: unknown): string {
  try {
    const kind = getValueKind(value);
    return (
      getPrimitivePreview(value, kind, MAX_NESTED_TEXT_LENGTH) ??
      getNestedObjectPreview(value as object, kind)
    );
  } catch (error) {
    return getUninspectablePreview(getFailureReason(error));
  }
}

function getSourcePreview(source: ChildSource): string {
  switch (source.type) {
    case "value":
      return getNestedPreview(source.value);
    case "getter":
      return GETTER;
    case "failure":
      return getUninspectablePreview(source.reason);
    case "rest":
      return getRestPreview(source.count);
    case "hole":
      return getHolePreview(source.count);
    case "entry":
      return `${getNestedPreview(source.key)} => ${getNestedPreview(source.value)}`;
  }
}

function getMemberName(child: Child): string {
  switch (child.step.type) {
    case "property":
      return isIdentifier(child.step.key)
        ? getTruncatedText(child.step.key, MAX_NESTED_TEXT_LENGTH)
        : quote(child.step.key, MAX_NESTED_TEXT_LENGTH);
    case "symbol":
      return getTruncatedText(
        getSymbolText(child.step.key),
        MAX_NESTED_TEXT_LENGTH,
      );
    default:
      return "";
  }
}

function getMembersPreview(
  children: readonly Child[],
  open: string,
  close: string,
): string {
  const members = children.slice(0, MAX_MEMBERS).map((child) => {
    const name = getMemberName(child);
    const value = getSourcePreview(child.source);
    return name === "" ? value : `${name}: ${value}`;
  });
  if (children.length > members.length) {
    members.push(ELLIPSIS);
  }
  return `${open}${members.join(", ")}${close}`;
}

function getContainerPreview(input: PreviewInput, value: object): string {
  const { kind, typeName, children } = input;

  switch (kind) {
    case "function":
      return getFunctionPreview(value);
    case "date":
      return getDatePreview(value);
    case "regexp":
      return getTruncatedText(getRegExpText(value), MAX_TEXT_LENGTH);
    case "error":
      return getErrorPreview(value);
    case "array":
      return `${withSize(typeName ?? "Array", getArrayLength(value))} ${getMembersPreview(children, "[", "]")}`;
    case "map":
      return `${withSize("Map", getMapSize(value))} ${getMembersPreview(children, "{", "}")}`;
    case "set":
      return `${withSize("Set", getSetSize(value))} ${getMembersPreview(children, "{", "}")}`;
    default: {
      const name =
        typeName && typeName !== "Object"
          ? `${getTruncatedText(typeName, MAX_NESTED_TEXT_LENGTH)} `
          : "";
      return `${name}${getMembersPreview(children, "{", "}")}`;
    }
  }
}

function getValuePreview(input: PreviewInput): string {
  const value = input.source.type === "value" ? input.source.value : undefined;
  try {
    return (
      getPrimitivePreview(value, input.kind, MAX_TEXT_LENGTH) ??
      getContainerPreview(input, value as object)
    );
  } catch (error) {
    return getUninspectablePreview(getFailureReason(error));
  }
}

function getRawPreview(input: PreviewInput): string {
  switch (input.kind) {
    case "getter":
      return GETTER;
    case "uninspectable":
      return getUninspectablePreview(input.detail);
    case "circular":
      return `[Circular ${getTruncatedText(input.detail, MAX_TEXT_LENGTH)}]`;
    case "entry":
    case "rest":
    case "hole":
      return getSourcePreview(input.source);
    default:
      return getValuePreview(input);
  }
}

export function getPreview(input: PreviewInput): string {
  return getEscapedText(getRawPreview(input));
}
