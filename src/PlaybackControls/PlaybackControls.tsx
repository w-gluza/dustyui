"use client";

import type { ComponentProps } from "react";
import clsx from "clsx";
import { IconButton } from "../IconButton/IconButton.js";
import { ProgressBar } from "../ProgressBar/ProgressBar.js";
import { useControllableState } from "../useControllableState.js";
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from "./icons.js";
import styles from "./PlaybackControls.module.css";

export interface PlaybackControlsLabels {
  play: string;
  pause: string;
  previous: string;
  next: string;
  progress: string;
}

const DEFAULT_LABELS: PlaybackControlsLabels = {
  play: "Play",
  pause: "Pause",
  previous: "Previous track",
  next: "Next track",
  progress: "Track progress",
};

interface PlaybackControlsBaseProps extends Omit<
  ComponentProps<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  progress?: number | undefined;
  labels?: Partial<PlaybackControlsLabels> | undefined;
  onPlayingChange?: ((playing: boolean) => void) | undefined;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}

export type PlaybackControlsProps = PlaybackControlsBaseProps &
  (
    | { playing: boolean; defaultPlaying?: never }
    | { playing?: undefined; defaultPlaying?: boolean | undefined }
  );

export function PlaybackControls({
  playing: controlledPlaying,
  defaultPlaying = false,
  progress,
  labels,
  onPlayingChange,
  onPrevious,
  onNext,
  className,
  ...props
}: PlaybackControlsProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const [playing, setPlaying] = useControllableState(
    controlledPlaying,
    defaultPlaying,
    onPlayingChange,
  );

  return (
    <div {...props} className={clsx(styles.player, className)}>
      <div className={styles.controls}>
        <IconButton
          variant="plain"
          size="small"
          label={text.previous}
          icon={<PreviousIcon />}
          aria-disabled={!onPrevious}
          onClick={onPrevious}
        />
        <IconButton
          shape="pill"
          label={playing ? text.pause : text.play}
          icon={playing ? <PauseIcon /> : <PlayIcon />}
          onClick={() => {
            setPlaying(!playing);
          }}
        />
        <IconButton
          variant="plain"
          size="small"
          label={text.next}
          icon={<NextIcon />}
          aria-disabled={!onNext}
          onClick={onNext}
        />
      </div>
      {progress !== undefined ? (
        <ProgressBar label={text.progress} value={progress} />
      ) : null}
    </div>
  );
}
