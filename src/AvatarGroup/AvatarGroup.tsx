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
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

function getVisibleCount(total: number, max: number | undefined): number {
  if (max === undefined || !Number.isInteger(max) || max < 1 || max >= total) {
    return total;
  }
  return max;
}

export function AvatarGroup({
  label,
  avatars,
  size = "medium",
  max,
  className,
  ...props
}: AvatarGroupProps) {
  const visibleCount = getVisibleCount(avatars.length, max);
  const hiddenCount = avatars.length - visibleCount;

  return (
    <ul
      {...props}
      aria-label={label}
      className={clsx(styles.group, styles[size], className)}
    >
      {avatars.slice(0, visibleCount).map((avatar, index) => (
        <li key={`${avatar.name}-${index}`} className={styles.item}>
          <Avatar {...avatar} size={size} />
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className={styles.item}>
          <Avatar
            name={`${hiddenCount} more`}
            fallback={`+${hiddenCount}`}
            size={size}
          />
        </li>
      ) : null}
    </ul>
  );
}
