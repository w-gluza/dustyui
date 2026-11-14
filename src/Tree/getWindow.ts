export interface RowWindow {
  readonly start: number;
  readonly end: number;
}

export interface WindowInput {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly from: number;
  readonly to: number;
  readonly overscan: number;
  readonly limit: number;
}

export type WindowItem =
  | {
      readonly type: "gap";
      readonly id: "start" | "middle" | "end";
      readonly rowCount: number;
    }
  | { readonly type: "row"; readonly index: number };

function clamp(value: number, minimum: number, maximum: number): number {
  if (Number.isNaN(value)) {
    return minimum;
  }
  return Math.min(Math.max(value, minimum), maximum);
}

export function getWindow({
  rowCount,
  rowHeight,
  from,
  to,
  overscan,
  limit,
}: WindowInput): RowWindow {
  if (!(rowCount > 0) || !(rowHeight > 0)) {
    return { start: 0, end: 0 };
  }
  const start = clamp(Math.floor(from / rowHeight) - overscan, 0, rowCount);
  const end = clamp(
    Math.ceil(to / rowHeight) + overscan,
    start,
    Math.min(rowCount, start + Math.max(limit, 0)),
  );
  return { start, end };
}

export function getWindowItems(
  rowWindow: RowWindow,
  rowCount: number,
  pinned: number,
): WindowItem[] {
  const start = clamp(rowWindow.start, 0, rowCount);
  const end = clamp(rowWindow.end, start, rowCount);
  const isPinnedBefore = pinned >= 0 && pinned < start;
  const isPinnedAfter = pinned >= end && pinned < rowCount;
  const items: WindowItem[] = [];

  function addGap(id: "start" | "middle" | "end", gapRowCount: number) {
    if (gapRowCount > 0 || id === "start") {
      items.push({ type: "gap", id, rowCount: gapRowCount });
    }
  }

  addGap("start", isPinnedBefore ? pinned : start);
  if (isPinnedBefore) {
    items.push({ type: "row", index: pinned });
    addGap("middle", start - pinned - 1);
  }
  for (let index = start; index < end; index++) {
    items.push({ type: "row", index });
  }
  if (isPinnedAfter) {
    addGap("middle", pinned - end);
    items.push({ type: "row", index: pinned });
    addGap("end", rowCount - pinned - 1);
  } else {
    addGap("end", rowCount - end);
  }

  return items;
}
