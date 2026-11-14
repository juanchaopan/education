import type { Meta, StoryObj } from '@storybook/react-vite';
import { DerivationBoard } from './DerivationBoard';
import { StoryStage } from './StoryStage';

const meta = { title: 'Learning/Lesson stage/Derivation board' } satisfies Meta;
export default meta;
type Story = StoryObj;

// The first step, on its own.
export const FirstStep: Story = {
  render: () => (
    <StoryStage>
      <DerivationBoard x={440} y={300} width={400} now={['每秒追回 2 − 1 = 1 格']} />
    </StoryStage>
  ),
};

// A step grown from the one before, which stays faded above it, with a
// short reading of it below.
export const GrownFromBefore: Story = {
  render: () => (
    <StoryStage>
      <DerivationBoard
        x={440}
        y={300}
        width={400}
        before="还差 = 10 − t"
        now={['距离 = |10 − t|']}
        note="|10 − 3| = 7　　|10 − 12| = 2"
      />
    </StoryStage>
  ),
};

// A step that splits into two cases, the second lit by a hint.
export const CasesWithOneLit: Story = {
  render: () => (
    <StoryStage>
      <DerivationBoard
        x={420}
        y={290}
        width={440}
        before="|10 − t| = 4"
        now={['蓝车在前：10 − t = 4', '黄车在前：10 − t = −4']}
        lit={1}
      />
    </StoryStage>
  ),
};
