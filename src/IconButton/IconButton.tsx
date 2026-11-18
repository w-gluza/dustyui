import type { ReactNode } from "react";
import clsx from "clsx";
import { Button, type ButtonProps } from "../Button/Button.js";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends Omit<
  ButtonProps,
  | "children"
  | "dangerouslySetInnerHTML"
  | "iconPosition"
  | "aria-label"
  | "aria-labelledby"
> {
  label: string;
  icon: ReactNode;
  iconPosition?: never;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export function IconButton({
  label,
  icon,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button {...props} className={clsx(styles.iconButton, className)}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={visuallyHidden.visuallyHidden}>{label}</span>
    </Button>
  );
}
