import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { Vinyl } from "./Vinyl.js";
import styles from "./RecordSleeve.module.css";

export interface RecordSleeveProps extends Omit<
  ComponentProps<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  artwork: ReactNode;
  revealed?: boolean | undefined;
  playing?: boolean | undefined;
}

export function RecordSleeve({
  artwork,
  revealed = false,
  playing = false,
  className,
  ...props
}: RecordSleeveProps) {
  return (
    <div
      {...props}
      className={clsx(styles.stage, className)}
      data-revealed={revealed || undefined}
    >
      <Vinyl playing={revealed && playing} />
      <div className={styles.sleeve}>{artwork}</div>
    </div>
  );
}
