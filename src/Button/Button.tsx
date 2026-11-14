"use client";

import {
  useEffect,
  useId,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import styles from "./Button.module.css";

const ACTIVATION_HANDLERS = {
  onDoubleClick: undefined,
  onKeyDown: undefined,
  onKeyUp: undefined,
  onMouseDown: undefined,
  onMouseUp: undefined,
  onPointerDown: undefined,
  onPointerUp: undefined,
  onTouchStart: undefined,
  onTouchEnd: undefined,
} satisfies Partial<ComponentProps<"button">>;

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends Omit<
  ComponentProps<"button">,
  "children" | "dangerouslySetInnerHTML"
> {
  children: ReactNode;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
}

export function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  loadingLabel = "Loading",
  className,
  type = "button",
  children,
  onClick,
  "aria-disabled": ariaDisabled,
  "aria-describedby": describedBy,
  ...props
}: ButtonProps) {
  const loadingId = useId();
  const inactive = loading || ariaDisabled === true || ariaDisabled === "true";

  useEffect(readyAnnouncer, []);

  useEffect(
    () => (loading ? announce(loadingLabel) : undefined),
    [loading, loadingLabel],
  );

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (inactive) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      {...props}
      {...(inactive ? ACTIVATION_HANDLERS : undefined)}
      type={type}
      className={clsx(styles.button, styles[variant], styles[size], className)}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-disabled={inactive ? true : ariaDisabled}
      aria-describedby={loading ? clsx(describedBy, loadingId) : describedBy}
      onClick={handleClick}
    >
      <span className={styles.label}>{children}</span>
      {loading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span id={loadingId} hidden>
            {loadingLabel}
          </span>
        </>
      ) : null}
    </button>
  );
}
