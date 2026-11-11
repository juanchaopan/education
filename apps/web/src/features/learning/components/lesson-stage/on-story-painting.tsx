import type { Decorator } from '@storybook/react-vite';
import { StoryPainting } from './StoryPainting';

// The decorator the stories of the parts laid into a stage share: each part
// on the stories' dusk painting, the way it sits on a lesson's backdrop.
export const onStoryPainting: Decorator = (Story) => (
  <StoryPainting>
    <Story />
  </StoryPainting>
);
