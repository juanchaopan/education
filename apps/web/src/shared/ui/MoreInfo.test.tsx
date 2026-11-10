import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { MoreInfo } from './MoreInfo';

it('keeps the detail folded until its label is pressed', async () => {
  render(<MoreInfo label="邮件规则">链接 24 小时有效。</MoreInfo>);
  const detail = screen.getByText('链接 24 小时有效。');
  expect(detail).not.toBeVisible();
  await userEvent.click(screen.getByText('邮件规则'));
  expect(detail).toBeVisible();
});
