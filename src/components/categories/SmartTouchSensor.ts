import { TouchSensor } from "@dnd-kit/core";
import type { SensorProps } from "@dnd-kit/core";

/**
 * SmartTouchSensor : étend TouchSensor pour ignorer les gestes
 * qui ressemblent à un scroll rapide (vitesse verticale élevée +
 * angle fortement vertical). Active le drag uniquement quand le
 * geste est intentionnel (lent OU horizontalement marqué).
 */
export class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: React.TouchEvent, { onActivation }: any) => {
        const touch = event.touches[0];
        if (!touch) return false;

        const startX = touch.clientX;
        const startY = touch.clientY;
        const startTime = Date.now();
        let activated = false;

        const MOVE_THRESHOLD = 10; // px avant décision
        const MAX_VELOCITY = 0.6; // px/ms — au-delà = scroll
        const MIN_HORIZONTAL_RATIO = 0.4; // dx/dy pour considérer comme intentionnel

        const onMove = (e: TouchEvent) => {
          const t = e.touches[0];
          if (!t) return;
          const dx = Math.abs(t.clientX - startX);
          const dy = Math.abs(t.clientY - startY);
          const dist = Math.hypot(dx, dy);

          if (dist < MOVE_THRESHOLD) return;

          const dt = Math.max(1, Date.now() - startTime);
          const velocity = dist / dt;
          const horizontalRatio = dx / Math.max(1, dy);

          // Si geste rapide ET très vertical → c'est un scroll, on abandonne
          if (velocity > MAX_VELOCITY && horizontalRatio < MIN_HORIZONTAL_RATIO) {
            cleanup();
            return;
          }

          // Sinon : geste lent OU avec composante horizontale → drag
          activated = true;
          cleanup();
          onActivation?.({ event });
        };

        const cleanup = () => {
          window.removeEventListener("touchmove", onMove);
          window.removeEventListener("touchend", cleanup);
          window.removeEventListener("touchcancel", cleanup);
        };

        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("touchend", cleanup);
        window.addEventListener("touchcancel", cleanup);

        return activated;
      },
    },
  ];

  constructor(props: SensorProps<any>) {
    super(props);
  }
}
