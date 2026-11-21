"use client";

import { useEffect, useState, type MouseEvent } from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import { Button, type ButtonProps } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { CopyStatusIcon } from "./icons.js";
import styles from "./CopyButton.module.css";

type CopyStatus = "idle" | "copied" | "failed";

interface CopyButtonBaseProps extends Omit<
  ButtonProps,
  | "children"
  | "icon"
  | "iconPosition"
  | "value"
  | "aria-label"
  | "aria-labelledby"
> {
  value: string | (() => string);
  label?: string | undefined;
  copiedLabel?: string | undefined;
  failedLabel?: string | undefined;
  feedbackDuration?: number | undefined;
  onCopied?: ((value: string) => void) | undefined;
  onCopyError?: ((error: unknown) => void) | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export type CopyButtonProps = CopyButtonBaseProps &
  (
    | { iconOnly?: boolean | undefined; iconPosition?: never }
    | {
        iconOnly?: false | undefined;
        iconPosition?: ButtonProps["iconPosition"];
      }
  );

const DEFAULT_FEEDBACK_DURATION = 2000;

const STATUSES = ["idle", "copied", "failed"] as const;

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Copy failed",
  iconOnly = false,
  feedbackDuration = DEFAULT_FEEDBACK_DURATION,
  variant = "secondary",
  iconPosition,
  onCopied,
  onCopyError,
  onClick,
  className,
  ...props
}: CopyButtonProps) {
  const [feedback, setFeedback] = useState<{ status: CopyStatus }>({
    status: "idle",
  });
  const [animated, setAnimated] = useState(false);
  const { status } = feedback;
  const labels = { idle: label, copied: copiedLabel, failed: failedLabel };

  useEffect(readyAnnouncer, []);

  useEffect(() => {
    if (feedback.status === "idle") {
      return undefined;
    }
    if (feedbackDuration === Infinity) {
      return undefined;
    }
    const timer = setTimeout(
      () => {
        setFeedback({ status: "idle" });
      },
      Number.isFinite(feedbackDuration) && feedbackDuration >= 0
        ? feedbackDuration
        : DEFAULT_FEEDBACK_DURATION,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [feedback, feedbackDuration]);

  async function copy() {
    let copied: string;
    try {
      copied = typeof value === "function" ? value() : value;
      await navigator.clipboard.writeText(copied);
    } catch (error) {
      setAnimated(true);
      setFeedback({ status: "failed" });
      announce(failedLabel, "assertive");
      onCopyError?.(error);
      return;
    }
    setAnimated(true);
    setFeedback({ status: "copied" });
    announce(copiedLabel);
    onCopied?.(copied);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) {
      copy().catch(reportError);
    }
  }

  if (iconOnly) {
    return (
      <IconButton
        {...props}
        className={clsx(styles.copy, className)}
        variant={variant}
        label={labels[status]}
        icon={<CopyStatusIcon status={status} />}
        data-status={status}
        data-animated={animated || undefined}
        onClick={handleClick}
      />
    );
  }

  return (
    <Button
      {...props}
      className={clsx(styles.copy, className)}
      variant={variant}
      iconPosition={iconPosition}
      icon={<CopyStatusIcon status={status} />}
      data-status={status}
      data-animated={animated || undefined}
      onClick={handleClick}
    >
      <span className={styles.labels}>
        {STATUSES.map((name) => (
          <span
            key={name}
            className={styles.text}
            data-shown={name === status || undefined}
            aria-hidden={name === status ? undefined : true}
          >
            {labels[name]}
          </span>
        ))}
      </span>
    </Button>
  );
}
