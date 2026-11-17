import type { ReactNode } from "react";
import styles from "./ProgressBar.module.css";

interface ProgressCaptionProps {
  editorial: boolean;
  label: string;
  percent: number | undefined;
  valueLabel: string | undefined;
  note: ReactNode | undefined;
}

export function ProgressCaption({
  editorial,
  label,
  percent,
  valueLabel,
  note,
}: ProgressCaptionProps) {
  const valueText =
    valueLabel ?? (percent === undefined ? undefined : `${String(percent)}%`);

  if (!editorial) {
    return (
      <div className={styles.caption} aria-hidden="true">
        <span>{label}</span>
        {valueText ? <span className={styles.value}>{valueText}</span> : null}
      </div>
    );
  }

  return (
    <div className={styles.headline}>
      <span className={styles.overline} aria-hidden="true">
        {label}
      </span>
      {valueText ? (
        <span className={styles.figure} aria-hidden="true">
          {valueLabel ?? (
            <>
              {percent}
              <span className={styles.unit}>%</span>
            </>
          )}
        </span>
      ) : null}
      {note != null ? <span className={styles.note}>{note}</span> : null}
    </div>
  );
}
