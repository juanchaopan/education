import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { QuestionBox } from './QuestionBox';
import { StoryPainting } from './StoryPainting';

// The words follow the child's corrections, as the page's do.
function Preview(props: ComponentProps<typeof QuestionBox>) {
  const [text, setText] = useState(props.text);
  return <QuestionBox {...props} text={text} onEdit={setText} />;
}

const meta = {
  title: 'Learning/Question box',
  component: QuestionBox,
  render: (props) => <Preview key={props.phase} {...props} />,
  decorators: [
    (Story) => (
      <StoryPainting>
        <div style={{ inlineSize: '100%' }}>
          <Story />
        </div>
      </StoryPainting>
    ),
  ],
  args: {
    phase: 'review',
    text: '为什么苹果那边沉下去了？空盘子是不是很轻呀',
    teacher: '小兔',
    onEdit: () => {},
    onSend: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof QuestionBox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Listening: Story = { args: { phase: 'listening', text: '' } };
export const Hearing: Story = { args: { phase: 'hearing', text: '' } };
export const Review: Story = {};
export const Sending: Story = { args: { sending: true } };
export const SendFailed: Story = { args: { sendFailed: true } };
export const Asked: Story = { args: { phase: 'asked' } };
export const LongQuestion: Story = {
  args: {
    text: '为什么苹果那边沉下去了？空盘子是不是很轻呀？如果我把青菜也放上去，天平会不会又变平了？黄瓜要放几根才够？',
  },
};
