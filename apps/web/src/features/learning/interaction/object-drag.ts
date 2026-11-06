type ObjectDrag = {
  move: (event: PointerEvent) => void;
  drop: (event: PointerEvent) => void;
  cancel: () => void;
};

const dragSlop = 6;

type ActiveDrag = {
  start: PointerEvent;
  target: Element;
  object: ObjectDrag;
  moved: boolean;
};

function movedFar({ start, moved }: ActiveDrag, event: PointerEvent) {
  return (
    moved || Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > dragSlop
  );
}

function releaseDrag({ start, target, object }: ActiveDrag) {
  if (target.hasPointerCapture(start.pointerId)) {
    target.releasePointerCapture(start.pointerId);
  }
  object.cancel();
}

// Bind to the stable scene. The lesson supplies the hit target, movement and drop rules.
export function bindObjectDrag(
  surface: Element,
  begin: (event: PointerEvent) => ObjectDrag | undefined,
) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let active: ActiveDrag | undefined;
  let suppressClick = false;

  function startDrag(event: Event) {
    if (!(event instanceof PointerEvent)) return;
    if (!event.isPrimary || event.button !== 0 || active) return;
    suppressClick = false;
    if (!(event.target instanceof Element)) return;
    const object = begin(event);
    if (!object) return;
    event.target.setPointerCapture(event.pointerId);
    active = { start: event, object, target: event.target, moved: false };
  }

  function moveDrag(event: Event) {
    if (!(event instanceof PointerEvent)) return;
    if (active?.start.pointerId !== event.pointerId || !movedFar(active, event)) return;
    active.moved = true;
    active.object.move(event);
  }

  function finishDrag(event: Event) {
    if (!(event instanceof PointerEvent)) return;
    if (active?.start.pointerId !== event.pointerId) return;
    const drag = active;
    active = undefined;
    if (event.type === 'pointerup' && movedFar(drag, event)) {
      suppressClick = true;
      drag.object.drop(event);
    } else {
      drag.object.cancel();
    }
  }

  surface.addEventListener('pointerdown', startDrag, options);
  surface.addEventListener('pointermove', moveDrag, options);
  surface.addEventListener('pointerup', finishDrag, options);
  surface.addEventListener('pointercancel', finishDrag, options);
  surface.addEventListener('lostpointercapture', finishDrag, options);
  surface.addEventListener(
    'click',
    (event) => {
      if (suppressClick && event instanceof MouseEvent && event.detail > 0) {
        suppressClick = false;
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    { ...options, capture: true },
  );

  return () => {
    listeners.abort();
    const drag = active;
    active = undefined;
    if (drag) releaseDrag(drag);
  };
}
