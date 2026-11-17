"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { flushSync } from "react-dom";
import clsx from "clsx";
import type { HeadingLevel } from "../headingLevel.js";
import { ExpandedView } from "./ExpandedView.js";
import {
  runMorph,
  settleAnimations,
  skipActiveMorph,
} from "./morphTransition.js";
import { useModalDialog } from "./useModalDialog.js";
import "./expandableCardTransition.css";
import styles from "./ExpandableCard.module.css";

type MorphPart = "card" | "media" | "title";

interface ExpandableCardBaseProps extends Omit<
  ComponentProps<"article">,
  "title" | "dangerouslySetInnerHTML"
> {
  title: string;
  level: HeadingLevel;
  summary?: ReactNode | undefined;
  media?: ReactNode | undefined;
  expandedMedia?: ReactNode | undefined;
  closeLabel?: string | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
}

export type ExpandableCardProps = ExpandableCardBaseProps &
  (
    | { expanded: boolean; defaultExpanded?: never }
    | { expanded?: undefined; defaultExpanded?: boolean | undefined }
  );

export function ExpandableCard({
  title,
  level,
  summary,
  media,
  expandedMedia = media,
  closeLabel = "Close",
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
  className,
  style,
  children,
  ...props
}: ExpandableCardProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const morphName = `dusty-expandable-card-${id.replace(/[^a-z0-9]/giu, "")}`;
  const cardRef = useRef<HTMLButtonElement>(null);
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const [morphing, setMorphing] = useState(false);
  const expanded = controlledExpanded ?? ownExpanded;
  const dialogRef = useModalDialog(expanded, () => {
    change(false);
  });
  const Heading = `h${level}` as const;

  useEffect(() => skipActiveMorph, []);

  function apply(next: boolean) {
    flushSync(() => {
      if (controlledExpanded === undefined) {
        setOwnExpanded(next);
      }
      onExpandedChange?.(next);
    });
  }

  function change(next: boolean) {
    flushSync(() => {
      setMorphing(true);
    });
    runMorph({
      update: () => {
        apply(next);
      },
      settle: () => {
        settleAnimations(cardRef.current?.closest("article"));
        settleAnimations(dialogRef.current);
      },
      done: () => {
        setMorphing(false);
      },
    });
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    change(false);
  }

  function handleClose() {
    if (expanded) {
      apply(false);
    }
  }

  function part(name: MorphPart): CSSProperties {
    return { viewTransitionName: `${morphName}-${name}` };
  }

  function cardPart(name: MorphPart): CSSProperties | undefined {
    return morphing && !expanded ? part(name) : undefined;
  }

  return (
    <>
      <article
        {...props}
        className={clsx(styles.card, className)}
        data-expanded={expanded || undefined}
        style={{ ...style, ...cardPart("card") }}
      >
        {media != null ? (
          <div className={styles.media} style={cardPart("media")}>
            {media}
          </div>
        ) : null}
        <Heading className={styles.heading}>
          <button
            ref={cardRef}
            type="button"
            className={styles.trigger}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            onClick={() => {
              change(true);
            }}
          >
            <span className={styles.title} style={cardPart("title")}>
              {title}
            </span>
          </button>
        </Heading>
        {summary != null ? <p className={styles.summary}>{summary}</p> : null}
      </article>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        style={expanded ? part("card") : undefined}
        onCancel={handleCancel}
        onClose={handleClose}
      >
        {expanded ? (
          <ExpandedView
            title={title}
            titleId={titleId}
            level={level}
            summary={summary}
            media={expandedMedia}
            closeLabel={closeLabel}
            mediaStyle={part("media")}
            titleStyle={part("title")}
            onClose={() => {
              change(false);
            }}
          >
            {children}
          </ExpandedView>
        ) : null}
      </dialog>
    </>
  );
}
