"use client";

import type { ComponentProps } from "react";
import clsx from "clsx";
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
  ...props
}: TabsListProps) {
  useTabs("TabsList");
  const { listRef, rowRef } = useActiveTabIndicator();

  return (
    <div {...props} ref={listRef} className={clsx(styles.list, className)}>
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
