import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import type { HeadingLevel } from "../headingLevel.js";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "title" | "dangerouslySetInnerHTML"
> {
  title: string;
  level: HeadingLevel;
  description?: ReactNode | undefined;
  media?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}

export function EmptyState({
  title,
  level,
  description,
  media,
  actions,
  className,
  ...props
}: EmptyStateProps) {
  const Heading = `h${level}` as const;
  const Description =
    typeof description === "string" || typeof description === "number"
      ? "p"
      : "div";

  return (
    <div {...props} className={clsx(styles.emptyState, className)}>
      {media != null ? <div className={styles.media}>{media}</div> : null}
      <Heading className={styles.title}>{title}</Heading>
      {description != null ? (
        <Description className={styles.description}>{description}</Description>
      ) : null}
      {actions != null ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
