import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import styles from "./Badge.module.css";

export type BadgeVariant = "outline" | "soft" | "solid" | "editorial";

export type BadgeTone = "neutral" | "accent";

interface BadgeBaseProps extends Omit<
  ComponentProps<"span">,
  "children" | "dangerouslySetInnerHTML"
> {
  label: string;
  tone?: BadgeTone | undefined;
}

interface BadgeWithIconProps extends BadgeBaseProps {
  variant?: Exclude<BadgeVariant, "editorial"> | undefined;
  icon?: ReactNode | undefined;
  iconPosition?: "start" | "end" | undefined;
}

interface BadgeWithMarkerProps extends BadgeBaseProps {
  variant: "editorial";
  icon?: never;
  iconPosition?: never;
}

export type BadgeProps = BadgeWithIconProps | BadgeWithMarkerProps;

export function Badge({
  label,
  variant = "outline",
  tone = "neutral",
  icon,
  iconPosition = "start",
  className,
  ...props
}: BadgeProps) {
  const iconNode =
    icon != null && variant !== "editorial" ? (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    ) : null;

  return (
    <span
      {...props}
      className={clsx(styles.badge, styles[variant], styles[tone], className)}
    >
      {iconPosition === "start" ? iconNode : null}
      <span className={styles.label}>{label}</span>
      {iconPosition === "end" ? iconNode : null}
    </span>
  );
}
