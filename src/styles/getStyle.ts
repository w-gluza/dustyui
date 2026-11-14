import type { CSSProperties } from "react";

type StyleWithCustomProperties = CSSProperties &
  Record<`--${string}`, string | number>;

export function getStyle(style: StyleWithCustomProperties): CSSProperties {
  return style;
}
