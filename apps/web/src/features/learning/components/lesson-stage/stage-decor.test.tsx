import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Ambience } from './Ambience';
import { AttentionCue } from './AttentionCue';
import { BoardText } from './BoardText';

// The cues, the ambience and the board writing are drawn on the stage's world;
// none of them is a control.
function world(children: ReactNode) {
  const { container } = render(<svg>{children}</svg>);
  return container.querySelector('svg')!;
}

describe('AttentionCue', () => {
  it('sends the arrow along a curve from the prop to where it goes', () => {
    const svg = world(<AttentionCue kind="arrow" from={[100, 200]} to={[300, 220]} />);
    const arrow = svg.querySelector('g')!;
    expect(arrow.style.offsetPath).toBe('path("M 100 200 Q 200 165 300 220")');
  });

  it('casts the shadow the lesson gives it', () => {
    const svg = world(<AttentionCue kind="finger" at={[50, 60]} shadow="url(#lesson-shadow)" />);
    expect(svg.querySelector('[filter]')).toHaveAttribute('filter', 'url(#lesson-shadow)');
  });

  it('puts the fingertip and the rings on the spot to look at', () => {
    const finger = world(<AttentionCue kind="finger" at={[50, 60]} />);
    expect(finger.querySelector('g')).toHaveAttribute('transform', 'translate(50 60) rotate(-18)');
    const pulse = world(<AttentionCue kind="pulse" at={[70, 80]} radius={30} />);
    expect(pulse.querySelector('g')).toHaveAttribute('transform', 'translate(70 80)');
    expect(pulse.querySelectorAll('circle[r="30"]')).toHaveLength(2);
  });

  it('is never a control', () => {
    const svg = world(
      <>
        <AttentionCue kind="arrow" from={[0, 0]} to={[10, 10]} />
        <AttentionCue kind="finger" at={[0, 0]} />
        <AttentionCue kind="pulse" at={[0, 0]} />
      </>,
    );
    expect(svg.querySelectorAll('[role], [tabindex]')).toHaveLength(0);
  });
});

describe('Ambience', () => {
  it('scatters fireflies or petals over the world', () => {
    expect(world(<Ambience kind="fireflies" />).querySelectorAll('circle')).toHaveLength(18);
    expect(world(<Ambience kind="petals" />).querySelectorAll('ellipse')).toHaveLength(14);
  });
});

describe('BoardText', () => {
  it('writes centred on its point', () => {
    const text = world(
      <BoardText x={120} y={40} size={18}>
        一个苹果换两根
      </BoardText>,
    ).querySelector('text');
    expect(text).toHaveTextContent('一个苹果换两根');
    expect(text).toHaveAttribute('x', '120');
    expect(text).toHaveAttribute('text-anchor', 'middle');
    expect(text).toHaveAttribute('font-size', '18');
  });
});
