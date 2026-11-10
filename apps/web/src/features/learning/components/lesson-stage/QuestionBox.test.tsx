import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionBox, type QuestionPhase } from './QuestionBox';

function box(phase: QuestionPhase, overrides: Partial<Parameters<typeof QuestionBox>[0]> = {}) {
  const on = { onEdit: vi.fn(), onSend: vi.fn(), onClose: vi.fn() };
  render(
    <QuestionBox phase={phase} text="苹果为什么沉下去" teacher="小兔" {...on} {...overrides} />,
  );
  return on;
}

describe('while the child holds the microphone', () => {
  it('shows it is listening, with nothing to send or drop yet', () => {
    box('listening', { text: '' });
    expect(screen.getByRole('status')).toHaveTextContent('我在听');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('once the child lets go', () => {
  it('waits for the words, and can stop waiting', async () => {
    const on = box('hearing', { text: '' });
    await userEvent.click(screen.getByRole('button', { name: '不等了' }));
    expect(on.onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: '发给小兔' })).toBeNull();
  });

  it('lets the child correct the words, then send them or drop them', async () => {
    const on = box('review');
    fireEvent.change(screen.getByRole('textbox', { name: '听到的话' }), {
      target: { value: '苹果为什么沉下去了' },
    });
    expect(on.onEdit).toHaveBeenCalledWith('苹果为什么沉下去了');
    await userEvent.click(screen.getByRole('button', { name: '发给小兔' }));
    await userEvent.click(screen.getByRole('button', { name: '不问了' }));
    expect(on.onSend).toHaveBeenCalledOnce();
    expect(on.onClose).toHaveBeenCalledOnce();
  });

  it('sends nothing empty, and nothing twice', () => {
    box('review', { text: '  ' });
    expect(screen.getByRole('button', { name: '发给小兔' })).toBeDisabled();
  });

  it('holds the drops while the question goes out', () => {
    box('review', { sending: true });
    expect(screen.getByRole('button', { name: '发给小兔' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '不问了' })).toBeDisabled();
  });

  it('says a question that did not go out can be sent again', () => {
    box('review', { sendFailed: true });
    expect(screen.getByRole('button', { name: '还没发出去，再发给小兔' })).toBeEnabled();
  });
});

describe('once the question is sent', () => {
  it('keeps it to read while the reply comes, and can stop waiting', async () => {
    const on = box('asked');
    expect(screen.getByRole('textbox', { name: '听到的话' })).toHaveAttribute('readonly');
    await userEvent.click(screen.getByRole('button', { name: '不等了' }));
    expect(on.onClose).toHaveBeenCalledOnce();
  });
});
