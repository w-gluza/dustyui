import type { Matches } from "./getMatches.js";

export function getSearchStatus(
  query: string,
  matches: Matches,
  current: number,
): string {
  if (query.trim() === "") {
    return "";
  }
  const count = matches.ids.length;
  const scope = matches.isComplete ? "" : ", searched in part";
  if (count === 0) {
    return `No matches${scope}`;
  }
  if (current >= 0) {
    return `${current + 1} of ${count}${scope}`;
  }
  return `${count} ${count === 1 ? "match" : "matches"}${scope}`;
}
