import { movableProps } from '../../components/garden-balance/movable-props';
import type { StageProps } from '../../interaction/useStageDrag';
import type { Move } from './garden-story';

// A cabbage or an apple goes into the basket; the apple that shows its
// cucumbers and the apples swapped for cucumbers are tapped.
export const gardenProps: StageProps<Move, typeof movableProps> = {
  lifts: movableProps,
  drop: (part, place) => (place === 'basket' ? { kind: 'drop', part, place } : undefined),
  tap: (part) => (part === 'exchange' || part === 'replace' ? { kind: 'tap', part } : undefined),
};
