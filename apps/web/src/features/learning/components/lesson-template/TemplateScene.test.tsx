import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { arrive, respond, type TemplateState } from '../../lessons/lesson-template/story';
import { TemplateScene } from './TemplateScene';

function scene(state: TemplateState) {
  render(
    <svg>
      <TemplateScene state={state} handling={{}} />
    </svg>,
  );
}

const pebblesToMove = () => screen.queryAllByRole('button', { name: '小石子' });

it('offers one pebble at a time to move, and the bowl to put it in', () => {
  scene(arrive('look').state);
  expect(pebblesToMove()).toHaveLength(1);
  expect(screen.getByRole('button', { name: '碗' })).toBeInTheDocument();
});

it('offers the last pebble once the first is in the bowl', () => {
  scene(respond(arrive('look').state, { kind: 'drop', place: 'bowl' })!.state);
  expect(pebblesToMove()).toHaveLength(1);
});

it('has no pebble left to move at the count', () => {
  scene(arrive('count').state);
  expect(pebblesToMove()).toHaveLength(0);
});
