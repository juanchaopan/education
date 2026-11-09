import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LessonQuestionPanel } from './LessonQuestionPanel';

type Props = ComponentProps<typeof LessonQuestionPanel>;

const handlers = () => ({
  onPress: vi.fn(),
  onRelease: vi.fn(),
  onEdit: vi.fn(),
  onSend: vi.fn(),
  onDrop: vi.fn(),
  onStopWaiting: vi.fn(),
  onResume: vi.fn(),
});

function panel(on: ReturnType<typeof handlers>, extra: Partial<Props>) {
  return (
    <LessonQuestionPanel
      teacher="小兔"
      voice={{ status: 'idle' }}
      reply={{ status: 'idle' }}
      guidance="拿走几个苹果，看看秤什么时候能回到中间。"
      paused={false}
      blocked={false}
      sending={false}
      sendFailed={false}
      {...on}
      {...extra}
    />
  );
}

function show(extra: Partial<Props>) {
  const on = handlers();
  render(panel(on, extra));
  return on;
}

// The test browser has no pointer capture; holding the button needs it.
beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
});

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

it('is held to ask and let go of when done, and cannot be held while someone else speaks', () => {
  const on = show({});
  const button = screen.getByRole('button', { name: '有问题？按住问小兔' });
  fireEvent.pointerDown(button, { pointerId: 1, isPrimary: true, button: 0 });
  expect(on.onPress).toHaveBeenCalledOnce();
  fireEvent.pointerUp(button, { pointerId: 1 });
  expect(on.onRelease).toHaveBeenCalledOnce();
  show({ blocked: true });
  expect(screen.getAllByRole('button', { name: '有问题？按住问小兔' })[1]).toBeDisabled();
});

it('ends a hold the button stops hearing when it is disabled under the finger', () => {
  const on = handlers();
  const view = render(panel(on, { voice: { status: 'recording' } }));
  const button = screen.getByRole('button', { name: '有问题？按住问小兔' });
  fireEvent.pointerDown(button, { pointerId: 1, isPrimary: true, button: 0 });
  view.rerender(panel(on, { voice: { status: 'transcribing' } }));
  expect(on.onRelease).toHaveBeenCalledOnce();
});

it('asks to hold longer when the child let go too soon', () => {
  show({ voice: { status: 'unavailable', reason: 'short' } });
  expect(screen.getByRole('status')).toHaveTextContent('按住按钮，看到「正在听」再说话');
});

it('lets the child correct what was heard, then send it, say it again or drop it', async () => {
  const on = show({ voice: { status: 'review', text: '为什么苹果这边底' } });
  expect(screen.getByRole('status')).toHaveTextContent('改好了点「发给小兔」');
  fireEvent.change(screen.getByLabelText('听到的话'), { target: { value: '为什么苹果这边低' } });
  expect(on.onEdit).toHaveBeenCalledExactlyOnceWith('为什么苹果这边低');
  await userEvent.click(screen.getByRole('button', { name: '发给小兔' }));
  expect(on.onSend).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: '按住，再说一次' })).toBeEnabled();
  await userEvent.click(screen.getByRole('button', { name: '不问了' }));
  expect(on.onDrop).toHaveBeenCalledOnce();
});

it('keeps the question to send again when it could not go out', () => {
  show({ voice: { status: 'review', text: '要数几组？' }, sendFailed: true });
  expect(screen.getByRole('status')).toHaveTextContent('暂时连不上，还没发出去');
  expect(screen.getByLabelText('听到的话')).toHaveValue('要数几组？');
});

it('lets the child stop waiting and carry the narration on', async () => {
  const waiting = show({ voice: { status: 'transcribing' } });
  expect(screen.getByRole('region', { name: '问问小兔' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '不等了' }));
  expect(waiting.onStopWaiting).toHaveBeenCalledOnce();
  const paused = show({ paused: true });
  await userEvent.click(screen.getByRole('button', { name: '接着听小兔讲' }));
  expect(paused.onResume).toHaveBeenCalledOnce();
});
