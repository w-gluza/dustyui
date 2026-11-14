import type { ComponentProps, CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import styles from "./Avatar.module.css";

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  image?: ReactNode;
  fallback?: string;
  size?: number;
}

export function Avatar({
  image,
  fallback,
  size = 64,
  className,
  style,
  ...props
}: AvatarProps) {
  const sizedStyle = {
    ...style,
    "--avatar-size": `${size}px`,
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
