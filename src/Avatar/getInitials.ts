const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function firstGrapheme(word: string): string {
  for (const { segment } of graphemes.segment(word)) {
    return segment;
  }
  return "";
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words.at(-1) ?? "") : "";
  return firstGrapheme(first) + firstGrapheme(last);
}
