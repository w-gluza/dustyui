const ELLIPSIS = "…";

export function getTruncatedText(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  const characters = Array.from(text.slice(0, limit * 2));
  return characters.length <= limit && text.length <= limit * 2
    ? text
    : `${characters.slice(0, limit).join("")}${ELLIPSIS}`;
}
