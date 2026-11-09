import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { AccountLayout } from './AccountLayout';

// Stand-ins for the lesson scene and its character, drawn here so the story
// shows the layout without the lesson pictures, which live in another feature.
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
  title: '家长空间/账号页面版式',
  component: AccountLayout,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    art,
    titleId: 'story-account-title',
    title: '家长登录',
    children: <p>表单放在这里。</p>,
    footer: <Button variant="text">还没有账号？去注册</Button>,
  },
} satisfies Meta<typeof AccountLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithFooter: Story = {};
export const WithoutFooter: Story = { args: { footer: undefined } };
