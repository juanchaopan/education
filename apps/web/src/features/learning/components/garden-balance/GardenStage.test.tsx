import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { arrive } from '../../lessons/garden-balance/garden-story';
import { lines } from '../../lessons/garden-balance/script';
import { GardenStage } from './GardenStage';

function stage(failure?: string) {
  const onReplay = vi.fn();
  render(
    <GardenStage
      state={{ ...arrive('apples').state, apples: 3 }}
      handling={{}}
      caption={lines.balanced.text}
      speaking={false}
      failure={failure}
      narrow={false}
      entryLabel="开始短片"
      onReplay={onReplay}
      onActivate={() => {}}
    />,
  );
  return { onReplay, film: screen.getByRole('region', { name: '菜园天平互动短片' }) };
}

it('offers the line again in a small note while all is well', () => {
  const { film } = stage();
  expect(screen.getByRole('button', { name: '重听这一句' })).toBeVisible();
  expect(film).not.toHaveAttribute('data-narration-failure');
});

it('keeps the caption and asks in words to hear a line that did not come out', async () => {
  const { onReplay, film } = stage('refused');
  expect(screen.getByRole('status')).toHaveTextContent(lines.balanced.text);
  await userEvent.click(screen.getByRole('button', { name: '再听一次' }));
  expect(onReplay).toHaveBeenCalledOnce();
  expect(film).toHaveAttribute('data-narration-failure', 'refused');
});
