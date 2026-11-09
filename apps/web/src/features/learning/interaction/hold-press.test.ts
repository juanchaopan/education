import { describe, expect, it, vi } from 'vitest';
import { bindHoldPress } from './hold-press';

function held() {
  const button = document.createElement('button');
  document.body.append(button);
  const capture = vi.fn();
  Object.assign(button, { setPointerCapture: capture });
  const hold = { press: vi.fn(), release: vi.fn() };
  const binding = bindHoldPress(button, hold);
  const pointer = (type: string, init: PointerEventInit = {}) =>
    button.dispatchEvent(
      new PointerEvent(type, { pointerId: 1, isPrimary: true, button: 0, ...init }),
    );
  const key = (type: string, init: KeyboardEventInit) =>
    button.dispatchEvent(new KeyboardEvent(type, { cancelable: true, ...init }));
  return { button, capture, hold, binding, pointer, key };
}

describe('holding a button to speak', () => {
  it('starts on press and ends when the finger lifts, wherever it has wandered', () => {
    const { capture, hold, pointer, binding } = held();
    pointer('pointerdown');
    expect(capture).toHaveBeenCalledWith(1);
    expect(hold.press).toHaveBeenCalledOnce();
    pointer('pointerleave');
    pointer('pointermove', { clientX: 500 });
    expect(hold.release).not.toHaveBeenCalled();
    pointer('pointerdown', { pointerId: 2, isPrimary: false });
    pointer('pointerup', { pointerId: 2 });
    expect(hold.release).not.toHaveBeenCalled();
    pointer('pointerup');
    expect(hold.release).toHaveBeenCalledOnce();
    binding.unbind();
  });

  it.each(['pointercancel', 'lostpointercapture'])('ends as letting go would on %s', (type) => {
    const { hold, pointer, binding } = held();
    pointer('pointerdown');
    pointer(type);
    pointer('pointerup');
    expect(hold.release).toHaveBeenCalledOnce();
    binding.unbind();
  });

  it('ignores other mouse buttons', () => {
    const { hold, pointer, binding } = held();
    pointer('pointerdown', { button: 2 });
    expect(hold.press).not.toHaveBeenCalled();
    binding.unbind();
  });

  it('holds with Space or Enter, ignoring repeats, and ends when focus leaves', () => {
    const { button, hold, key, binding } = held();
    key('keydown', { key: ' ' });
    key('keydown', { key: ' ', repeat: true });
    key('keyup', { key: 'Enter' });
    expect(hold.press).toHaveBeenCalledOnce();
    expect(hold.release).not.toHaveBeenCalled();
    key('keyup', { key: ' ' });
    expect(hold.release).toHaveBeenCalledOnce();
    key('keydown', { key: 'Enter' });
    button.dispatchEvent(new FocusEvent('blur'));
    expect(hold.press).toHaveBeenCalledTimes(2);
    expect(hold.release).toHaveBeenCalledTimes(2);
    binding.unbind();
  });

  it('can be let go of from outside, so a disabled button can be pressed again later', () => {
    const { hold, pointer, binding } = held();
    pointer('pointerdown');
    binding.letGo();
    expect(hold.release).toHaveBeenCalledOnce();
    pointer('pointerdown');
    expect(hold.press).toHaveBeenCalledTimes(2);
    binding.unbind();
  });

  it('ends a hold that is still on when the button goes away', () => {
    const { hold, pointer, binding } = held();
    pointer('pointerdown');
    binding.unbind();
    expect(hold.release).toHaveBeenCalledOnce();
    pointer('pointerdown');
    expect(hold.press).toHaveBeenCalledOnce();
  });
});
