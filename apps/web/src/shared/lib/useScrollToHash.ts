import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Brings the part of the page an address names after its "#" into view, as a
// browser does for a page it loads itself; links inside the app do not.
export function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);
}
