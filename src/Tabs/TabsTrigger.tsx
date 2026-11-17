"use client";

import type { ComponentProps, KeyboardEvent } from "react";
import clsx from "clsx";
import { tabId, panelId, useTabs } from "./tabsContext.js";
import styles from "./Tabs.module.css";

export interface TabsTriggerProps extends Omit<
  ComponentProps<"button">,
  "value" | "type" | "role" | "dangerouslySetInnerHTML"
> {
  value: string;
}

function enabledTabs(from: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    from
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]:enabled') ?? [],
  );
}

function targetIndex(
  key: string,
  current: number,
  count: number,
  rtl: boolean,
) {
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const backward = rtl ? "ArrowRight" : "ArrowLeft";

  switch (key) {
    case forward:
      return (current + 1) % count;
    case backward:
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}

export function TabsTrigger({
  value,
  className,
  onClick,
  onKeyDown,
  ...props
}: TabsTriggerProps) {
  const tabs = useTabs("TabsTrigger");
  const selected = tabs.value === value;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const all = enabledTabs(event.currentTarget);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const index = targetIndex(
      event.key,
      all.indexOf(event.currentTarget),
      all.length,
      rtl,
    );
    const target = index === undefined ? undefined : all[index];

    if (!target) {
      return;
    }
    event.preventDefault();
    target.focus();
    if (tabs.activation === "automatic") {
      tabs.select(target.dataset.value ?? "");
    }
  }

  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={tabId(tabs.baseId, value)}
      className={clsx(styles.trigger, className)}
      data-value={value}
      aria-selected={selected}
      aria-controls={panelId(tabs.baseId, value)}
      tabIndex={selected ? 0 : -1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          tabs.select(value);
        }
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
