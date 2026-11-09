import { useEffect } from 'react';
import { enterFullscreen, leaveFullscreen } from './fullscreen';

// Full screen for as long as the calling part of the page is on it: the
// returned function asks for the whole screen in the child's tap, and the
// page leaves full screen once the part goes, however the child left it.
export function useFullscreen() {
  useEffect(() => () => void leaveFullscreen(), []);
  return enterFullscreen;
}
