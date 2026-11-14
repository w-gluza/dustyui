"use client";

import {
  useEffect,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { announce } from "../announcer/announcer.js";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends Omit<
  ComponentProps<"button">,
  "children" | "dangerouslySetInnerHTML"
> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel = "Loading",
  className,
  type = "button",
  children,
  onClick,
  "aria-disabled": ariaDisabled,
  ...props
}: ButtonProps) {
  const inactive = loading || ariaDisabled === true || ariaDisabled === "true";

  useEffect(() => {
    if (loading) {
      announce(loadingLabel);
    }
  }, [loading, loadingLabel]);

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
      type={type}
      className={clsx(styles.button, styles[variant], className)}
      data-variant={variant}
      data-loading={loading || undefined}
      aria-disabled={inactive ? true : ariaDisabled}
      onClick={handleClick}
    >
      <span className={styles.label}>{children}</span>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </button>
  );
}
