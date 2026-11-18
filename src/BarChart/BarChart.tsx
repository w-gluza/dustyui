import type { ComponentProps } from "react";
import clsx from "clsx";
import { getStyle } from "../styles/getStyle.js";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import styles from "./BarChart.module.css";

export interface ChartBar {
  label: string;
  value: number;
  valueLabel?: string | undefined;
  description?: string | undefined;
}

export interface BarChartProps extends Omit<
  ComponentProps<"ul">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  bars: readonly ChartBar[];
  max?: number | undefined;
  highlighted?: number | undefined;
  current?: number | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export function BarChart({
  label,
  bars,
  max = 0,
  highlighted,
  current,
  className,
  style,
  ...props
}: BarChartProps) {
  const values = bars.map((bar) =>
    Number.isFinite(bar.value) ? Math.max(0, bar.value) : 0,
  );
  const whole = Math.max(Number.isFinite(max) ? max : 0, ...values, 0);

  return (
    <ul
      {...props}
      role="list"
      className={clsx(styles.chart, className)}
      style={style}
      aria-label={label}
    >
      {bars.map((bar, index) => {
        const value = values[index] ?? 0;
        const text = bar.valueLabel ?? String(value);

        return (
          <li
            key={`${String(index)}-${bar.label}`}
            className={styles.item}
            data-empty={value === 0 || undefined}
            data-highlighted={
              index === highlighted || index === current || undefined
            }
            aria-current={index === current ? "true" : undefined}
          >
            <span className={styles.plot} aria-hidden="true">
              {value > 0 ? <span className={styles.value}>{text}</span> : null}
              <span
                className={styles.bar}
                style={getStyle({
                  "--bar-share": whole > 0 ? value / whole : 0,
                })}
              />
            </span>
            <span className={styles.axis} aria-hidden="true">
              {bar.label}
            </span>
            <span className={visuallyHidden.visuallyHidden}>
              {bar.description ?? `${bar.label}, ${text}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
