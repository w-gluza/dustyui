"use client";

import { useId, useMemo, type ComponentProps } from "react";
import clsx from "clsx";
import { useControllableState } from "../useControllableState.js";
import {
  TabsContext,
  type TabsActivation,
  type TabsVariant,
} from "./tabsContext.js";
import styles from "./Tabs.module.css";

interface TabsBaseProps extends Omit<
  ComponentProps<"div">,
  "defaultValue" | "dangerouslySetInnerHTML"
> {
  variant?: TabsVariant | undefined;
  activation?: TabsActivation | undefined;
  onValueChange?: ((value: string) => void) | undefined;
}

export type TabsProps = TabsBaseProps &
  (
    | { value: string; defaultValue?: never }
    | { value?: undefined; defaultValue: string }
  );

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  variant = "connected",
  activation = "automatic",
  className,
  ...props
}: TabsProps) {
  const baseId = useId();
  const [value, select] = useControllableState(
    controlledValue,
    defaultValue ?? "",
    onValueChange,
  );
  const context = useMemo(
    () => ({ baseId, value, variant, activation, select }),
    [baseId, value, variant, activation, select],
  );

  return (
    <TabsContext value={context}>
      <div
        {...props}
        className={clsx(styles.tabs, styles[variant], className)}
      />
    </TabsContext>
  );
}
