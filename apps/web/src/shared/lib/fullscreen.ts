// The whole page goes full screen, not just one part of it, so notices the
// app shell lays over every page, such as a waiting update, stay in view.

// The request on its way, until the browser has gone full screen or refused.
let asking: Promise<void> | undefined;

// Asks the browser to show the page full screen. It must be called while
// handling the child's tap; a second tap while the first is still being
// answered asks nothing more. A browser that cannot, such as Safari on an
// iPhone, or that refuses leaves the page filling its window as it already
// does, so nothing is reported.
export function enterFullscreen() {
  const page = document.documentElement;
  if (document.fullscreenElement || asking || typeof page.requestFullscreen !== 'function') return;
  try {
    asking = page
      .requestFullscreen({ navigationUI: 'hide' })
      .catch(() => {})
      .finally(() => {
        asking = undefined;
      });
  } catch {
    // A browser that throws instead of rejecting refuses all the same.
  }
}

// Leaves full screen if the page is in it, once any request still on its way
// has been answered, so a page left at once never stays full screen behind
// the child. Settles once the browser has left it or could not.
export async function leaveFullscreen() {
  await asking;
  if (!document.fullscreenElement) return;
  await document.exitFullscreen().catch(() => {});
}
