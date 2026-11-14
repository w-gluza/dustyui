import type { ComponentProps, CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { getInitials } from "./getInitials.js";
import styles from "./Avatar.module.css";

const DEFAULT_SIZE = 64;
const ROOT_FONT_SIZE = 16;

export interface AvatarProps extends Omit<
  ComponentProps<"span">,
  | "children"
  | "dangerouslySetInnerHTML"
  | "role"
  | "aria-label"
  | "aria-labelledby"
  | "aria-hidden"
> {
  name: string;
  image?: ReactNode;
  fallback?: string;
  size?: number;
  decorative?: boolean;
}

export function Avatar({
  name,
  image,
  fallback,
  size = DEFAULT_SIZE,
  decorative = false,
  className,
  style,
  ...props
}: AvatarProps) {
  const safeSize = Number.isFinite(size) && size > 0 ? size : DEFAULT_SIZE;
  const sizedStyle = {
    ...style,
    "--avatar-size": `${safeSize / ROOT_FONT_SIZE}rem`,
  } as CSSProperties;
  const accessibility = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": name };

  return (
    <span
      {...props}
      {...accessibility}
      className={clsx(styles.avatar, className)}
      style={sizedStyle}
    >
      {image ? (
        image
      ) : (
        <span className={styles.fallback}>{fallback ?? getInitials(name)}</span>
      )}
    </span>
  );
}
