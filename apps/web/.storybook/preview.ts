import type { Preview } from '@storybook/react-vite';
import '../src/styles/tokens.css';
import '../src/styles/global.css';

// Stories show the day theme unless the toolbar, or `globals=theme:night` in
// a story's address, picks the night one; the site itself picks by the clock.
const preview: Preview = {
  globalTypes: {
    theme: {
      description: '主题',
      toolbar: {
        title: '主题',
        items: [
          { value: 'day', title: '白天' },
          { value: 'night', title: '晚上' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'day' },
  decorators: [
    (Story, { globals }) => {
      document.documentElement.dataset.theme = globals.theme === 'night' ? 'night' : 'day';
      return Story();
    },
  ],
};

export default preview;
