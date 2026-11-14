import type { ComponentProps, CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import styles from "./Avatar.module.css";

const DEFAULT_SIZE = 64;
const ROOT_FONT_SIZE = 16;

export interface AvatarProps extends Omit<
  ComponentProps<"span">,
  "children" | "dangerouslySetInnerHTML"
> {
  image?: ReactNode;
  fallback?: string;
  size?: number;
}

export function Avatar({
  image,
  fallback,
  size = DEFAULT_SIZE,
  className,
  style,
  ...props
}: AvatarProps) {
  const safeSize = Number.isFinite(size) && size > 0 ? size : DEFAULT_SIZE;
  const sizedStyle = {
    ...style,
    "--avatar-size": `${safeSize / ROOT_FONT_SIZE}rem`,
  } as CSSProperties;

  return (
    <span
      {...props}
      className={clsx(styles.avatar, className)}
      style={sizedStyle}
    >
      {image ? image : <span className={styles.fallback}>{fallback}</span>}
    </span>
  );
}
