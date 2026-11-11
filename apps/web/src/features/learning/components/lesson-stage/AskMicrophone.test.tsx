import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AskMicrophone } from './AskMicrophone';

const finger = { pointerId: 1, isPrimary: true, button: 0 };

// The test browser has no pointer capture; holding the drop needs it.
beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
});

it('starts when held down and ends when let go', () => {
  const press = vi.fn();
  const release = vi.fn();
  render(<AskMicrophone label="按住问小兔" holding={false} onPress={press} onRelease={release} />);
  const microphone = screen.getByRole('button', { name: '按住问小兔' });
  fireEvent.pointerDown(microphone, finger);
  expect(press).toHaveBeenCalledOnce();
  expect(release).not.toHaveBeenCalled();
  fireEvent.pointerUp(microphone, finger);
  expect(release).toHaveBeenCalledOnce();
});

it('ends a hold once it is disabled under the finger', () => {
  const release = vi.fn();
  const props = { label: '按住问小兔', holding: true, onPress: () => {}, onRelease: release };
  const { rerender } = render(<AskMicrophone {...props} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: '按住问小兔' }), finger);
  rerender(<AskMicrophone {...props} disabled />);
  expect(release).toHaveBeenCalledOnce();
});
