import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Icon } from './Icon';
import { iconNames } from './icons';

it('draws every named icon and hides it from screen readers', () => {
  for (const name of iconNames) {
    const { container, unmount } = render(<Icon name={name} />);
    const icon = container.firstElementChild;
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.textContent).not.toBe('');
    unmount();
  }
});

it('sets a badge on its tile and keeps the caller placement class', () => {
  const { container } = render(<Icon name="home" badge className="placed" />);
  const icon = container.firstElementChild;
  expect(icon?.classList).toContain('placed');
  expect(icon?.classList.length).toBe(2);
});

it('adds no class to a plain icon', () => {
  const { container } = render(<Icon name="cloud" />);
  expect(container.firstElementChild).not.toHaveAttribute('class');
});
