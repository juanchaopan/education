import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FeedbackState } from '../data-access/useTeachingFeedback';
import { FeedbackRequestPanel } from './FeedbackRequestPanel';

const feedback = { status: 'correct', instruction: '你数对了！', stepId: 'count-left' } as const;

function setup(state: FeedbackState, canAsk = true) {
  const onAsk = vi.fn();
  const onGuide = vi.fn();
  render(<FeedbackRequestPanel state={state} canAsk={canAsk} onAsk={onAsk} onGuide={onGuide} />);
  return { onAsk, onGuide };
}

describe('FeedbackRequestPanel', () => {
  it('asks only when the child has something to send', async () => {
    const { onAsk } = setup({ status: 'idle' }, false);
    const ask = screen.getByRole('button', { name: '请 AI 老师看一看' });
    expect(ask).toBeDisabled();
    expect(onAsk).not.toHaveBeenCalled();
  });

  it('starts a request on demand', async () => {
    const { onAsk } = setup({ status: 'idle' });
    await userEvent.click(screen.getByRole('button', { name: '请 AI 老师看一看' }));
    expect(onAsk).toHaveBeenCalledOnce();
  });

  it('shows waiting with a way to continue without waiting, and does not allow a second ask', async () => {
    const { onGuide } = setup({ status: 'pending' });
    expect(screen.getByRole('status')).toHaveTextContent('AI 老师正在看你的作答');
    expect(screen.getByRole('button', { name: '请 AI 老师看一看' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '不等了，用提示继续' }));
    expect(onGuide).toHaveBeenCalledOnce();
  });

  it('keeps the work and offers another try after a fallback', () => {
    setup({ status: 'fallback', reason: 'usage-limited' });
    expect(screen.getByRole('status')).toHaveTextContent('你的作答还在');
    expect(screen.getByRole('button', { name: '请 AI 老师看一看' })).toBeEnabled();
  });

  it('confirms the switch to guidance', () => {
    setup({ status: 'guidance' });
    expect(screen.getByRole('status')).toHaveTextContent('用提示继续');
  });

  it('shows text feedback itself but leaves drawing feedback to the drawing board', () => {
    const { rerender } = render(
      <FeedbackRequestPanel
        state={{ status: 'ready', source: 'ai', feedback, drawing: [] }}
        canAsk
        onAsk={vi.fn()}
        onGuide={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('你数对了！');
    rerender(
      <FeedbackRequestPanel
        state={{ status: 'ready', source: 'ai', feedback, drawing: [[{ x: 0.5, y: 0.5 }]] }}
        canAsk
        onAsk={vi.fn()}
        onGuide={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('renders model text as plain text', () => {
    setup({
      status: 'ready',
      source: 'ai',
      feedback: { ...feedback, instruction: '<img src=x onerror=alert(1)>' },
      drawing: [],
    });
    expect(screen.getByRole('status')).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
  });
});
