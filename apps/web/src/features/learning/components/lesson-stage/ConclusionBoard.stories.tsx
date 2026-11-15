import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConclusionBoard } from './ConclusionBoard';
import { onStoryPainting } from './on-story-painting';
import { storyBoards } from './story-board';

const meta = {
  title: 'Learning/Lesson stage/Conclusion board',
  component: ConclusionBoard,
  decorators: [onStoryPainting],
  args: { facts: storyBoards.one },
} satisfies Meta<typeof ConclusionBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OneFound: Story = {};
// The scene uses the newest conclusion, which glows gold; its balls sit in
// the frames the scene gathered them in.
export const InUse: Story = { args: { facts: storyBoards.inUse } };
// Once the count is answered right, it is written onto the conclusion it
// comes from.
export const WithTheAnswer: Story = { args: { facts: storyBoards.answered } };
// A changed condition sits beside the one it changes.
export const Supposed: Story = { args: { facts: storyBoards.supposed } };
// Too many to draw one by one: 「k×」 before one frame, and before one ball.
export const ManyThings: Story = { args: { facts: storyBoards.many } };
// Too narrow for one line, the board wraps onto a second.
export const Wrapping: Story = {
  args: { facts: storyBoards.supposed },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};
