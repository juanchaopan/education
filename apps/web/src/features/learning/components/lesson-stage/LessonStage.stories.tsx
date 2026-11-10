import type { Meta, StoryObj } from '@storybook/react-vite';
import { LessonStage } from './LessonStage';
import { StoryFrame, type FrameShape } from './StoryFrame';
import { storyLook } from './story-look';

// A plain table in the backdrop's clearing stands in for a lesson's scene.
function Table() {
  return (
    <g>
      <ellipse cx="640" cy="500" rx="260" ry="26" fill="#0d1820" opacity=".3" />
      <rect x="400" y="400" width="480" height="90" rx="22" fill="#9a6a45" stroke="#5e3b24" />
      <circle cx="560" cy="370" r="34" fill="#e5b950" stroke="#8a5f3c" strokeWidth="3" />
      <circle cx="720" cy="370" r="34" fill="#dd9276" stroke="#8a5f3c" strokeWidth="3" />
    </g>
  );
}

const caption = '我们先看看桌子上有什么。';

const meta = {
  title: 'Learning/Lesson stage',
  component: LessonStage,
  decorators: [
    (Story, { parameters }) => (
      <StoryFrame shape={(parameters.frame as FrameShape | undefined) ?? 'wide'}>
        <Story />
      </StoryFrame>
    ),
  ],
  args: {
    look: storyLook,
    shot: 'first',
    caption,
    speaking: false,
    entryLabel: '开始短片',
    children: <Table />,
    onEnter: () => {},
    onReplay: () => {},
    onActivate: () => {},
  },
} satisfies Meta<typeof LessonStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TitleCard: Story = { args: { shot: 'opening', caption: undefined } };
export const NotReadyToStart: Story = {
  args: { shot: 'opening', caption: undefined, entryLabel: '正在准备声音…', onEnter: undefined },
};
export const Playing: Story = {};
export const Speaking: Story = { args: { speaking: true } };
export const CloserFraming: Story = { args: { shot: 'closer' } };
export const LineDidNotPlay: Story = { args: { failure: 'refused' } };
// An upright frame is filled by the painting, and the props span its width.
export const NarrowFrame: Story = { parameters: { frame: 'upright' } };
export const PhoneFrame: Story = { parameters: { frame: 'phone' } };
export const LongCaption: Story = {
  args: {
    caption: '桌子上有两个圆圆的东西，一个是黄色的，一个是红色的，我们一起数一数它们一共有几个吧。',
  },
};
