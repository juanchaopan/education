import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { consentPolicy, consentView } from '../../../test/consent-policy';
import { SettingsList } from './SettingsList';

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
  args: { consent: consentView(consentPolicy()) },
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Granted: Story = {};
export const NotGranted: Story = {
  args: { consent: consentView(consentPolicy({ state: 'ungranted' })) },
};
export const NotSwitchedOn: Story = {
  args: { consent: consentView(consentPolicy({ availability: 'unavailable' })) },
};
export const ConsentUnread: Story = { args: { consent: undefined } };
