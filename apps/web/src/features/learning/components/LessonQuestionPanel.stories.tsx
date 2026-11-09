import type { Meta, StoryObj } from '@storybook/react-vite';
import { LessonQuestionPanel } from './LessonQuestionPanel';

const meta = {
  title: 'Learning/Lesson question',
  component: LessonQuestionPanel,
  args: {
    teacher: '小兔',
    voice: { status: 'idle' },
    reply: { status: 'idle' },
    guidance: '拿走几个苹果，看看秤什么时候能回到中间。',
    paused: false,
    blocked: false,
    sending: false,
    sendFailed: false,
    onPress: () => {},
    onRelease: () => {},
    onEdit: () => {},
    onSend: () => {},
    onDrop: () => {},
    onStopWaiting: () => {},
    onResume: () => {},
  },
} satisfies Meta<typeof LessonQuestionPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Asking: Story = { args: { voice: { status: 'recording' }, paused: true } };
export const TooShort: Story = {
  args: { voice: { status: 'unavailable', reason: 'short' }, paused: true },
};
export const ReadOver: Story = {
  args: { voice: { status: 'review', text: '为什么苹果这边低？' }, paused: true },
};
export const NotSent: Story = {
  args: { voice: { status: 'review', text: '要数几组？' }, sendFailed: true },
};
export const SomeoneElseSpeaking: Story = { args: { blocked: true } };
export const Replied: Story = {
  args: {
    paused: true,
    reply: {
      status: 'ready',
      source: 'ai',
      drawing: [],
      feedback: {
        status: 'needs-work',
        stepId: 'apples',
        instruction: '苹果多了，所以苹果这边低。',
      },
    },
  },
};
export const TeacherResting: Story = {
  args: { reply: { status: 'fallback', reason: 'missing-key' } },
};
