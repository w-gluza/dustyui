import { ARC_END, ARC_START } from "./dialGeometry.js";
import styles from "./TempoDial.module.css";

const TICK_STEP = 3;
const MAJOR_EVERY = 10;

const TICK_ANGLES = Array.from(
  { length: (ARC_END - ARC_START) / TICK_STEP + 1 },
  (_, index) => ARC_START + index * TICK_STEP,
);

export function DialTicks({ markerAngle }: { markerAngle: number }) {
  return (
    <svg className={styles.ticks} viewBox="-52 -52 104 104" aria-hidden="true">
      {TICK_ANGLES.map((angle, index) => (
        <line
          key={angle}
          className={styles.tick}
          data-active={angle <= markerAngle || undefined}
          y1={index % MAJOR_EVERY === 0 ? -50 : -48.5}
          y2={-45}
          transform={`rotate(${String(angle)})`}
        />
      ))}
      <rect
        className={styles.marker}
        x={-1.2}
        y={-51}
        width={2.4}
        height={7}
        rx={1.2}
        transform={`rotate(${String(markerAngle)})`}
      />
    </svg>
  );
}
