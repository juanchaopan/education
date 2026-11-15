// What nothing in a capsule asks of the page.
export const nothing = () => {};

// The speaking side of a capsule answered by tapping alone, as in a parent's
// preview, where no microphone opens: nothing listens, hears or confirms,
// so the capsule offers what to tap from the start.
export const tappedOnly = {
  blocked: true,
  onListen: nothing,
  onFinish: nothing,
  onStopWaiting: nothing,
  onConfirm: nothing,
} as const;
