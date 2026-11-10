import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { LessonStage, StagePlace } from './LessonStage';
import { storyLook } from './story-look';

function stage(props: Partial<ComponentProps<typeof LessonStage>> = {}) {
  const callbacks = { onEnter: vi.fn(), onActivate: vi.fn() };
  render(
    <LessonStage
      look={storyLook}
      shot="first"
      speaking={false}
      entryLabel="开始短片"
      controls={
        <StagePlace at="tools">
          <button type="button">重听这一句</button>
        </StagePlace>
      }
      {...callbacks}
      {...props}
    >
      <g data-part="ball" data-key="ball-0" role="button" tabIndex={0} aria-label="小球" />
      <g data-place="box" role="button" tabIndex={0} aria-label="盒子" />
    </LessonStage>,
  );
  return { ...callbacks, film: screen.getByRole('region', { name: storyLook.label }) };
}

it('opens on the title card, whose button starts the film, with no controls yet', async () => {
  const { onEnter } = stage({ shot: 'opening' });
  expect(screen.getByRole('heading', { name: storyLook.title })).toBeVisible();
  expect(screen.getByText(`小小探索家 · ${storyLook.theater}`)).toBeVisible();
  expect(screen.queryByRole('button', { name: '重听这一句' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /开始短片/ }));
  expect(onEnter).toHaveBeenCalledOnce();
});

it('cannot be started before the film is ready', () => {
  stage({ shot: 'opening', entryLabel: '正在准备声音…', onEnter: undefined });
  expect(screen.getByRole('button', { name: /正在准备声音/ })).toBeDisabled();
});

it('lays the controls into the picture once the film has started', () => {
  const { film } = stage();
  expect(film).toContainElement(screen.getByRole('button', { name: '重听这一句' }));
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});

it('marks a line that did not come out on the film', () => {
  const { film } = stage({ failure: 'refused' });
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
