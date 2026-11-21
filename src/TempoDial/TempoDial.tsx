"use client";

import { useRef, type ComponentProps } from "react";
import clsx from "clsx";
import { useControllableState } from "../useControllableState.js";
import { snapValue, valueAngle } from "./dialGeometry.js";
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

function after<Event extends { defaultPrevented: boolean }>(
  theirs: ((event: Event) => void) | undefined,
  ours: (event: Event) => void,
): (event: Event) => void {
  return (event) => {
    theirs?.(event);
    if (!event.defaultPrevented) {
      ours(event);
    }
  };
}

function always<Event>(
  theirs: ((event: Event) => void) | undefined,
  ours: (event: Event) => void,
): (event: Event) => void {
  return (event) => {
    theirs?.(event);
    ours(event);
  };
}

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
  "aria-describedby": describedBy,
  "aria-details": details,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ...props
}: TempoDialProps) {
  const range = { min, max, step };
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawValue, setValue] = useControllableState(
    controlledValue,
    defaultValue,
    onValueChange,
  );
  const value = snapValue(rawValue, range);
  const ring = useRingDrag<HTMLDivElement>({
    value,
    range,
    onChange: setValue,
    onStart: () => {
      inputRef.current?.focus({ preventScroll: true });
    },
  });

  return (
    <div
      {...props}
      className={clsx(styles.dial, className)}
      onPointerDown={after(onPointerDown, ring.onPointerDown)}
      onPointerMove={after(onPointerMove, ring.onPointerMove)}
      onPointerUp={always(onPointerUp, ring.onPointerUp)}
      onPointerCancel={always(onPointerCancel, ring.onPointerCancel)}
      onLostPointerCapture={always(
        onLostPointerCapture,
        ring.onLostPointerCapture,
      )}
    >
      <DialTicks markerAngle={valueAngle(value, range)} />
      <span className={styles.rest} aria-hidden="true" />
      <div className={styles.readout} aria-hidden="true">
        <span className={styles.value}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      <input
        ref={inputRef}
        className={styles.input}
        type="range"
        aria-label={label}
        aria-describedby={describedBy}
        aria-details={details}
        aria-valuetext={
          valueText?.(value) ?? [String(value), unit].filter(Boolean).join(" ")
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
