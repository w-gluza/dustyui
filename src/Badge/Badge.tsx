import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import styles from "./Badge.module.css";

export interface BadgeProps extends Omit<ComponentProps<"span">, "children"> {
  label: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  announce?: boolean;
}

export function Badge({
  label,
  icon,
  iconPosition = "left",
  announce = false,
  className,
  ...props
}: BadgeProps) {
  const iconNode =
    icon != null ? (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    ) : null;

  return (
    <span
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      {...props}
      className={clsx(styles.badge, className)}
    >
      {iconPosition === "left" ? iconNode : null}
      <span className={styles.label}>{label}</span>
      {iconPosition === "right" ? iconNode : null}
    </span>
  );
}
