import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnswerCapsule } from './AnswerCapsule';
import { AskMicrophone } from './AskMicrophone';
import { FireflyHint } from './FireflyHint';
import { LessonStage, StagePlace } from './LessonStage';
import { QuestionBox } from './QuestionBox';
import { StageTools } from './StageTools';
import { StoryFrame, type FrameShape } from './StoryFrame';
import { storyLook } from './story-look';
import { Subtitle } from './Subtitle';

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

const nothing = () => {};

const tools = (
  <StagePlace at="tools">
    <StageTools
      speaking={false}
      again={false}
      captions
      sound
      onReplay={nothing}
      onCaptions={nothing}
      onSound={nothing}
    />
  </StagePlace>
);

const saying = (text: string) => (
  <StagePlace at="subtitle">
    <Subtitle teacher={storyLook.teacher} text={text} />
  </StagePlace>
);

const microphone = (
  <StagePlace at="microphone">
    <AskMicrophone label="按住问小猫头鹰" holding={false} onPress={nothing} onRelease={nothing} />
  </StagePlace>
);

// A scene as the child sees it: the tools, the teacher's line and the
// microphone held to ask.
const watching = (
  <>
    {tools}
    {saying('我们先看看桌子上有什么。')}
    {microphone}
  </>
);

// The answer scene: the count heard, to agree with or say again, and the
// hints beside it.
const answering = (
  <>
    {tools}
    {saying('我听到你说「两个」，是 2 吗？')}
    <StagePlace at="answer">
      <AnswerCapsule
        question="桌子上一共有几个球？"
        step={{ kind: 'confirm', heard: '两个', count: 2 }}
        unit="个"
        choices={[1, 2, 3]}
        blocked={false}
        onListen={nothing}
        onFinish={nothing}
        onStopWaiting={nothing}
        onConfirm={nothing}
        onChoose={nothing}
        onRetry={nothing}
        onContinue={nothing}
      />
    </StagePlace>
    <StagePlace at="hint">
      <FireflyHint left={2} ready onHint={nothing} />
    </StagePlace>
    {microphone}
  </>
);

// A question heard and read over before it is sent.
const asking = (
  <>
    {tools}
    {saying('我们先看看桌子上有什么。')}
    <StagePlace at="question">
      <QuestionBox
        phase="review"
        text="为什么黄色的球在左边？"
        teacher="小猫头鹰"
        onEdit={nothing}
        onSend={nothing}
        onClose={nothing}
      />
    </StagePlace>
    {microphone}
  </>
);

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
    speaking: false,
    entryLabel: '开始短片',
    controls: watching,
    children: <Table />,
    onEnter: nothing,
    onActivate: nothing,
  },
} satisfies Meta<typeof LessonStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TitleCard: Story = { args: { shot: 'opening' } };
export const NotReadyToStart: Story = {
  args: { shot: 'opening', entryLabel: '正在准备声音…', onEnter: undefined },
};
export const Playing: Story = {};
export const Speaking: Story = { args: { speaking: true } };
export const CloserFraming: Story = { args: { shot: 'closer' } };
export const Answering: Story = { args: { controls: answering } };
export const Asking: Story = { args: { controls: asking } };
// An upright frame is filled by the painting, the props span its width and
// the controls stack along its top and bottom.
export const NarrowFrame: Story = { parameters: { frame: 'upright' } };
export const PhoneFrame: Story = { parameters: { frame: 'phone' } };
export const AnsweringOnAPhone: Story = {
  args: { controls: answering },
  parameters: { frame: 'phone' },
};
export const AskingOnAPhone: Story = { args: { controls: asking }, parameters: { frame: 'phone' } };
// A keyboard over the bottom of a phone moves the question box up under the
// subtitle.
export const TypingOnAPhone: Story = {
  args: { controls: asking, keyboard: 300 },
  parameters: { frame: 'phone' },
};
