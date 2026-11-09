import { createContext, useContext, useEffect, useId, useState } from 'react';
import { useLatest } from './useLatest';

// How one part of the page stands toward a full reload: nothing a reload
// would lose; a lesson film a reload would cut off; something shown only
// once, such as a new registration KEY, that a reload would take away and
// that cannot be saved; work being saved; or work a reload would lose until
// it is saved.
export type Readiness = 'ready' | 'playing' | 'showing' | 'saving' | 'unsaved';

export type ReadinessPart = Readonly<{ readiness: Readiness; save: () => void }>;
export type ReadinessRegistry = Readonly<{
  put: (id: string, part: ReadinessPart) => void;
  remove: (id: string) => void;
}>;

// Parts report through a registry that never changes, so a report re-renders
// only what reads the parts.
export const RegistryContext = createContext<ReadinessRegistry | undefined>(undefined);
export const PartsContext = createContext<ReadonlyMap<string, ReadinessPart>>(new Map());

// What keeps the page from reloading, the first that applies: a film is never
// cut off, not even to save; unsaved work is saved; saving work is awaited;
// and then what is shown only once stays until it is gone, since saving does
// not disturb it.
const holds: readonly Readiness[] = ['playing', 'unsaved', 'saving', 'showing'];

// The strongest of these holds, or ready when none holds.
export function strongest(readinesses: readonly Readiness[]): Readiness {
  return holds.find((hold) => readinesses.includes(hold)) ?? 'ready';
}

// Reports how this part of the page stands toward a reload for as long as it
// is on the page, and how to save its unsaved work. Outside a provider the
// report goes nowhere.
export function useReloadReadiness(readiness: Readiness, save: () => void = () => {}) {
  const registry = useContext(RegistryContext);
  const id = useId();
  const latest = useLatest(save);
  const [saveLatest] = useState(() => () => latest.current());
  useEffect(() => {
    registry?.put(id, { readiness, save: saveLatest });
  }, [registry, id, readiness, saveLatest]);
  useEffect(() => () => registry?.remove(id), [registry, id]);
}

// How the whole page stands toward a reload, and a way to save every part
// whose work is unsaved.
export function usePageReadiness() {
  const parts = [...useContext(PartsContext).values()];
  return {
    readiness: strongest(parts.map((part) => part.readiness)),
    saveUnsaved() {
      for (const part of parts) if (part.readiness === 'unsaved') part.save();
    },
  };
}
