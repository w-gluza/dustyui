"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Avatar.module.css";

export function AvatarImage({ children }: { children: ReactNode }) {
  const artwork = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Hydration may attach handlers after the browser has finished loading.
    for (const image of artwork.current?.querySelectorAll("img") ?? []) {
      image.toggleAttribute(
        "data-image-failed",
        image.complete && image.naturalWidth === 0,
      );
    }
  }, []);

  return (
    <span
      className={styles.image}
      ref={artwork}
      onErrorCapture={({ target }) => {
        if (target instanceof HTMLImageElement) {
          target.setAttribute("data-image-failed", "");
        }
      }}
      onLoadCapture={({ target }) => {
        if (target instanceof HTMLImageElement) {
          target.removeAttribute("data-image-failed");
        }
      }}
    >
      {children}
    </span>
  );
}
