import { useEffect } from 'react';

// How often a lesson page the child is working on sends a heartbeat, and how
// long after the child last did something the page stops counting. The
// server counts the time between two heartbeats up to 90 seconds apart.
export const beatEvery = 30_000;
export const idleAfter = 120_000;

// What the child does on the page: pressing, dragging, drawing, typing or
// speaking into the microphone, which starts with a press. Moving the mouse
// over the page without pressing is not working on it.
const actions = ['pointerdown', 'pointermove', 'keydown', 'input'] as const;

function sendBeat(csrf: string) {
  return fetch('/api/v1/children/study-time', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/json',
      'X-Education-Request': 'session',
      'X-CSRF-Token': csrf,
    },
    body: '{}',
  });
}

// Counts a signed-in child's study time on a lesson page: while the page is
// in view and the child did something within the last two minutes, it sends
// a heartbeat every 30 seconds, and one at once when the child starts again
// after a pause. A heartbeat that fails is simply missed: the next one still
// counts the stretch when it comes within 90 seconds of the last one the
// server took. One the server refuses as signed out stops the clock.
export function useStudyTime(csrf: string) {
  useEffect(() => {
    let lastAction = Number.NEGATIVE_INFINITY;
    let signedOut = false;
    const studying = (now: number) =>
      document.visibilityState === 'visible' && now - lastAction <= idleAfter;
    const beat = () => {
      if (signedOut) return;
      sendBeat(csrf)
        .then((response) => {
          if (response.status === 401) signedOut = true;
        })
        .catch(() => undefined);
    };
    const act = (event: Event) => {
      if (event.type === 'pointermove' && (event as PointerEvent).buttons === 0) return;
      const now = Date.now();
      const resuming = !studying(now);
      lastAction = now;
      if (resuming) beat();
    };
    const tick = () => {
      if (studying(Date.now())) beat();
    };
    for (const action of actions)
      document.addEventListener(action, act, { capture: true, passive: true });
    const clock = window.setInterval(tick, beatEvery);
    return () => {
      window.clearInterval(clock);
      for (const action of actions) document.removeEventListener(action, act, { capture: true });
    };
  }, [csrf]);
}
