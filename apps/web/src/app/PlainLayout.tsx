import { Frame } from './Frame';
import { useScrollMemory } from './useScrollMemory';

// Pages that bring their own frame across the whole screen, such as the
// parents' account pages with their scene and the brand in their card, and
// the parent space with its own navigation. Coming back to one of them puts
// it where it was scrolled.
export function PlainLayout() {
  useScrollMemory();
  return <Frame />;
}
