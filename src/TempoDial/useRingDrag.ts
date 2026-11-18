import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import {
  angleValue,
  isOnRing,
  pointAngle,
  snapValue,
  turnBetween,
  turnedValue,
  type DialPoint,
  type DialRange,
} from "./dialGeometry.js";

const TAP_SLOP = 3;

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
  const drag = useRef<{
    pointerId: number;
    angle: number;
    value: number;
    turned: number;
  } | null>(null);

  const start = useEffectEvent(
    (point: DialPoint, size: number, pointerId: number) => {
      if (drag.current || !isOnRing(point, size)) {
        return;
      }
      drag.current = {
        pointerId,
        angle: pointAngle(point, size),
        value,
        turned: 0,
      };
      dialRef.current?.setPointerCapture(pointerId);
      onStart();
    },
  );

  const turn = useEffectEvent(
    (point: DialPoint, size: number, pointerId: number) => {
      if (drag.current?.pointerId !== pointerId || !isOnRing(point, size)) {
        return;
      }
      const angle = pointAngle(point, size);
      const degrees = turnBetween(drag.current.angle, angle);
      const turned = turnedValue(drag.current.value, degrees, range);
      drag.current = {
        pointerId,
        angle,
        value: turned,
        turned: drag.current.turned + Math.abs(degrees),
      };
      onChange(snapValue(turned, range));
    },
  );

  const release = useEffectEvent((pointerId: number) => {
    const pressed = drag.current;
    if (pressed?.pointerId === pointerId && pressed.turned < TAP_SLOP) {
      onChange(snapValue(angleValue(pressed.angle, range), range));
    }
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
      turn(...locate(event), event.pointerId);
    };
    const handleEnd = (event: PointerEvent) => {
      if (drag.current?.pointerId === event.pointerId) {
        drag.current = null;
      }
    };
    dial.addEventListener("pointerdown", handleDown);
    dial.addEventListener("pointermove", handleMove);
    const handleUp = (event: PointerEvent) => {
      release(event.pointerId);
      handleEnd(event);
    };
    dial.addEventListener("pointerup", handleUp);
    dial.addEventListener("pointercancel", handleEnd);
    dial.addEventListener("lostpointercapture", handleEnd);
    return () => {
      dial.removeEventListener("pointerdown", handleDown);
      dial.removeEventListener("pointermove", handleMove);
      dial.removeEventListener("pointerup", handleUp);
      dial.removeEventListener("pointercancel", handleEnd);
      dial.removeEventListener("lostpointercapture", handleEnd);
    };
  }, []);

  return dialRef;
}
