import { useLayoutEffect, useRef, type RefObject } from "react";

import { getEnabledTabs } from "./getEnabledTabs.js";

interface IndicatorRefs {
  listRef: RefObject<HTMLDivElement | null>;
  rowRef: RefObject<HTMLDivElement | null>;
}

function getActiveTab(row: HTMLElement): HTMLButtonElement | undefined {
  return getEnabledTabs(row).find(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
}

function place(list: HTMLElement, row: HTMLElement): boolean {
  const active = getActiveTab(row);

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

function reveal(list: HTMLElement, tab: HTMLElement): void {
  const listBox = list.getBoundingClientRect();
  const tabBox = tab.getBoundingClientRect();
  const style = getComputedStyle(list);
  const edge = Math.max(
    Number.parseFloat(style.paddingInlineStart),
    Number.parseFloat(style.paddingInlineEnd),
  );
  const before = tabBox.left - edge - listBox.left;
  const after = tabBox.right + edge - listBox.right;

  if (before < 0) {
    list.scrollLeft += before;
  } else if (after > 0) {
    list.scrollLeft += Math.min(after, before);
  }
}

export function useActiveTabIndicator(): IndicatorRefs {
  const listRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef<HTMLElement>(null);

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

    const active = getActiveTab(row) ?? null;
    if (active && active !== revealedRef.current) {
      reveal(list, active);
    }
    revealedRef.current = active;
  });

  useLayoutEffect(() => {
    const list = listRef.current;
    const row = rowRef.current;

    if (!list || !row) {
      return undefined;
    }
    const sizes = new ResizeObserver(() => {
      place(list, row);
    });
    const watch = () => {
      sizes.disconnect();
      sizes.observe(row);
      for (const tab of row.children) {
        sizes.observe(tab);
      }
    };
    const tabs = new MutationObserver(watch);
    const frame = requestAnimationFrame(() => {
      if ("placed" in list.dataset) {
        list.dataset.animated = "";
      }
    });

    watch();
    tabs.observe(row, { childList: true });
    return () => {
      sizes.disconnect();
      tabs.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return { listRef, rowRef };
}
