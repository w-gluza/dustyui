import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import {
  isOnRing,
  pointAngle,
  snapValue,
  turnBetween,
  turnedValue,
  type DialPoint,
  type DialRange,
} from "./dialGeometry.js";

interface RingDrag {
  value: number;
  range: DialRange;
  onChange: (value: number) => void;
  onStart: () => void;
}

export function useRingDrag<Dial extends HTMLElement>({
  value,
  range,
  onChange,
  onStart,
}: RingDrag): RefObject<Dial | null> {
  const dialRef = useRef<Dial>(null);
  const drag = useRef<{ angle: number; value: number } | null>(null);

  const start = useEffectEvent(
    (point: DialPoint, size: number, pointerId: number) => {
      if (!isOnRing(point, size)) {
        return;
      }
      drag.current = { angle: pointAngle(point, size), value };
      dialRef.current?.setPointerCapture(pointerId);
      onStart();
    },
  );

  const turn = useEffectEvent((point: DialPoint, size: number) => {
    if (!drag.current || !isOnRing(point, size)) {
      return;
    }
    const angle = pointAngle(point, size);
    const turned = turnedValue(
      drag.current.value,
      turnBetween(drag.current.angle, angle),
      range,
    );
    drag.current = { angle, value: turned };
    onChange(snapValue(turned, range));
  });

  useEffect(() => {
    const dial = dialRef.current;
    if (!dial) {
      return;
    }
    const locate = (event: PointerEvent): [DialPoint, number] => {
      const box = dial.getBoundingClientRect();
      return [
        { x: event.clientX - box.left, y: event.clientY - box.top },
        box.width,
      ];
    };
    const handleDown = (event: PointerEvent) => {
      if (event.button === 0) {
        start(...locate(event), event.pointerId);
      }
    };
    const handleMove = (event: PointerEvent) => {
      turn(...locate(event));
    };
    const handleEnd = () => {
      drag.current = null;
    };
    dial.addEventListener("pointerdown", handleDown);
    dial.addEventListener("pointermove", handleMove);
    dial.addEventListener("pointerup", handleEnd);
    dial.addEventListener("pointercancel", handleEnd);
    return () => {
      dial.removeEventListener("pointerdown", handleDown);
      dial.removeEventListener("pointermove", handleMove);
      dial.removeEventListener("pointerup", handleEnd);
      dial.removeEventListener("pointercancel", handleEnd);
    };
  }, []);

  return dialRef;
}
