import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from "./icons.js";
import styles from "./RecordSleeve.module.css";

export interface PlayerLabels {
  play: string;
  pause: string;
  previous: string;
  next: string;
  progress: string;
}

interface PlayerControlsProps {
  playing: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  progress: number | undefined;
  labels: PlayerLabels;
  onPlayingChange: (playing: boolean) => void;
  onStep: (offset: -1 | 1) => void;
}

export function PlayerControls({
  playing,
  hasPrevious,
  hasNext,
  progress,
  labels,
  onPlayingChange,
  onStep,
}: PlayerControlsProps) {
  return (
    <div className={styles.player}>
      <div className={styles.controls}>
        <IconButton
          variant="plain"
          size="small"
          label={labels.previous}
          icon={<PreviousIcon />}
          aria-disabled={!hasPrevious}
          onClick={() => {
            onStep(-1);
          }}
        />
        <Button
          icon={playing ? <PauseIcon /> : <PlayIcon />}
          onClick={() => {
            onPlayingChange(!playing);
          }}
        >
          {playing ? labels.pause : labels.play}
        </Button>
        <IconButton
          variant="plain"
          size="small"
          label={labels.next}
          icon={<NextIcon />}
          aria-disabled={!hasNext}
          onClick={() => {
            onStep(1);
          }}
        />
      </div>
      {progress !== undefined ? (
        <progress
          className={styles.progress}
          aria-label={labels.progress}
          max={1}
          value={Math.min(1, Math.max(0, progress))}
        />
      ) : null}
    </div>
  );
}
