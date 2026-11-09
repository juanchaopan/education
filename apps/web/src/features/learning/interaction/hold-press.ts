type Hold = { press: () => void; release: () => void };

const holdKeys = new Set([' ', 'Enter']);

// A button held down to speak: pressing starts, and letting go ends. The
// pressing pointer is captured, so a finger that wanders off the button keeps
// holding until it lifts. Whatever else ends the hold — the browser taking the
// touch away, the pointer capture lost, the button losing focus — ends it the
// same way as letting go. Space and Enter hold it from the keyboard; a key's
// repeats while held are ignored. `letGo` ends a hold the button can no longer
// hear the end of, such as when it is disabled under the finger.
export function bindHoldPress(button: HTMLElement, hold: Hold) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let held: { pointer?: number; key?: string } | undefined;

  function press(how: { pointer?: number; key?: string }) {
    if (held) return;
    held = how;
    hold.press();
  }
  function letGo() {
    if (!held) return;
    held = undefined;
    hold.release();
  }
  function releasePointer(event: PointerEvent) {
    if (held?.pointer === event.pointerId) letGo();
  }

  button.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0 || held) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press({ pointer: event.pointerId });
    },
    options,
  );
  button.addEventListener('pointerup', releasePointer, options);
  button.addEventListener('pointercancel', releasePointer, options);
  button.addEventListener('lostpointercapture', releasePointer, options);
  button.addEventListener(
    'keydown',
    (event) => {
      if (!holdKeys.has(event.key)) return;
      event.preventDefault();
      if (!event.repeat) press({ key: event.key });
    },
    options,
  );
  button.addEventListener(
    'keyup',
    (event) => {
      if (!holdKeys.has(event.key)) return;
      event.preventDefault();
      if (held?.key === event.key) letGo();
    },
    options,
  );
  button.addEventListener('blur', letGo, options);
  button.addEventListener('contextmenu', (event) => event.preventDefault(), options);
  return {
    letGo,
    unbind() {
      listeners.abort();
      letGo();
    },
  };
}
