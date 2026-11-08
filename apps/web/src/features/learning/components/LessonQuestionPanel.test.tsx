import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { LessonQuestionPanel } from './LessonQuestionPanel';

type Props = ComponentProps<typeof LessonQuestionPanel>;

function show(extra: Partial<Props>) {
  const on = {
    onAsk: vi.fn(),
    onStop: vi.fn(),
    onCancel: vi.fn(),
    onStopWaiting: vi.fn(),
    onResume: vi.fn(),
  };
  render(
    <LessonQuestionPanel
      teacher="小兔"
      voice={{ status: 'idle' }}
      reply={{ status: 'idle' }}
      guidance="拿走几个苹果，看看秤什么时候能回到中间。"
      paused={false}
      {...on}
      {...extra}
    />,
  );
  return on;
}

it('shows the teacher’s reply to the latest question, whichever scene it was asked in', () => {
  show({
    reply: {
      status: 'ready',
      source: 'ai',
      drawing: [],
      feedback: { status: 'needs-work', stepId: 'apples', instruction: '看看哪边低一些。' },
    },
  });
  expect(screen.getByRole('status')).toHaveTextContent('看看哪边低一些。');
});

it('falls back to the scene’s own guidance when the teacher cannot answer', () => {
  show({ reply: { status: 'fallback', reason: 'missing-key' } });
  expect(screen.getByRole('status')).toHaveTextContent('拿走几个苹果，看看秤什么时候能回到中间。');
});

it('sends the child back to the scene when the microphone cannot be used', () => {
  show({ voice: { status: 'unavailable', reason: 'denied' } });
  expect(screen.getByRole('status')).toHaveTextContent(
    '没有拿到麦克风权限。我们接着做题吧。也可以请家长在浏览器里允许使用麦克风。',
  );
});

it('names the lesson’s teacher, lets the child finish asking and carry the narration on', async () => {
  const recording = show({ voice: { status: 'recording' } });
  expect(screen.getByRole('region', { name: '问问小兔' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '说完了' }));
  expect(recording.onStop).toHaveBeenCalledOnce();
  const paused = show({ paused: true });
  await userEvent.click(screen.getByRole('button', { name: '接着听小兔讲' }));
  expect(paused.onResume).toHaveBeenCalledOnce();
});
