import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { DraftNotice } from './DraftNotice';
import { onStoryPainting } from './lesson-stage/on-story-painting';

function Preview(props: ComponentProps<typeof DraftNotice>) {
  const [status, setStatus] = useState(props.status);
  return (
    <DraftNotice
      {...props}
      status={status}
      onSave={() => setStatus('saved')}
      onDiscard={() => setStatus('clean')}
      onReload={() => setStatus('saved')}
      onChoose={(choice) => setStatus(choice === 'keep' ? 'unsynced' : 'saved')}
    />
  );
}

const meta = {
  title: 'Learning/Draft notice',
  component: DraftNotice,
  render: (props) => <Preview key={props.status} {...props} />,
  decorators: [onStoryPainting],
  args: {
    hasDraft: true,
    hasRemote: true,
    onSave: () => {},
    onReload: () => {},
    onDiscard: () => {},
    onChoose: () => {},
  },
} satisfies Meta<typeof DraftNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unsynced: Story = { args: { status: 'unsynced' } };
export const Conflict: Story = { args: { status: 'conflict' } };
export const Expired: Story = { args: { status: 'conflict', hasRemote: false } };
export const Saved: Story = { args: { status: 'saved' } };
