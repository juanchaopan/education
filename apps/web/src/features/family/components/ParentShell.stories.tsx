import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ParentSection } from './ParentSection';
import { ParentShell } from './ParentShell';

const meta = {
  title: '家长空间/框架',
  component: ParentShell,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/family/practice']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    email: 'parent@example.test',
    leaving: false,
    onLogout: () => {},
    children: (
      <ParentSection titleId="story-section-title" title="练习安排">
        <p>这一部分的卡片放在这里。</p>
      </ParentSection>
    ),
  },
} satisfies Meta<typeof ParentShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Practice: Story = {};
export const LongEmail: Story = {
  args: { email: 'a-long-synthetic-family-email-address@example.test' },
};
export const Leaving: Story = { args: { leaving: true } };
