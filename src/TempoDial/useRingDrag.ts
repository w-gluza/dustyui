import { useRef, type PointerEvent as ReactPointerEvent } from "react";
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

export interface RingDragHandlers<Dial extends HTMLElement> {
  onPointerDown: (event: ReactPointerEvent<Dial>) => void;
  onPointerMove: (event: ReactPointerEvent<Dial>) => void;
  onPointerUp: (event: ReactPointerEvent<Dial>) => void;
  onPointerCancel: (event: ReactPointerEvent<Dial>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<Dial>) => void;
}

function locate(event: ReactPointerEvent<HTMLElement>): [DialPoint, number] {
  const box = event.currentTarget.getBoundingClientRect();
  return [
    { x: event.clientX - box.left, y: event.clientY - box.top },
    box.width,
  ];
}

export function useRingDrag<Dial extends HTMLElement>({
  value,
  range,
  onChange,
  onStart,
}: RingDrag): RingDragHandlers<Dial> {
  const drag = useRef<{
    pointerId: number;
    angle: number;
    value: number;
    turned: number;
  } | null>(null);

  function end(event: ReactPointerEvent<Dial>) {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
    }
  }

  return {
    onPointerDown(event) {
      const [point, size] = locate(event);
      if (event.button !== 0 || drag.current || !isOnRing(point, size)) {
        return;
      }
      drag.current = {
        pointerId: event.pointerId,
        angle: pointAngle(point, size),
        value,
        turned: 0,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      onStart();
    },
    onPointerMove(event) {
      const [point, size] = locate(event);
      const pressed = drag.current;
      if (pressed?.pointerId !== event.pointerId || !isOnRing(point, size)) {
        return;
      }
      const angle = pointAngle(point, size);
      const degrees = turnBetween(pressed.angle, angle);
      const turned = turnedValue(pressed.value, degrees, range);
      drag.current = {
        pointerId: event.pointerId,
        angle,
        value: turned,
        turned: pressed.turned + Math.abs(degrees),
      };
      onChange(snapValue(turned, range));
    },
    onPointerUp(event) {
      const pressed = drag.current;
      if (
        pressed?.pointerId === event.pointerId &&
        pressed.turned < TAP_SLOP &&
        !event.defaultPrevented
      ) {
        onChange(snapValue(angleValue(pressed.angle, range), range));
      }
      end(event);
    },
    onPointerCancel: end,
    onLostPointerCapture: end,
  };
}
