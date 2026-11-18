import { useEffect, useRef, type RefObject } from "react";

const CHOICES =
  'input[type="radio"], input[type="checkbox"], [role="option"], [role="menuitemradio"], [role="menuitemcheckbox"]';
const CHANGES = `${CHOICES}, select`;
const ACTIONS = 'button, a[href], [role="menuitem"]';

export function useCloseOnSelect<Panel extends HTMLElement>(
  enabled: boolean,
): RefObject<Panel | null> {
  const panelRef = useRef<Panel>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !enabled) {
      return;
    }
    let arrowing = false;
    let chosenWithEnter = false;
    const handleKeyDown = (event: KeyboardEvent) => {
      arrowing = event.key.startsWith("Arrow");
      chosenWithEnter =
        event.key === "Enter" &&
        !event.isComposing &&
        event.target instanceof Element &&
        event.target.matches(CHOICES);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      arrowing = false;
      if (event.key === "Enter" && chosenWithEnter) {
        chosenWithEnter = false;
        panel.hidePopover();
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(ACTIONS) &&
        !event.defaultPrevented
      ) {
        panel.hidePopover();
      }
    };
    const handleChange = (event: Event) => {
      if (
        !arrowing &&
        event.target instanceof Element &&
        event.target.matches(CHANGES)
      ) {
        panel.hidePopover();
      }
    };
    panel.addEventListener("keydown", handleKeyDown);
    panel.addEventListener("keyup", handleKeyUp);
    panel.addEventListener("change", handleChange);
    panel.addEventListener("click", handleClick);
    return () => {
      panel.removeEventListener("keydown", handleKeyDown);
      panel.removeEventListener("keyup", handleKeyUp);
      panel.removeEventListener("change", handleChange);
      panel.removeEventListener("click", handleClick);
    };
  }, [enabled]);

  return panelRef;
}
