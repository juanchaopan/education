import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PreviewMark } from './PreviewMark';

it('shows 预览 and tells a screen reader it is the preview mode', () => {
  const { container } = render(<PreviewMark />);
  expect(screen.getByText('预览', { exact: false })).toBeVisible();
  expect(container).toHaveTextContent('预览模式');
});
