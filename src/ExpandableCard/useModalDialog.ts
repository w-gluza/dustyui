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

  const pressedOnBackdrop = useRef(false);

  const dismissFromBackdrop = useEffectEvent((event: MouseEvent) => {
    if (event.target === event.currentTarget && pressedOnBackdrop.current) {
      onDismiss();
    }
    pressedOnBackdrop.current = false;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      dismissFromBackdrop(event);
    };
    const handlePress = (event: PointerEvent) => {
      pressedOnBackdrop.current = event.target === dialog;
    };
    dialog.addEventListener("pointerdown", handlePress);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("pointerdown", handlePress);
      dialog.removeEventListener("click", handleClick);
    };
  }, []);

  return dialogRef;
}
