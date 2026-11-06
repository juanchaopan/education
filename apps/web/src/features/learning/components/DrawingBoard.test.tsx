import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DrawingBoard } from './DrawingBoard';

vi.mock('../drawing/bind-ink', () => ({ bindInk: vi.fn() }));

const drawing = [[{ x: 0.5, y: 0.5 }], [{ x: 0.75, y: 0.75 }]];
const result = {
  stepId: 'draw',
  status: 'needs-work',
  instruction: '看看这一笔从哪里开始。',
  highlight: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
} as const;

describe('DrawingBoard', () => {
  it('offers undo and clear through keyboard-accessible controls', async () => {
    const onDrawingChange = vi.fn();
    const props = { stepId: 'draw', label: '画板', onDrawingChange };
    const { rerender } = render(<DrawingBoard {...props} drawing={drawing} />);
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onDrawingChange).toHaveBeenLastCalledWith(drawing.slice(0, 1));
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onDrawingChange).toHaveBeenLastCalledWith([]);
    rerender(<DrawingBoard {...props} drawing={[]} />);
    expect(screen.getByRole('button', { name: '撤销一笔' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '清空画板' })).toBeDisabled();
  });

  it('describes the dashed region and hides stale feedback after the child edits', () => {
    const props = { stepId: 'draw', label: '画板', onDrawingChange: vi.fn() };
    const feedback = { drawing, result };
    const { rerender } = render(<DrawingBoard {...props} drawing={drawing} feedback={feedback} />);
    expect(screen.getByRole('status')).toHaveTextContent('看看虚线框里的地方。');
    expect(screen.getByRole('img', { name: '画板' })).toHaveAccessibleDescription(
      expect.stringContaining(result.instruction),
    );
    rerender(<DrawingBoard {...props} drawing={drawing.slice(0, 1)} feedback={feedback} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
