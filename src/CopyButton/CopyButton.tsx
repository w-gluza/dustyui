"use client";

import { useEffect, useState, type MouseEvent } from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import { Button, type ButtonProps } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { CopyStatusIcon } from "./icons.js";
import styles from "./CopyButton.module.css";

type CopyStatus = "idle" | "copied" | "failed";

export interface CopyButtonProps extends Omit<
  ButtonProps,
  "children" | "icon" | "value" | "aria-label" | "aria-labelledby"
> {
  value: string;
  label?: string | undefined;
  copiedLabel?: string | undefined;
  failedLabel?: string | undefined;
  iconOnly?: boolean | undefined;
  feedbackDuration?: number | undefined;
  onCopied?: ((value: string) => void) | undefined;
  onCopyError?: ((error: unknown) => void) | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

const SETTLED_LABELS = ["idle", "copied"] as const;
const FAILED_LABELS = ["failed"] as const;

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Copy failed",
  iconOnly = false,
  feedbackDuration = 2000,
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
    const timer = setTimeout(() => {
      setFeedback({ status: "idle" });
    }, feedbackDuration);

    return () => {
      clearTimeout(timer);
    };
  }, [feedback, feedbackDuration]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      setFeedback({ status: "failed" });
      announce(failedLabel, "assertive");
      onCopyError?.(error);
      return;
    }
    setFeedback({ status: "copied" });
    announce(copiedLabel);
    onCopied?.(value);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) {
      setAnimated(true);
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
        {(status === "failed" ? FAILED_LABELS : SETTLED_LABELS).map((name) => (
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
