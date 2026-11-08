import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { LessonStage } from './LessonStage';
import { storyLook } from './story-look';

const line = '我们先看看桌子上有什么。';

function stage(props: Partial<ComponentProps<typeof LessonStage>> = {}) {
  const callbacks = { onEnter: vi.fn(), onReplay: vi.fn(), onActivate: vi.fn() };
  render(
    <LessonStage
      look={storyLook}
      shot="first"
      caption={line}
      speaking={false}
      narrow={false}
      entryLabel="开始短片"
      {...callbacks}
      {...props}
    >
      <g data-part="ball" data-key="ball-0" role="button" tabIndex={0} aria-label="小球" />
      <g data-place="box" role="button" tabIndex={0} aria-label="盒子" />
    </LessonStage>,
  );
  return { ...callbacks, film: screen.getByRole('region', { name: storyLook.label }) };
}

it('opens on the title card, whose button starts the film', async () => {
  const { onEnter } = stage({ shot: 'opening', caption: undefined });
  expect(screen.getByRole('heading', { name: storyLook.title })).toBeVisible();
  expect(screen.getByText(`小小探索家 · ${storyLook.theater}`)).toBeVisible();
  expect(screen.queryByRole('button', { name: '重听这一句' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /开始短片/ }));
  expect(onEnter).toHaveBeenCalledOnce();
});

it('cannot be started before the film is ready', () => {
  stage({ shot: 'opening', caption: undefined, entryLabel: '正在准备声音…', onEnter: undefined });
  expect(screen.getByRole('button', { name: /正在准备声音/ })).toBeDisabled();
});

it('offers the line again in a small note while all is well', async () => {
  const { onReplay, film } = stage();
  expect(screen.getByRole('status')).toHaveTextContent(line);
  await userEvent.click(screen.getByRole('button', { name: '重听这一句' }));
  expect(onReplay).toHaveBeenCalledOnce();
  expect(film).not.toHaveAttribute('data-narration-failure');
});

it('offers the line again while it is being said', async () => {
  const { onReplay } = stage({ speaking: true });
  await userEvent.click(screen.getByRole('button', { name: '重听这一句' }));
  expect(onReplay).toHaveBeenCalledOnce();
});

it('keeps the caption and asks in words to hear a line that did not come out', async () => {
  const { onReplay, film } = stage({ failure: 'refused' });
  expect(screen.getByRole('status')).toHaveTextContent(line);
  await userEvent.click(screen.getByRole('button', { name: '再听一次' }));
  expect(onReplay).toHaveBeenCalledOnce();
  expect(film).toHaveAttribute('data-narration-failure', 'refused');
});

it('tells which prop or place the child tapped', async () => {
  const { onActivate } = stage();
  await userEvent.click(screen.getByRole('button', { name: '小球' }));
  expect(onActivate).toHaveBeenLastCalledWith({ part: 'ball', key: 'ball-0' });
  await userEvent.click(screen.getByRole('button', { name: '盒子' }));
  expect(onActivate).toHaveBeenLastCalledWith({ place: 'box' });
});

it('takes a prop or place reached by the keyboard with Enter or Space', async () => {
  const { onActivate } = stage();
  screen.getByRole('button', { name: '小球' }).focus();
  await userEvent.keyboard('{Enter}');
  expect(onActivate).toHaveBeenLastCalledWith({ part: 'ball', key: 'ball-0' });
  screen.getByRole('button', { name: '盒子' }).focus();
  await userEvent.keyboard(' ');
  expect(onActivate).toHaveBeenLastCalledWith({ place: 'box' });
  expect(onActivate).toHaveBeenCalledTimes(2);
});

it('says which scene is on screen', () => {
  const { film } = stage({ shot: 'closer' });
  expect(film).toHaveAttribute('data-shot', 'closer');
});
