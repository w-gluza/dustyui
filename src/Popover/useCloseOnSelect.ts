import { useEffect, useRef, type RefObject } from "react";

export function useCloseOnSelect<Panel extends HTMLElement>(
  enabled: boolean,
): RefObject<Panel | null> {
  const panelRef = useRef<Panel>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !enabled) {
      return;
    }
    let byPointer = false;
    const handlePointerDown = () => {
      byPointer = true;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      byPointer = false;
      if (event.key === "Enter") {
        event.preventDefault();
        panel.hidePopover();
      }
    };
    const handleChange = () => {
      if (byPointer) {
        panel.hidePopover();
      }
    };
    panel.addEventListener("pointerdown", handlePointerDown);
    panel.addEventListener("keydown", handleKeyDown);
    panel.addEventListener("change", handleChange);
    return () => {
      panel.removeEventListener("pointerdown", handlePointerDown);
      panel.removeEventListener("keydown", handleKeyDown);
      panel.removeEventListener("change", handleChange);
    };
  }, [enabled]);

  return panelRef;
}
