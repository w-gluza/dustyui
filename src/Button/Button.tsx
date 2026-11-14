import type { ComponentProps } from "react";
import clsx from "clsx";
import styles from "./Button.module.css";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={clsx(styles.button, styles[variant], className)}
      data-variant={variant}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
    />
  );
}
