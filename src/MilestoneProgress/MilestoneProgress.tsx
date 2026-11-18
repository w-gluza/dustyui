import type { ComponentProps, CSSProperties } from "react";
import clsx from "clsx";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import styles from "./MilestoneProgress.module.css";

export interface MilestoneProgressProps extends Omit<
  ComponentProps<"div">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  milestones: readonly string[];
  completed: number;
  progress?: number | undefined;
  completedLabel?: string | undefined;
  progressLabel?: string | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lineShare(reached: number, progress: number, count: number): number {
  if (reached === 0 || count < 2) {
    return 0;
  }
  return clamp((reached - 1 + clamp(progress, 0, 1)) / (count - 1), 0, 1);
}

function CheckIcon() {
  return (
    <svg className={styles.check} viewBox="0 0 16 16">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export function MilestoneProgress({
  label,
  milestones,
  completed,
  progress = 0,
  completedLabel = "completed",
  progressLabel,
  className,
  style,
  ...props
}: MilestoneProgressProps) {
  const count = milestones.length;
  const reached = Number.isFinite(completed)
    ? clamp(Math.floor(completed), 0, count)
    : 0;
  const layout = {
    ...style,
    "--milestone-count": count,
    "--milestone-share": lineShare(
      reached,
      Number.isFinite(progress) ? progress : 0,
      count,
    ),
  } as CSSProperties;

  return (
    <div
      {...props}
      className={clsx(styles.milestones, className)}
      style={layout}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} />
      </span>
      <ol role="list" className={styles.list} aria-label={label}>
        {milestones.map((name, index) => {
          const done = index < reached;
          const current = index === reached;

          return (
            <li
              key={`${String(index)}-${name}`}
              className={styles.item}
              data-completed={done || undefined}
              aria-current={current ? "step" : undefined}
            >
              <span className={styles.marker} aria-hidden="true">
                {done ? <CheckIcon /> : null}
              </span>
              <span>
                {name}
                {done ? (
                  <span className={visuallyHidden.visuallyHidden}>
                    , {completedLabel}
                  </span>
                ) : null}
                {current && progressLabel ? (
                  <span className={visuallyHidden.visuallyHidden}>
                    , {progressLabel}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
