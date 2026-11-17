import type { ReactNode } from "react";
import { Vinyl } from "./Vinyl.js";
import styles from "./RecordSleeve.module.css";

interface SleeveStageProps {
  artwork: ReactNode;
  playing: boolean;
}

export function SleeveStage({ artwork, playing }: SleeveStageProps) {
  return (
    <div className={styles.stage}>
      <Vinyl playing={playing} />
      <div className={styles.sleeve}>{artwork}</div>
    </div>
  );
}
