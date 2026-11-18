"use client";

import { useId, type ComponentProps } from "react";
import clsx from "clsx";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import { useControllableState } from "../useControllableState.js";
import styles from "./RadioGroup.module.css";

export interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupBaseProps extends Omit<
  ComponentProps<"fieldset">,
  "children" | "dangerouslySetInnerHTML" | "defaultValue" | "onChange"
> {
  legend: string;
  legendHidden?: boolean | undefined;
  options: readonly RadioOption[];
  onValueChange?: ((value: string) => void) | undefined;
}

export type RadioGroupProps = RadioGroupBaseProps &
  (
    | { value: string; defaultValue?: never }
    | { value?: undefined; defaultValue?: string | undefined }
  );

export function RadioGroup({
  legend,
  legendHidden = false,
  options,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  className,
  name,
  form,
  ...props
}: RadioGroupProps) {
  const generatedName = useId();
  const [value, setValue] = useControllableState(
    controlledValue,
    defaultValue,
    onValueChange,
  );

  return (
    <fieldset
      {...props}
      name={name}
      form={form}
      className={clsx(styles.group, className)}
    >
      <legend
        className={legendHidden ? visuallyHidden.visuallyHidden : styles.legend}
      >
        {legend}
      </legend>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            className={visuallyHidden.visuallyHidden}
            type="radio"
            name={name ?? generatedName}
            form={form}
            value={option.value}
            checked={option.value === value}
            onChange={() => {
              setValue(option.value);
            }}
          />
          <span className={styles.check} aria-hidden="true" />
          <span className={styles.label}>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
