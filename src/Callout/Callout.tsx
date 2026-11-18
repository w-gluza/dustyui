import { useId, type ComponentProps, type ReactNode } from "react";
import clsx from "clsx";
import styles from "./Callout.module.css";

export type CalloutTone = "neutral" | "accent";

export interface CalloutProps extends Omit<
  ComponentProps<"div">,
  "title" | "role" | "children" | "dangerouslySetInnerHTML"
> {
  children: ReactNode;
  title?: string | undefined;
  tone?: CalloutTone | undefined;
}

export function Callout({
  title,
  tone = "neutral",
  className,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: CalloutProps) {
  const titleId = useId();
  const named = ariaLabel !== undefined || ariaLabelledBy !== undefined;

  return (
    <div
      {...props}
      role="note"
      aria-label={ariaLabel}
      aria-labelledby={title && !named ? titleId : ariaLabelledBy}
      className={clsx(styles.callout, styles[tone], className)}
    >
      {title ? (
        <p id={titleId} className={styles.title}>
          {title}
        </p>
      ) : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
