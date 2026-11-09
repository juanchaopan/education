// Whether a voice in this status has the microphone open, or about to open.
export const usesMicrophone = (status: string) => status === 'starting' || status === 'recording';

// Who is using a lesson's one microphone. A child holding a button to speak
// keeps it until they let go. A page listening for an answer on its own gives
// it up when the child presses to speak, and is told so through `yieldTurn`.
type Holder = { owner: symbol; yieldTurn?: () => void };

export function createMicrophoneTurn() {
  let holder: Holder | undefined;
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());
  return {
    // Takes the microphone for `owner`; false when someone else keeps it.
    take(owner: symbol, yieldTurn?: () => void) {
      if (holder && holder.owner !== owner) {
        const { yieldTurn: stop } = holder;
        if (!stop) return false;
        holder = undefined;
        stop();
      }
      holder = { owner, yieldTurn };
      changed();
      return true;
    },
    give(owner: symbol) {
      if (holder?.owner !== owner) return;
      holder = undefined;
      changed();
    },
    // Whether someone other than `owner` keeps the microphone from them.
    blocks: (owner: symbol) => !!holder && holder.owner !== owner && !holder.yieldTurn,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export type MicrophoneTurn = ReturnType<typeof createMicrophoneTurn>;
