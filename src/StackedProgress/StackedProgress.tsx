import type { ComponentProps, CSSProperties } from "react";
import clsx from "clsx";
import styles from "./StackedProgress.module.css";

export interface ProgressSegment {
  label: string;
  value: number;
}

export type StackedProgressSize = "small" | "medium";
export type StackedProgressLegend = "inline" | "grid";

export interface StackedProgressProps extends Omit<
  ComponentProps<"div">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  segments: readonly ProgressSegment[];
  max?: number | undefined;
  size?: StackedProgressSize | undefined;
  legend?: StackedProgressLegend | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

const TONES = [
  styles.first,
  styles.second,
  styles.third,
  styles.fourth,
  styles.fifth,
] as const;

function grow(value: number): CSSProperties {
  return { "--segment-grow": value } as CSSProperties;
}

export function StackedProgress({
  label,
  segments,
  max = 1,
  size = "medium",
  legend = "inline",
  className,
  ...props
}: StackedProgressProps) {
  const parts = segments.map((segment, index) => ({
    ...segment,
    value: Math.max(0, segment.value),
    tone: TONES[index % TONES.length],
  }));
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const whole = Math.max(max, total);
  const rest = whole - total;

  return (
    <div {...props} className={clsx(styles.stacked, styles[size], className)}>
      <div className={styles.bar} aria-hidden="true">
        {parts.map((part, index) =>
          part.value > 0 ? (
            <span
              key={`${String(index)}-${part.label}`}
              className={clsx(styles.segment, part.tone)}
              style={grow(part.value)}
            />
          ) : null,
        )}
        {rest > 0 ? (
          <span className={styles.segment} style={grow(rest)} />
        ) : null}
      </div>
      <ul
        className={clsx(styles.legend, legend === "grid" && styles.grid)}
        aria-label={label}
      >
        {parts.map((part, index) => {
          const percent = `${String(whole > 0 ? Math.round((part.value / whole) * 100) : 0)}%`;

          return (
            <li key={`${String(index)}-${part.label}`} className={styles.item}>
              <span
                className={clsx(styles.dot, part.tone)}
                aria-hidden="true"
              />
              {legend === "grid" ? (
                <>
                  <span className={styles.name}>{part.label}</span>
                  <span className={styles.share}>{percent}</span>
                </>
              ) : (
                `${percent} ${part.label}`
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
