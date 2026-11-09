import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AiConsentView } from '@education/contracts';
import { MemoryRouter } from 'react-router-dom';
import { SettingsList } from './SettingsList';

const policy = {
  scope: 'openai-tutoring',
  policyVersion: 1,
  title: 'AI 解题提示',
  provider: 'OpenAI',
  inputs: '孩子提交的问题',
  purpose: '给出提示',
  appRetention: '不保存原文',
  providerRetention: '按供应商政策保留',
  revision: null,
  state: 'granted',
  availability: 'ready',
} as const;
const granted: AiConsentView = {
  reauthenticationRequired: false,
  tutoringBudget: 'available',
  policies: [policy],
};

const meta = {
  title: '家长空间/设置列表',
  component: SettingsList,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { consent: granted },
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Granted: Story = {};
export const NotGranted: Story = {
  args: { consent: { ...granted, policies: [{ ...policy, state: 'ungranted' }] } },
};
export const NotSwitchedOn: Story = {
  args: { consent: { ...granted, policies: [{ ...policy, availability: 'unavailable' }] } },
};
export const ConsentUnread: Story = { args: { consent: undefined } };
