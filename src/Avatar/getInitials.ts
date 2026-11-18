const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const BRACKETED = /\([^)]*\)|\[[^\]]*\]/gu;
const INITIAL = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

function firstInitial(word: string): string {
  for (const { segment } of graphemes.segment(word)) {
    if (INITIAL.test(segment)) {
      return segment.toLocaleUpperCase();
    }
  }
  return "";
}

export function getInitials(name: string): string {
  const initials = name
    .replace(BRACKETED, " ")
    .split(/\s+/u)
    .map(firstInitial)
    .filter(Boolean);
  const first = initials[0] ?? "";
  const last = initials.length > 1 ? (initials.at(-1) ?? "") : "";
  return first + last;
}

export function countGraphemes(text: string): number {
  return [...graphemes.segment(text)].length;
}
