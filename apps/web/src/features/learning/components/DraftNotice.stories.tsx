import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { DraftNotice } from './DraftNotice';
import { onStoryPainting } from './lesson-stage/on-story-painting';

// The notice as a page would keep it: a choice settles the draft, and a
// moment stays on screen until it is acted on, where the page lets it fade.
function Preview(props: ComponentProps<typeof DraftNotice>) {
  const [status, setStatus] = useState(props.status);
  const [moment, setMoment] = useState(props.moment);
  const settle = () => {
    setStatus('saved');
    setMoment('saved');
  };
  return (
    <DraftNotice
      {...props}
      status={status}
      moment={moment}
      onSave={settle}
      onReload={() => setStatus('saved')}
      onDiscard={() => setStatus('clean')}
      onChoose={(choice) => (choice === 'keep' ? setStatus('unsynced') : settle())}
      onRestart={() => setMoment(undefined)}
    />
  );
}

const meta = {
  title: 'Learning/Draft notice',
  component: DraftNotice,
  render: (props) => <Preview key={`${props.status}-${props.moment}`} {...props} />,
  decorators: [onStoryPainting],
  args: {
    hasDraft: true,
    hasRemote: true,
    onSave: () => {},
    onReload: () => {},
    onDiscard: () => {},
    onChoose: () => {},
    onRestart: () => {},
  },
} satisfies Meta<typeof DraftNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unsynced: Story = { args: { status: 'unsynced' } };
export const Conflict: Story = { args: { status: 'conflict' } };
export const Expired: Story = { args: { status: 'conflict', hasRemote: false } };
export const LoadFailed: Story = { args: { status: 'load-failed' } };
export const Resumed: Story = { args: { status: 'saved', moment: 'resumed' } };
export const JustSaved: Story = { args: { status: 'saved', moment: 'saved' } };
