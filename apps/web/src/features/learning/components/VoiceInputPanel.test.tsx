import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { VoiceState } from '../data-access/useVoiceInput';
import { VoiceInputPanel } from './VoiceInputPanel';

function show(state: VoiceState) {
  const handlers = {
    onStart: vi.fn(),
    onStop: vi.fn(),
    onCancel: vi.fn(),
    onGuide: vi.fn(),
    onEdit: vi.fn(),
    onConfirm: vi.fn(),
    onDiscard: vi.fn(),
  };
  render(<VoiceInputPanel state={state} {...handlers} />);
  return handlers;
}

it('starts a recording only when the child asks', () => {
  const { onStart } = show({ status: 'idle' });
  expect(screen.getByRole('status')).toHaveTextContent('');
  fireEvent.click(screen.getByRole('button', { name: '按一下，开始说' }));
  expect(onStart).toHaveBeenCalledOnce();
});

it('shows that it is recording and offers to finish or drop it', () => {
  const { onStop, onCancel } = show({ status: 'recording' });
  expect(screen.getByRole('status')).toHaveTextContent('正在录音');
  expect(screen.getByRole('status')).toHaveTextContent('最长 30 秒');
  fireEvent.click(screen.getByRole('button', { name: '说完了' }));
  fireEvent.click(screen.getByRole('button', { name: '不录了' }));
  expect(onStop).toHaveBeenCalledOnce();
  expect(onCancel).toHaveBeenCalledOnce();
});

it('lets the child stop waiting for recognition and type instead', () => {
  const { onGuide } = show({ status: 'transcribing' });
  fireEvent.click(screen.getByRole('button', { name: '不等了，直接打字' }));
  expect(onGuide).toHaveBeenCalledOnce();
});

it('shows what was heard as editable plain text and confirms it only on request', () => {
  const heard = '<b>每分</b>是四';
  const { onEdit, onConfirm, onStart, onDiscard } = show({ status: 'review', text: heard });
  const field = screen.getByRole('textbox', { name: '听到的话' });
  expect(field).toHaveValue(heard);
  expect(document.querySelector('b')).toBeNull();
  fireEvent.change(field, { target: { value: '每份是四' } });
  expect(onEdit).toHaveBeenCalledWith('每份是四');
  fireEvent.click(screen.getByRole('button', { name: '用这句话' }));
  fireEvent.click(screen.getByRole('button', { name: '重新录' }));
  fireEvent.click(screen.getByRole('button', { name: '不用了' }));
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onStart).toHaveBeenCalledOnce();
  expect(onDiscard).toHaveBeenCalledOnce();
});

it('does not offer to use an emptied text', () => {
  show({ status: 'review', text: '  ' });
  expect(screen.getByRole('button', { name: '用这句话' })).toBeDisabled();
});

it.each([
  [{ status: 'unheard' }, '没有听清'],
  [{ status: 'unavailable', reason: 'denied' }, '没有拿到麦克风权限'],
  [{ status: 'fallback', reason: 'unauthorized' }, '需要家长先同意语音转写'],
  [{ status: 'fallback', reason: 'timeout' }, '识别有点慢'],
  [{ status: 'guidance' }, '先不等了'],
] as const)('explains %j, keeps typing open and offers another try', (state, text) => {
  const { onStart } = show(state);
  expect(screen.getByRole('status')).toHaveTextContent(text);
  expect(screen.getByRole('status')).toHaveTextContent('打字');
  fireEvent.click(screen.getByRole('button', { name: '再录一次' }));
  expect(onStart).toHaveBeenCalledOnce();
});

it('does not offer to retry on a device that cannot record', () => {
  show({ status: 'unavailable', reason: 'unsupported' });
  expect(screen.getByRole('status')).toHaveTextContent('这台设备现在不能录音');
  expect(screen.queryByRole('button')).toBeNull();
});
