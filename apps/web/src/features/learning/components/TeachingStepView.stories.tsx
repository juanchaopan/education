import type { Meta, StoryObj } from '@storybook/react-vite';
import { TeachingStepView } from './TeachingStepView';

const meta = {
  title: '学习界面/逐步教学',
  component: TeachingStepView,
  args: {
    progress: '第 1 步，共 2 步',
    instruction: '看看图形的边。',
    answer: '',
    onAnswer: () => {},
    helpCount: 0,
    nextHint: 'hint',
    onHint: () => {},
    onRepeat: () => {},
    onRetry: () => {},
    checking: false,
    onCheck: () => {},
    onConfirm: () => {},
    nextLabel: '下一步',
    onNext: () => {},
  },
} satisfies Meta<typeof TeachingStepView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {};
export const WithHint: Story = {
  args: {
    shownHint: { kind: 'hint', instruction: '用手指沿着一条边慢慢移动。' },
    nextHint: 'example',
  },
};
export const ConfirmInput: Story = {
  args: {
    answer: '我看到一条边',
    notice: '请确认这就是你想表达的内容。',
    checking: true,
  },
};
