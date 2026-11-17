import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";

export function useModalDialog(
  open: boolean,
  onDismiss: () => void,
): RefObject<HTMLDialogElement | null> {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const dismissFromBackdrop = useEffectEvent((event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      onDismiss();
    }
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      dismissFromBackdrop(event);
    };
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("click", handleClick);
    };
  }, []);

  return dialogRef;
}
