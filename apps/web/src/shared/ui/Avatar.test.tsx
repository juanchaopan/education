import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Avatar } from './Avatar';

it('draws the first character of the name, hidden from screen readers', () => {
  const { container } = render(<Avatar name=" parent@example.test" />);
  const avatar = container.firstElementChild;
  expect(avatar).toHaveTextContent('P');
  expect(avatar).toHaveAttribute('aria-hidden', 'true');
});

it('takes the colours in turn by place in a list', () => {
  const tone = (place: number) =>
    render(<Avatar name="小鹿" place={place} />).container.firstElementChild?.getAttribute(
      'data-tone',
    );
  expect([tone(0), tone(1), tone(2)]).toEqual(['primary', 'second', 'primary']);
});
