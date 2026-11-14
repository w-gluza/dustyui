import { useLayoutEffect, useState, type RefObject } from "react";
import { getWindow, type RowWindow } from "./getWindow.js";

const WINDOW_THRESHOLD = 200;
const WINDOW_OVERSCAN = 10;
const WINDOW_LIMIT = 500;
const INITIAL_WINDOW: RowWindow = { start: 0, end: 50 };
const ESTIMATED_ROW_HEIGHT = 24;
const TREE_ITEM = ':scope > [role="treeitem"]';
const GAP = ":scope > [data-gap-rows]";

function getRowHeight(tree: Element): number {
  let gapHeight = 0;
  let gapRows = 0;
  for (const gap of tree.querySelectorAll<HTMLElement>(GAP)) {
    gapHeight += gap.getBoundingClientRect().height;
    gapRows += Number(gap.dataset.gapRows);
  }
  if (gapRows > 0 && gapHeight > 0) {
    return gapHeight / gapRows;
  }
  return (
    tree.querySelector(TREE_ITEM)?.getBoundingClientRect().height ||
    ESTIMATED_ROW_HEIGHT
  );
}

function getVisibleSpan(tree: Element): { top: number; bottom: number } {
  const bounds = tree.getBoundingClientRect();
  let top = Math.max(bounds.top, 0);
  let bottom = Math.min(bounds.bottom, window.innerHeight);
  for (
    let ancestor = tree.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    if (getComputedStyle(ancestor).overflowY !== "visible") {
      const clip = ancestor.getBoundingClientRect();
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
  }
  return { top, bottom };
}

export function useRowWindow(
  element: RefObject<HTMLElement | null>,
  rowCount: number,
): RowWindow | undefined {
  const [rowWindow, setRowWindow] = useState(INITIAL_WINDOW);
  const isWindowed = rowCount > WINDOW_THRESHOLD;

  useLayoutEffect(() => {
    const tree = element.current;
    if (!isWindowed || !tree) {
      return;
    }
    const container = tree;

    function update() {
      const origin = container.firstElementChild;
      if (!origin) {
        return;
      }
      const start = origin.getBoundingClientRect().top;
      const { top, bottom } = getVisibleSpan(container);
      const next = getWindow({
        rowCount,
        rowHeight: getRowHeight(container),
        from: top - start,
        to: bottom - start,
        overscan: WINDOW_OVERSCAN,
        limit: WINDOW_LIMIT,
      });
      setRowWindow((current) =>
        current.start === next.start && current.end === next.end
          ? current
          : next,
      );
    }

    const observer = new ResizeObserver(update);
    observer.observe(container);
    document.addEventListener("scroll", update, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [element, isWindowed, rowCount]);

  return isWindowed ? rowWindow : undefined;
}
