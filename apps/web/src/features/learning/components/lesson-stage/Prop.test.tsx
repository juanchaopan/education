import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { LessonStage } from './LessonStage';
import { DragGhost, Prop, PropPlace } from './Prop';
import { storyLook } from './story-look';

function stage() {
  const onActivate = vi.fn();
  render(
    <LessonStage
      look={storyLook}
      shot="first"
      speaking={false}
      entryLabel="开始短片"
      onReplay={() => {}}
      onActivate={onActivate}
      ghost={
        <DragGhost x={300} y={200}>
          <circle r="20" data-testid="ghost" />
        </DragGhost>
      }
    >
      <Prop x={100} y={100} size={40}>
        <circle r="20" data-testid="resting" />
      </Prop>
      <Prop x={200} y={100} size={40} part="ball" id="ball-1" label="小球" highlight>
        <circle r="20" />
      </Prop>
      <PropPlace
        place="crate"
        label="木箱"
        x={400}
        y={300}
        highlight
        over={false}
        halo={{ rx: 40, ry: 20 }}
      >
        <rect x="-30" y="-20" width="60" height="40" />
      </PropPlace>
    </LessonStage>,
  );
  return onActivate;
}

it('makes a prop with a kind a button the keyboard reaches, and leaves the others alone', () => {
  stage();
  const ball = screen.getByRole('button', { name: '小球' });
  expect(ball).toHaveAttribute('tabindex', '0');
  expect(screen.getByTestId('resting').closest('[role="button"]')).toBeNull();
});

it('tells the page which prop was tapped and which place it goes on', async () => {
  const onActivate = stage();
  await userEvent.click(screen.getByRole('button', { name: '小球' }));
  expect(onActivate).toHaveBeenLastCalledWith({ part: 'ball', key: 'ball-1' });
  await userEvent.click(screen.getByRole('button', { name: '木箱' }));
  expect(onActivate).toHaveBeenLastCalledWith({ place: 'crate' });
});

it('takes a prop and a place reached by the keyboard', async () => {
  const onActivate = stage();
  await userEvent.tab();
  await userEvent.keyboard('{Enter}');
  expect(onActivate).toHaveBeenLastCalledWith({ part: 'ball', key: 'ball-1' });
  await userEvent.tab();
  await userEvent.keyboard(' ');
  expect(onActivate).toHaveBeenLastCalledWith({ place: 'crate' });
});

it('draws the dragged prop where the pointer is, out of reach of taps', () => {
  stage();
  const ghost = screen.getByTestId('ghost').parentElement;
  expect(ghost).toHaveAttribute('transform', 'translate(300 200)');
  expect(ghost?.closest('[role="button"]')).toBeNull();
});
