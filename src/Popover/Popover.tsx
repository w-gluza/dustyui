"use client";

import {
  useCallback,
  useId,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { assignRef } from "../assignRef.js";
import { useCloseOnSelect } from "./useCloseOnSelect.js";
import styles from "./Popover.module.css";

export type PopoverAlign = "start" | "end";

export interface PopoverProps extends Omit<
  ComponentProps<"div">,
  "popover" | "dangerouslySetInnerHTML"
> {
  trigger: ReactNode;
  triggerLabel?: string | undefined;
  align?: PopoverAlign | undefined;
  chevron?: boolean | undefined;
  closeOnSelect?: boolean | undefined;
}

export function Popover({
  trigger,
  triggerLabel,
  align = "start",
  chevron = true,
  closeOnSelect = false,
  className,
  children,
  ref,
  onToggle,
  ...props
}: PopoverProps) {
  const id = useId();
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(false);
  const panelRef = useCloseOnSelect<HTMLDivElement>(closeOnSelect);
  const setPanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panelRef.current = panel;
      return assignRef(ref, panel);
    },
    [panelRef, ref],
  );
  const anchor = {
    "--popover-anchor": `--dusty-popover-${id.replace(/[^a-z0-9]/giu, "")}`,
  } as CSSProperties;

  return (
    <span className={styles.popover} style={anchor}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={triggerLabel}
        aria-expanded={open}
        popoverTarget={panelId}
      >
        {trigger}
        {chevron ? (
          <span className={styles.chevron} aria-hidden="true" />
        ) : null}
      </button>
      <div
        {...props}
        ref={setPanel}
        id={panelId}
        popover="auto"
        className={clsx(styles.panel, className)}
        data-align={align}
        onToggle={(event) => {
          setOpen(event.newState === "open");
          onToggle?.(event);
        }}
      >
        {children}
      </div>
    </span>
  );
}
