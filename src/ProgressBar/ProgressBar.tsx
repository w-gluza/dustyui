import type { ComponentProps, CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import { ProgressCaption } from "./ProgressCaption.js";
import styles from "./ProgressBar.module.css";

export type ProgressBarSize = "small" | "medium" | "large";
export type ProgressBarTone = "accent" | "neutral";
export type ProgressBarVariant = "plain" | "editorial";

interface ProgressBarBaseProps extends Omit<
  ComponentProps<"div">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  value?: number | undefined;
  max?: number | undefined;
  size?: ProgressBarSize | undefined;
  tone?: ProgressBarTone | undefined;
  valueLabel?: string | undefined;
  startLabel?: string | undefined;
  endLabel?: string | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

interface PlainProgressBarProps extends ProgressBarBaseProps {
  variant?: "plain" | undefined;
  showLabel?: boolean | undefined;
  note?: never;
}

interface EditorialProgressBarProps extends ProgressBarBaseProps {
  variant: "editorial";
  note?: ReactNode | undefined;
  showLabel?: never;
}

export type ProgressBarProps =
  PlainProgressBarProps | EditorialProgressBarProps;

function shareOf(value: number, max: number): number {
  return max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
}

export function ProgressBar({
  label,
  value,
  max = 1,
  variant = "plain",
  size = "medium",
  tone = "accent",
  showLabel = false,
  note,
  valueLabel,
  startLabel,
  endLabel,
  className,
  ...props
}: ProgressBarProps) {
  const share = value === undefined ? undefined : shareOf(value, max);
  const percent = share === undefined ? undefined : Math.round(share * 100);
  const fill = { "--progress-share": share } as CSSProperties;

  return (
    <div
      {...props}
      className={clsx(
        styles.progress,
        styles[size],
        styles[tone],
        variant === "editorial" && styles.editorial,
        className,
      )}
    >
      {variant === "editorial" || showLabel ? (
        <ProgressCaption
          editorial={variant === "editorial"}
          label={label}
          percent={percent}
          valueLabel={valueLabel}
          note={note}
        />
      ) : null}
      <progress
        className={visuallyHidden.visuallyHidden}
        aria-label={label}
        aria-valuetext={valueLabel}
        max={share === undefined ? undefined : 1}
        value={share}
      />
      <span
        className={styles.track}
        data-indeterminate={share === undefined || undefined}
        aria-hidden="true"
      >
        <span className={styles.fill} style={fill} />
      </span>
      {startLabel || endLabel ? (
        <div className={styles.ends}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
