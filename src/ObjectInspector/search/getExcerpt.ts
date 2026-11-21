import { getTruncatedText } from "../describe/getTruncatedText.js";

const SEARCHED_LENGTH = 1_000_000;
const LEAD_LENGTH = 20;
const ELLIPSIS = "…";

function isLowSurrogate(text: string, index: number): boolean {
  const code = text.charCodeAt(index);
  return code >= 0xdc00 && code <= 0xdfff;
}

function getOriginalIndex(text: string, loweredIndex: number): number {
  let lowered = 0;
  let index = 0;
  for (const character of text) {
    if (lowered >= loweredIndex) {
      break;
    }
    lowered += character.toLocaleLowerCase().length;
    index += character.length;
  }
  return index;
}

function findMatch(text: string, query: string): number {
  if (query === "") {
    return -1;
  }
  const searched = text.slice(0, SEARCHED_LENGTH);
  const lowered = searched.toLocaleLowerCase();
  const found = lowered.indexOf(query);
  return found < 0 || lowered.length === searched.length
    ? found
    : getOriginalIndex(searched, found);
}

export function getExcerpt(
  text: string,
  search: string,
  limit: number,
): string {
  if (text.length <= limit) {
    return text;
  }
  const query = search.trim().toLocaleLowerCase();
  const found = findMatch(text, query);
  if (found < 0 || found + query.length <= limit) {
    return getTruncatedText(text, limit);
  }
  const lead = Math.max(0, found - LEAD_LENGTH);
  const start = isLowSurrogate(text, lead) ? lead - 1 : lead;
  const stop = Math.min(text.length, start + limit);
  const end = isLowSurrogate(text, stop) ? stop - 1 : stop;
  return `${ELLIPSIS}${text.slice(start, end)}${end < text.length ? ELLIPSIS : ""}`;
}
