import type { ComponentProps } from "react";
import clsx from "clsx";
import { Avatar, type AvatarProps, type AvatarSize } from "../Avatar/Avatar.js";
import styles from "./AvatarGroup.module.css";

export type AvatarGroupItem = Pick<AvatarProps, "name" | "image" | "fallback">;

export interface AvatarGroupProps extends Omit<
  ComponentProps<"ul">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  avatars: readonly AvatarGroupItem[];
  size?: AvatarSize | undefined;
  max?: number | undefined;
  overflowLabel?:
    ((count: number, hidden: readonly AvatarGroupItem[]) => string) | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

const MAX_SHOWN_COUNT = 99;

function getVisibleCount(total: number, max: number | undefined): number {
  if (max === undefined || !Number.isInteger(max) || max < 1 || max >= total) {
    return total;
  }
  return max - 1;
}

function defaultOverflowLabel(count: number): string {
  return `${count} more`;
}

export function AvatarGroup({
  label,
  avatars,
  size = "medium",
  max,
  overflowLabel = defaultOverflowLabel,
  className,
  ...props
}: AvatarGroupProps) {
  const visibleCount = getVisibleCount(avatars.length, max);
  const hidden = avatars.slice(visibleCount);

  return (
    <ul
      {...props}
      role="list"
      aria-label={label}
      className={clsx(styles.group, styles[size], className)}
    >
      {avatars.slice(0, visibleCount).map((avatar, index) => (
        <li key={`${avatar.name}-${index}`} className={styles.item}>
          <Avatar {...avatar} size={size} />
        </li>
      ))}
      {hidden.length > 0 ? (
        <li className={styles.item}>
          <Avatar
            name={overflowLabel(hidden.length, hidden)}
            fallback={
              hidden.length > MAX_SHOWN_COUNT
                ? `${MAX_SHOWN_COUNT}+`
                : `+${hidden.length}`
            }
            size={size}
            className={styles.overflow}
          />
        </li>
      ) : null}
    </ul>
  );
}
