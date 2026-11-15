export const GROUP_SIZE = 100;

export interface Range {
  readonly start: number;
  readonly end: number;
}

export function getRanges(start: number, end: number): Range[] | undefined {
  const size = end - start;
  if (size <= GROUP_SIZE) {
    return undefined;
  }
  let span = GROUP_SIZE;
  while (span * GROUP_SIZE < size) {
    span *= GROUP_SIZE;
  }
  const ranges: Range[] = [];
  for (let from = start; from < end; from += span) {
    ranges.push({ start: from, end: Math.min(from + span, end) });
  }
  return ranges;
}
