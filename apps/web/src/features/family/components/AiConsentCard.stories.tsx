import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AiConsentCard } from './AiConsentCard';

const policy = {
  scope: 'openai-tutoring' as const,
  policyVersion: 20261106,
  title: 'AI 解题提示',
  provider: 'OpenAI Responses API',
  inputs: '当前题目的文字问题和相关笔迹。',
  purpose: '提供一步解题提示。',
  appRetention: '练习草稿可能包含笔迹，最后编辑后 7 天过期。',
  providerRetention: '供应商默认的安全监测日志可能保留内容最多 30 天。',
  revision: null,
};
// A deployment without a backend key: paid AI is switched on, nothing is sent.
const awaitingPassword = {
  reauthenticationRequired: true,
  tutoringBudget: 'unset',
  policies: [{ ...policy, state: 'ungranted', availability: 'unavailable' }],
} as const;
const meta = {
  component: AiConsentCard,
  args: {
    loading: false,
    pending: false,
    password: '',
    onPassword: fn(),
    onConfirm: fn(),
    onChange: fn(),
    onRefresh: fn(),
    view: { ...awaitingPassword, policies: [...awaitingPassword.policies] },
  },
} satisfies Meta<typeof AiConsentCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmPassword: Story = {};
export const PolicyChanged: Story = {
  args: {
    view: {
      reauthenticationRequired: false,
      tutoringBudget: 'available',
      policies: [{ ...policy, state: 'policy-changed', availability: 'ready' }],
    },
  },
};
export const BudgetLimited: Story = {
  args: {
    view: {
      reauthenticationRequired: false,
      tutoringBudget: 'limited',
      policies: [{ ...policy, state: 'granted', availability: 'ready' }],
    },
  },
};
