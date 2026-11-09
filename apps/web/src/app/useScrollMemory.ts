import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// How far down each visited entry of the site was scrolled, kept by its
// history key for the tab's session, so it outlasts a reload, such as the
// one that takes a new release as the child comes back from a lesson. A
// browser that keeps no session storage keeps no positions.
const remembered = (key: string) => `scroll:${key}`;

function recall(key: string) {
  try {
    const saved = sessionStorage.getItem(remembered(key));
    return saved === null ? undefined : Number(saved);
  } catch {
    return undefined;
  }
}

function remember(key: string, y: number) {
  try {
    sessionStorage.setItem(remembered(key), String(Math.round(y)));
  } catch {
    // Without session storage the position is simply not kept.
  }
}

// React Router's key for an entry no history state names, which every page
// loaded afresh in the tab shares. Its saved position belongs to whichever
// page last used it, so a page loaded afresh never takes it up.
const sharedKey = 'default';
let loadedAfresh = true;

// How long the position is held after the page comes back, or after the
// window last changed size, before it is let go; and how long a page coming
// back may take to grow tall enough, such as a catalog loaded again.
const patience = 1000;
const growing = 10_000;

// What the child does to scroll on their own, which lets the position go.
const ownScrolling = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

// Holds the page at `y` on every frame while the page coming back grows tall
// enough and the window settles after leaving full screen, which can lay the
// page out at another width for a moment and cut the scroll short. Lets go
// once `y` is in reach and the window has kept its size for `patience`, once
// the page has had `growing` to get tall enough, or as soon as the child
// scrolls, and says so through `released`. Returns a way to let go early.
function holdAt(y: number, released: () => void) {
  let frame = 0;
  const started = performance.now();
  let settled = started + patience;
  const resized = () => (settled = performance.now() + patience);
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resized);
    for (const input of ownScrolling) window.removeEventListener(input, stop);
    released();
  };
  const hold = () => {
    if (Math.round(window.scrollY) !== y) window.scrollTo(0, y);
    const now = performance.now();
    const reached = Math.round(window.scrollY) === y;
    if ((reached && now > settled) || now - started > growing) stop();
    else frame = requestAnimationFrame(hold);
  };
  window.addEventListener('resize', resized);
  for (const input of ownScrolling) window.addEventListener(input, stop, { passive: true });
  hold();
  return stop;
}

// Keeps the scroll position of the site's pages, and puts it back when the
// child comes back to one, such as the catalog after a full-screen lesson.
// The browser cannot be left to do this: it scrolls before the page coming
// back has been drawn, and leaving full screen resizes the window under it.
// The position the child scrolled to is followed as they scroll, and kept as
// the page is left or the tab unloads; the scrolling the page does on its own
// while the position is held is not taken for the child's.
export function useScrollMemory() {
  const { key } = useLocation();
  const arrival = useNavigationType();
  useLayoutEffect(() => {
    const fresh = loadedAfresh && key === sharedKey;
    loadedAfresh = false;
    const back = arrival === 'POP' && !fresh ? recall(key) : undefined;
    const followed = { holding: back !== undefined, position: back ?? window.scrollY };
    const release =
      back === undefined
        ? undefined
        : holdAt(back, () => {
            followed.holding = false;
          });
    const follow = () => {
      if (!followed.holding) followed.position = window.scrollY;
    };
    const keep = () => remember(key, followed.position);
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('pagehide', keep);
    return () => {
      release?.();
      window.removeEventListener('scroll', follow);
      window.removeEventListener('pagehide', keep);
      keep();
    };
  }, [key, arrival]);
}
