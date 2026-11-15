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
// The variation, another problem: only the conclusion it keeps, its 假如
// condition and, revealed and in use, what that came to, tagged 那么 over
// its glow.
export const Variation: Story = { args: { facts: storyBoards.varied } };
// Too many to draw one by one: 「k×」 before one frame, and before one ball.
export const ManyThings: Story = { args: { facts: storyBoards.many } };
// Too narrow for one line, the board wraps onto a second. The variation's 那么
// stays right after its 假如 when the two fit side by side and goes under it,
// within the board, when they do not.
export const Wrapping: Story = {
  args: { facts: storyBoards.varied },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
