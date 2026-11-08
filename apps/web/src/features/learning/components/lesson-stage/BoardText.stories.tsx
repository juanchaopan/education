import type { Meta, StoryObj } from '@storybook/react-vite';
import { BoardText } from './BoardText';
import { StoryStage } from './StoryStage';

const meta = { title: 'Learning/Lesson stage/Board text' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const OnABoard: Story = {
  render: () => (
    <StoryStage>
      <rect x="470" y="300" width="340" height="96" rx="18" fill="#f3e8d6" stroke="#8a5f3c" />
      <BoardText x={640} y={340} size={24}>
        每组三个，一共三组
      </BoardText>
      <BoardText x={640} y={376} size={20}>
        3 × 3 = 9
      </BoardText>
    </StoryStage>
  ),
};

export const Label: Story = {
  render: () => (
    <StoryStage>
      <rect x="560" y="360" width="160" height="40" rx="12" fill="#f3e8d6" stroke="#8a5f3c" />
      <BoardText x={640} y={387} size={20}>
        小球
      </BoardText>
    </StoryStage>
  ),
};
