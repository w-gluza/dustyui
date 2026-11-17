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

export type ButtonVariant = "primary" | "secondary" | "plain";
export type ButtonShape = "rounded" | "pill";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends Omit<
  ComponentProps<"button">,
  "children" | "dangerouslySetInnerHTML"
> {
  children: ReactNode;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  shape?: ButtonShape | undefined;
  icon?: ReactNode | undefined;
  iconPosition?: "start" | "end" | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
}

export function Button({
  variant = "primary",
  size = "medium",
  shape = "rounded",
  icon,
  iconPosition = "start",
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

  const iconNode =
    icon != null ? (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    ) : null;

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
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        shape === "pill" && styles.pill,
        className,
      )}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-disabled={inactive ? true : ariaDisabled}
      aria-describedby={loading ? clsx(describedBy, loadingId) : describedBy}
      onClick={handleClick}
    >
      <span className={styles.label}>
        {iconPosition === "start" ? iconNode : null}
        {children}
        {iconPosition === "end" ? iconNode : null}
      </span>
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
