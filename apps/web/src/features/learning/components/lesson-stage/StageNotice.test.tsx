import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { NoticeButton, StageNotice } from './StageNotice';

it('names the notice and says its sentence', () => {
  render(<StageNotice icon="check" label="学习草稿" text="已保存" />);
  expect(screen.getByRole('complementary', { name: '学习草稿' })).toHaveTextContent('已保存');
  expect(screen.getByRole('status')).toHaveTextContent('已保存');
});

it('acts on the notice with its buttons', async () => {
  const save = vi.fn();
  render(
    <StageNotice icon="wifiOff" label="学习草稿" text="还没同步。">
      <NoticeButton onClick={save}>保存这份草稿</NoticeButton>
      <NoticeButton quiet>放弃这份草稿</NoticeButton>
    </StageNotice>,
  );
  await userEvent.click(screen.getByRole('button', { name: '保存这份草稿' }));
  expect(save).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: '放弃这份草稿' })).toHaveAttribute('type', 'button');
});
