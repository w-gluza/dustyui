import React, { type ReactNode } from "react";
import { forwardRef } from "react";
import clsx from "clsx";
import styles from "./Badge.module.css";

interface BadgeProps {
  /** Visible text inside the badge. */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Where to place the icon relative to the label. */
  iconPosition?: "left" | "right";
  /** If true, announces updates to assistive tech (use when value changes dynamically). */
  announce?: boolean;
  /** Test hook. */
  dataTestId?: string;
  /** Extra class on the root element. */
  className?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      label,
      icon,
      iconPosition = "left",
      announce = false,
      dataTestId,
      className,
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={clsx(styles.badge, className)}
        data-testid={dataTestId}
        data-icon-position={iconPosition}
        role={announce ? "status" : undefined}
        aria-live={announce ? "polite" : undefined}
      >
        {icon && iconPosition === "left" && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.label}>{label}</span>
        {icon && iconPosition === "right" && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";
