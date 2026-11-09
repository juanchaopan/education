import { Prop } from '../features/learning/components/lesson-stage/Prop';
import type { SceneProps } from '../features/learning/lessons/lesson-definition';

export type FixtureShot = 'look' | 'count' | 'after';
export type FixtureState = Readonly<{ shot: FixtureShot | 'opening' }>;

// The test lesson's scene: one pebble to tap while the child is looking.
export function FixtureScene({ state }: SceneProps<FixtureState>) {
  if (state.shot !== 'look') return null;
  return (
    <Prop x={600} y={400} size={60} part="pebble" id="pebble-1" label="小石子" highlight>
      <circle r="30" />
    </Prop>
  );
}
