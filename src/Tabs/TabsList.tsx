"use client";

import { useCallback, useLayoutEffect, type ComponentProps } from "react";
import clsx from "clsx";
import { assignRef } from "../assignRef.js";
import { getEnabledTabs } from "./getEnabledTabs.js";
import { useTabs } from "./tabsContext.js";
import { useActiveTabIndicator } from "./useActiveTabIndicator.js";
import styles from "./Tabs.module.css";

export interface TabsListProps extends Omit<
  ComponentProps<"div">,
  "dangerouslySetInnerHTML" | "role" | "aria-label" | "aria-labelledby"
> {
  label: string;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export function TabsList({
  label,
  className,
  children,
  ref,
  ...props
}: TabsListProps) {
  const { variant } = useTabs("TabsList");
  const { listRef, rowRef } = useActiveTabIndicator();

  const setList = useCallback(
    (list: HTMLDivElement | null) => {
      listRef.current = list;
      return assignRef(ref, list);
    },
    [listRef, ref],
  );

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) {
      return;
    }

    const updateTabStop = () => {
      const enabled = getEnabledTabs(row);
      const stop =
        enabled.find((tab) => tab.getAttribute("aria-selected") === "true") ??
        enabled[0];
      for (const tab of enabled) {
        const index = tab === stop ? 0 : -1;
        if (tab.tabIndex !== index) {
          tab.tabIndex = index;
        }
      }
    };

    updateTabStop();
    const observer = new MutationObserver(updateTabStop);
    observer.observe(row, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected", "disabled", "tabindex"],
    });
    return () => observer.disconnect();
  }, [rowRef]);

  return (
    <div
      {...props}
      ref={setList}
      className={clsx(styles.list, className)}
      data-variant={variant}
    >
      <span className={styles.indicator} aria-hidden="true" />
      <div
        ref={rowRef}
        className={styles.row}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
      >
        {children}
      </div>
    </div>
  );
}
