import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// How long a named part is kept in view while the page above it is still
// filling in, and what the person does to scroll on their own, which lets it
// go at once.
const settling = 3000;
const ownScrolling = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

// The id an address names after its "#", or nothing for a malformed one.
function namedPart(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
}

// Keeps the element with `id` in view while the page grows above it, as
// cards that were loading reach their full height, until the page settles,
// the person scrolls, or the page moves on. Returns the way to let go.
function keepInView(id: string) {
  const bring = () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
  bring();
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(bring);
  observer?.observe(document.body);
  const stop = () => {
    observer?.disconnect();
    window.clearTimeout(timer);
    for (const input of ownScrolling) window.removeEventListener(input, stop);
  };
  const timer = window.setTimeout(stop, settling);
  for (const input of ownScrolling) window.addEventListener(input, stop, { passive: true });
  return stop;
}

// Where a page starts: at the part its address names after a "#", which
// links inside the app do not scroll to on their own and a page loaded
// straight from such an address reaches before its cards have filled in;
// otherwise, when a link inside the app opens it, at the top, as a page the
// browser loads would. Going back or forward to an address without a "#"
// leaves the scroll to whatever keeps those positions.
export function useArrivalScroll() {
  const { pathname, hash } = useLocation();
  const arrival = useNavigationType();
  useEffect(() => {
    const id = namedPart(hash);
    if (id) return keepInView(id);
    if (arrival !== 'POP') window.scrollTo(0, 0);
  }, [pathname, hash, arrival]);
}
