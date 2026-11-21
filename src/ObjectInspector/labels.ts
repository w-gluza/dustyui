import type { ValueKind } from "./describe/describe.js";

export interface ObjectInspectorSearchStatus {
  count: number;
  current: number;
  isComplete: boolean;
}

export interface ObjectInspectorLabels {
  search: string;
  searchRegion: (label: string) => string;
  previousMatch: string;
  nextMatch: string;
  searchStatus: (status: ObjectInspectorSearchStatus) => string;
  matchAnnouncement: (status: string, path: string) => string;
  noProperties: string;
  unreadable: (reason: string, message: string) => string;
  detailsRegion: (label: string) => string;
  noSelection: string;
  path: string;
  type: string;
  value: string;
  typeName: (kind: ValueKind, name: string) => string;
  shownCharacters: (shown: number, total: number) => string;
  copyPath: string;
  copyValue: string;
  pathCopied: string;
  valueCopied: string;
  pathPartCopied: string;
  valuePartCopied: string;
  copyFailed: string;
  copyFailedShort: string;
}

function count(value: number): string {
  return value.toLocaleString("en-GB");
}

export const DEFAULT_LABELS: ObjectInspectorLabels = {
  search: "Search",
  searchRegion: (label) => `Search ${label}`,
  previousMatch: "Previous match",
  nextMatch: "Next match",
  searchStatus: ({ count: matches, current, isComplete }) => {
    const scope = isComplete ? "" : ", searched in part";
    if (matches === 0) {
      return `No matches${scope}`;
    }
    if (current >= 0) {
      return `${String(current + 1)} of ${String(matches)}${scope}`;
    }
    return `${String(matches)} ${matches === 1 ? "match" : "matches"}${scope}`;
  },
  matchAnnouncement: (status, path) => `Match ${status}: ${path}`,
  noProperties: "No properties",
  unreadable: (_reason, message) => message,
  detailsRegion: (label) => `Selected value in ${label}`,
  noSelection: "Select a row to see its details",
  path: "Path",
  type: "Type",
  value: "Value",
  typeName: (_kind, name) => name,
  shownCharacters: (shown, total) =>
    `Showing ${count(shown)} of ${count(total)} characters. Copy value copies all of it.`,
  copyPath: "Copy path",
  copyValue: "Copy value",
  pathCopied: "Path copied",
  valueCopied: "Value copied",
  pathPartCopied: "Part of the path copied. It is too large to copy whole.",
  valuePartCopied: "Part of the value copied. It is too large to copy whole.",
  copyFailed: "Could not copy. Select the text and copy it by hand.",
  copyFailedShort: "Copy failed",
};
