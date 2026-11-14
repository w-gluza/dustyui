export interface HighlightPart {
  readonly text: string;
  readonly isMatch: boolean;
}

export function getHighlightParts(
  text: string,
  search: string,
): HighlightPart[] {
  const query = search.trim().toLocaleLowerCase();
  const lowered = text.toLocaleLowerCase();
  if (query === "" || lowered.length !== text.length) {
    return [{ text, isMatch: false }];
  }
  const parts: HighlightPart[] = [];
  let position = 0;
  for (
    let found = lowered.indexOf(query);
    found >= 0;
    found = lowered.indexOf(query, position)
  ) {
    if (found > position) {
      parts.push({ text: text.slice(position, found), isMatch: false });
    }
    position = found + query.length;
    parts.push({ text: text.slice(found, position), isMatch: true });
  }
  if (position < text.length || parts.length === 0) {
    parts.push({ text: text.slice(position), isMatch: false });
  }
  return parts;
}
