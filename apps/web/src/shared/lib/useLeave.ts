import { useEffect, useRef, useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { leaveFullscreen } from './fullscreen';

// React Router's key for the entry a visit started on, one no page of the
// site led to.
const firstEntry = 'default';

// Leaving a full-screen page by its own back button. A child who came from
// another page of the site goes back to it, as the browser's back button
// would, so the page keeps its choices and scroll position; a child who
// opened the link directly goes to `fallback` in its place. A write on its
// way to the server, such as a final answer being judged, is awaited first,
// whether it succeeds or fails, so it is never cut off or sent again; a write
// paused while the device is offline does not hold the child. The page leaves
// full screen before it goes, so the page coming back is laid out in the
// window it will stay in.
export function useLeave(fallback: string) {
  const navigate = useNavigate();
  const { key } = useLocation();
  const writing = useIsMutating({ predicate: (write) => !write.state.isPaused }) > 0;
  // The history entry the child asked to leave. The same page can show
  // another entry, such as another version of a problem, which is left anew.
  const [askedAt, setAskedAt] = useState<string>();
  const asked = askedAt === key;
  // The entry the page has set off from, so it goes only once from an entry,
  // and the entry on screen, so it does not go at all once the child has left
  // by another way while full screen was closing.
  const leftFrom = useRef<string | undefined>(undefined);
  const showing = useRef<string | undefined>(key);

  useEffect(() => {
    showing.current = key;
    return () => {
      showing.current = undefined;
    };
  }, [key]);
  useEffect(() => {
    if (!asked || writing || leftFrom.current === key) return;
    leftFrom.current = key;
    void leaveFullscreen().then(() => {
      if (showing.current !== key) return;
      if (key !== firstEntry) void navigate(-1);
      else void navigate(fallback, { replace: true });
    });
  }, [asked, writing, key, fallback, navigate]);

  return { waiting: asked && writing, leave: () => setAskedAt(key) };
}
