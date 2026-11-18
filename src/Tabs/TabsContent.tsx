"use client";

import type { ComponentProps } from "react";
import clsx from "clsx";
import { tabId, panelId, useTabs } from "./tabsContext.js";
import styles from "./Tabs.module.css";

export interface TabsContentProps extends Omit<
  ComponentProps<"div">,
  "role" | "hidden" | "dangerouslySetInnerHTML"
> {
  value: string;
}

export function TabsContent({
  value,
  className,
  tabIndex = 0,
  ...props
}: TabsContentProps) {
  const tabs = useTabs("TabsContent");

  return (
    <div
      {...props}
      role="tabpanel"
      tabIndex={tabIndex}
      id={panelId(tabs.baseId, value)}
      className={clsx(styles.content, className)}
      aria-labelledby={tabId(tabs.baseId, value)}
      hidden={tabs.value !== value}
    />
  );
}
