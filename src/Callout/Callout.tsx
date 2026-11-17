import type { ComponentProps } from "react";
import clsx from "clsx";
import styles from "./Callout.module.css";

export type CalloutTone = "neutral" | "accent";

export interface CalloutProps extends Omit<
  ComponentProps<"div">,
  "title" | "role" | "dangerouslySetInnerHTML"
> {
  title?: string | undefined;
  tone?: CalloutTone | undefined;
}

export function Callout({
  title,
  tone = "neutral",
  className,
  children,
  ...props
}: CalloutProps) {
  return (
    <div
      {...props}
      role="note"
      className={clsx(styles.callout, styles[tone], className)}
    >
      {title ? <p className={styles.title}>{title}</p> : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
