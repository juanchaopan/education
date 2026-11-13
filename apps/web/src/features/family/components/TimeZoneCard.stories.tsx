import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimeZoneCard } from './TimeZoneCard';
import { zoneOptions } from './time-zone-names';

// 20:15 in China, 7:15 on the North American east coast.
const now = new Date('2026-11-12T12:15:00Z');
const zones = ['Asia/Shanghai', 'America/Toronto', 'America/New_York', 'Europe/London', 'UTC'];

const meta = {
  title: '家长空间/家庭时区',
  component: TimeZoneCard,
  args: {
    current: 'Asia/Shanghai',
    device: 'Asia/Shanghai',
    options: zoneOptions(zones, now),
    now,
    save: 'idle',
    onChoose: () => {},
    onSave: () => {},
    onRetry: () => {},
  },
} satisfies Meta<typeof TimeZoneCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Usual: Story = {};
export const DeviceElsewhere: Story = { args: { device: 'America/New_York' } };
export const Chosen: Story = { args: { choice: 'America/New_York' } };
export const Saving: Story = { args: { choice: 'America/New_York', save: 'saving' } };
export const Saved: Story = { args: { save: 'saved' } };
export const NotSaved: Story = { args: { choice: 'America/New_York', save: 'failed' } };
export const Loading: Story = { args: { current: undefined, loading: true } };
export const NotRead: Story = { args: { current: undefined, failed: true } };
