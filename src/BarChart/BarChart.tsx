import type { ComponentProps, CSSProperties } from "react";
import clsx from "clsx";
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
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export function BarChart({
  label,
  bars,
  max = 0,
  highlighted,
  className,
  style,
  ...props
}: BarChartProps) {
  const whole = Math.max(max, ...bars.map((bar) => bar.value), 0);
  const layout = {
    ...style,
    "--bar-chart-count": bars.length,
  } as CSSProperties;

  return (
    <ul
      {...props}
      className={clsx(styles.chart, className)}
      style={layout}
      aria-label={label}
    >
      {bars.map((bar, index) => {
        const value = Math.max(0, bar.value);
        const text = bar.valueLabel ?? String(value);
        const share = { "--bar-share": whole > 0 ? value / whole : 0 };

        return (
          <li
            key={`${String(index)}-${bar.label}`}
            className={styles.item}
            data-empty={value === 0 || undefined}
            aria-current={index === highlighted ? "true" : undefined}
          >
            <span className={styles.plot} aria-hidden="true">
              {value > 0 ? <span className={styles.value}>{text}</span> : null}
              <span className={styles.bar} style={share as CSSProperties} />
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
