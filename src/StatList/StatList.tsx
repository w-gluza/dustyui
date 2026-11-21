import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import styles from "./StatList.module.css";

export interface Stat {
  id?: string | undefined;
  label: string;
  value: ReactNode;
  icon?: ReactNode | undefined;
}

export interface StatListProps extends Omit<
  ComponentProps<"dl">,
  "children" | "dangerouslySetInnerHTML"
> {
  stats: readonly Stat[];
}

export function StatList({ stats, className, ...props }: StatListProps) {
  const hasIcons = stats.some((stat) => stat.icon != null);

  return (
    <dl {...props} className={clsx(styles.list, className)}>
      {stats.map((stat, index) => (
        <div
          key={
            stat.id === undefined
              ? `index:${String(index)}-${stat.label}`
              : `id:${stat.id}`
          }
          className={styles.row}
        >
          <dt className={styles.term}>
            {hasIcons ? (
              <span className={styles.icon} aria-hidden="true">
                {stat.icon}
              </span>
            ) : null}
            {stat.label}
          </dt>
          <dd className={styles.value}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
