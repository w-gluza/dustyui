import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import clsx from "clsx";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Content inside the button */
  children: ReactNode;
  /** Visual style variant */
  variant?: "primary" | "secondary";
  /** Show as busy (disables interaction + aria-busy) */
  loading?: boolean;
  /** Test hook. */
  dataTestId?: string;
  /** Additional CSS class names */
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      loading = false,
      dataTestId,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          styles.button,
          styles[variant],
          isDisabled && styles.disabled,
          className
        )}
        data-testid={dataTestId}
        data-variant={variant}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
