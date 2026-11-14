const SHOWN_LENGTH = 2000;
const SEARCHED_LENGTH = 1_000_000;
const LEAD_LENGTH = 200;
const ELLIPSIS = "…";

export interface ShownValue {
  readonly text: string;
  readonly isWhole: boolean;
}

function getStart(text: string, query: string): number {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") {
    return 0;
  }
  const found = text
    .slice(0, SEARCHED_LENGTH)
    .toLocaleLowerCase()
    .indexOf(needle);
  return found + needle.length > SHOWN_LENGTH
    ? Math.max(0, found - LEAD_LENGTH)
    : 0;
}

export function getShownValue(text: string, query = ""): ShownValue {
  if (text.length <= SHOWN_LENGTH) {
    return { text, isWhole: true };
  }
  const start = getStart(text, query);
  const end = start + SHOWN_LENGTH;
  return {
    text: `${start > 0 ? ELLIPSIS : ""}${text.slice(start, end)}${end < text.length ? ELLIPSIS : ""}`,
    isWhole: false,
  };
}
