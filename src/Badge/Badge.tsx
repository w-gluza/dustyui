import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import styles from "./Badge.module.css";

export interface BadgeProps extends Omit<
  ComponentProps<"span">,
  "children" | "dangerouslySetInnerHTML"
> {
  label: string;
  icon?: ReactNode | undefined;
  iconPosition?: "start" | "end" | undefined;
}

export function Badge({
  label,
  icon,
  iconPosition = "start",
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
    <span {...props} className={clsx(styles.badge, className)}>
      {iconPosition === "start" ? iconNode : null}
      <span className={styles.label}>{label}</span>
      {iconPosition === "end" ? iconNode : null}
    </span>
  );
}
