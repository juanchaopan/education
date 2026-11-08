import type { Sprite } from './garden-art';

// The props that can be carried to the basket, as drawn on the scale; a prop
// being dragged is drawn the same way under the child's finger.
export const movableProps = {
  leaf: { sprite: 'garden-cabbage', size: 76 },
  apple: { sprite: 'garden-apple', size: 57 },
} as const satisfies Record<string, { sprite: Sprite; size: number }>;
