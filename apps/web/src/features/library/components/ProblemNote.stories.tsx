import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ProblemNote } from './ProblemNote';

// Stand-ins for the painting and the character, drawn here so the story
// shows the note without the picture library, which lives in another feature.
const svg = (body: string, box: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}`;
const art = {
  backdrop: svg(
    '<rect width="16" height="9" fill="#d9a46b"/><rect width="16" height="4" fill="#8f7bb5"/>',
    '0 0 16 9',
  ),
  teacher: svg('<ellipse cx="2" cy="3" rx="2" ry="3" fill="#f3e6d6"/>', '0 0 4 6'),
};

const meta = {
  title: 'Library/ProblemNote',
  component: ProblemNote,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    art,
    icon: 'lock',
    title: '登录后才能打开这道题',
    description: '请先登录自己的账号。',
    action: { label: '去登录', to: '/' },
  },
} satisfies Meta<typeof ProblemNote>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SignIn: Story = {};
