"use client";

import { useRef, type ComponentProps } from "react";
import clsx from "clsx";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import { useControllableState } from "../useControllableState.js";
import { clampValue, valueAngle } from "./dialGeometry.js";
import { DialTicks } from "./DialTicks.js";
import { useRingDrag } from "./useRingDrag.js";
import styles from "./TempoDial.module.css";

interface TempoDialBaseProps extends Omit<
  ComponentProps<"div">,
  | "children"
  | "dangerouslySetInnerHTML"
  | "defaultValue"
  | "aria-label"
  | "aria-labelledby"
> {
  label: string;
  min: number;
  max: number;
  step?: number | undefined;
  unit?: string | undefined;
  valueText?: ((value: number) => string) | undefined;
  onValueChange?: ((value: number) => void) | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export type TempoDialProps = TempoDialBaseProps &
  (
    | { value: number; defaultValue?: never }
    | { value?: undefined; defaultValue?: number | undefined }
  );

export function TempoDial({
  label,
  min,
  max,
  step = 1,
  unit,
  valueText,
  value: controlledValue,
  defaultValue = min,
  onValueChange,
  className,
  ...props
}: TempoDialProps) {
  const range = { min, max, step };
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawValue, setValue] = useControllableState(
    controlledValue,
    defaultValue,
    onValueChange,
  );
  const value = clampValue(rawValue, range);
  const dialRef = useRingDrag<HTMLDivElement>({
    value,
    range,
    onChange: setValue,
    onStart: () => {
      inputRef.current?.focus({ preventScroll: true });
    },
  });

  return (
    <div {...props} ref={dialRef} className={clsx(styles.dial, className)}>
      <DialTicks markerAngle={valueAngle(value, range)} />
      <div className={styles.readout} aria-hidden="true">
        <span className={styles.value}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      <input
        ref={inputRef}
        className={clsx(visuallyHidden.visuallyHidden, styles.input)}
        type="range"
        aria-label={label}
        aria-valuetext={
          valueText?.(value) ?? [value, unit].filter(Boolean).join(" ")
        }
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          setValue(event.target.valueAsNumber);
        }}
      />
    </div>
  );
}
