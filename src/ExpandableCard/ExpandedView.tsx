import type { CSSProperties, ReactNode } from "react";
import type { HeadingLevel } from "../headingLevel.js";
import { IconButton } from "../IconButton/IconButton.js";
import styles from "./ExpandableCard.module.css";

interface ExpandedViewProps {
  title: string;
  titleId: string;
  level: HeadingLevel;
  summary: ReactNode;
  media: ReactNode;
  closeLabel: string;
  mediaStyle: CSSProperties;
  titleStyle: CSSProperties;
  onClose: () => void;
  children: ReactNode;
}

export function ExpandedView({
  title,
  titleId,
  level,
  summary,
  media,
  closeLabel,
  mediaStyle,
  titleStyle,
  onClose,
  children,
}: ExpandedViewProps) {
  const Heading = `h${level}` as const;

  return (
    <div className={styles.sheet}>
      {media != null ? (
        <div className={styles.media} style={mediaStyle}>
          {media}
        </div>
      ) : null}
      <IconButton
        className={styles.close}
        variant="secondary"
        size="small"
        label={closeLabel}
        icon="×"
        onClick={onClose}
      />
      <Heading id={titleId} className={styles.dialogTitle}>
        <span style={titleStyle}>{title}</span>
      </Heading>
      {summary != null ? (
        <p className={styles.dialogSummary}>{summary}</p>
      ) : null}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
