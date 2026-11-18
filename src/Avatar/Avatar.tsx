import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { getStyle } from "../styles/getStyle.js";
import { countGraphemes, getInitials } from "./getInitials.js";
import styles from "./Avatar.module.css";

export type AvatarSize = "small" | "medium" | "large";

export type AvatarRing = "neutral" | "accent";

const RING_CLASS = {
  neutral: styles.ringNeutral,
  accent: styles.ringAccent,
} as const;

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
  image?: ReactNode | undefined;
  fallback?: string | undefined;
  size?: AvatarSize | number | undefined;
  ring?: AvatarRing | undefined;
  decorative?: boolean | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
  "aria-hidden"?: never;
}

export function Avatar({
  name,
  image,
  fallback,
  size = "large",
  ring,
  decorative = false,
  className,
  style,
  ...props
}: AvatarProps) {
  const sizedStyle =
    typeof size === "string"
      ? style
      : getStyle({
          ...style,
          "--avatar-size": `${(Number.isFinite(size) && size > 0 ? size : DEFAULT_SIZE) / ROOT_FONT_SIZE}rem`,
        });

  const label = name.trim();
  const accessibility =
    decorative || label === ""
      ? { "aria-hidden": true }
      : { role: "img", "aria-label": label };
  const text = fallback ?? getInitials(name);

  return (
    <span
      {...props}
      {...accessibility}
      className={clsx(
        styles.avatar,
        typeof size === "string" && styles[size],
        ring && RING_CLASS[ring],
        className,
      )}
      style={sizedStyle}
    >
      <span
        className={styles.fallback}
        data-long={countGraphemes(text) > 2 || undefined}
      >
        {text}
      </span>
      {image}
    </span>
  );
}
