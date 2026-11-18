import { DEFAULT_LABELS, type ObjectInspectorLabels } from "../labels.js";
import type { Matches } from "./getMatches.js";

export function getSearchStatus(
  query: string,
  matches: Matches,
  current: number,
  format: ObjectInspectorLabels["searchStatus"] = DEFAULT_LABELS.searchStatus,
): string {
  if (query.trim() === "") {
    return "";
  }
  return format({
    count: matches.ids.length,
    current,
    isComplete: matches.isComplete,
  });
}
