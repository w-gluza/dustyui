import { useLayoutEffect, useRef, type RefObject } from "react";

import { getEnabledTabs } from "./getEnabledTabs.js";

interface IndicatorRefs {
  listRef: RefObject<HTMLDivElement | null>;
  rowRef: RefObject<HTMLDivElement | null>;
}

function place(list: HTMLElement, row: HTMLElement): boolean {
  const active = getEnabledTabs(row).find(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );

  if (!active) {
    return false;
  }
  const rowBox = row.getBoundingClientRect();
  const tabBox = active.getBoundingClientRect();
  const start =
    getComputedStyle(row).direction === "rtl"
      ? rowBox.right - tabBox.right
      : tabBox.left - rowBox.left;

  list.style.setProperty("--tabs-indicator-start", `${String(start)}px`);
  list.style.setProperty("--tabs-indicator-size", `${String(tabBox.width)}px`);
  return true;
}

export function useActiveTabIndicator(): IndicatorRefs {
  const listRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const row = rowRef.current;

    if (!list || !row) {
      return;
    }
    if (place(list, row)) {
      list.dataset.placed = "";
    } else {
      delete list.dataset.placed;
      delete list.dataset.animated;
    }
  });

  useLayoutEffect(() => {
    const list = listRef.current;
    const row = rowRef.current;

    if (!list || !row) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      place(list, row);
    });
    const frame = requestAnimationFrame(() => {
      if ("placed" in list.dataset) {
        list.dataset.animated = "";
      }
    });

    observer.observe(row);
    for (const tab of row.children) {
      observer.observe(tab);
    }
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  });

  return { listRef, rowRef };
}
