import { describe, expect, it, vi } from 'vitest';
import { bindObjectDrag } from './object-drag';

function scene() {
  const surface = document.createElement('div');
  const object = document.createElement('button');
  surface.append(object);
  const capture = vi.fn();
  Object.assign(object, { setPointerCapture: capture, hasPointerCapture: () => false });
  const drag = { move: vi.fn(), drop: vi.fn(), cancel: vi.fn() };
  const unbind = bindObjectDrag(surface, (event) => (event.target === object ? drag : undefined));
  const send = (type: string, clientX = 0, pointerId = 1) => {
    const event = new PointerEvent(type, { pointerId, clientX, isPrimary: true, bubbles: true });
    object.dispatchEvent(event);
    return event;
  };
  return { object, drag, capture, send, unbind };
}

describe('direct object interaction', () => {
  it('tracks just the captured pointer and uses the final drop coordinates', () => {
    const { capture, drag, send, unbind } = scene();
    send('pointerdown');
    send('pointermove', 3);
    send('pointermove', 80, 2);
    expect(drag.move).not.toHaveBeenCalled();
    send('pointermove', 80);
    const release = send('pointerup', 105);
    expect(capture).toHaveBeenCalledWith(1);
    expect(drag.move).toHaveBeenCalledTimes(1);
    expect(drag.drop).toHaveBeenCalledWith(release);
    unbind();
  });

  it('supports an immediate long drop and leaves keyboard clicks available', () => {
    const { object, drag, send, unbind } = scene();
    const activate = vi.fn();
    object.addEventListener('click', activate);
    send('pointerdown');
    send('pointerup', 75);
    object.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(drag.drop).toHaveBeenCalledOnce();
    expect(activate).not.toHaveBeenCalled();
    object.click();
    expect(activate).toHaveBeenCalledOnce();
    unbind();
  });

  it('keeps a tap clickable and cancels without dropping on lost capture or disposal', () => {
    const { object, drag, send, unbind } = scene();
    const activate = vi.fn();
    object.addEventListener('click', activate);
    send('pointerdown');
    send('pointerup', 2);
    object.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(activate).toHaveBeenCalledOnce();
    drag.cancel.mockClear();
    send('pointerdown');
    send('pointermove', 30);
    send('lostpointercapture', 30);
    send('pointerup', 30);
    send('pointerdown');
    unbind();
    expect(drag.cancel).toHaveBeenCalledTimes(2);
    expect(drag.drop).not.toHaveBeenCalled();
  });
});
