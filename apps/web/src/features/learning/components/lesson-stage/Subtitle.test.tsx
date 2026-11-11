import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { storyLook } from './story-look';
import { Subtitle } from './Subtitle';

const { teacher } = storyLook;

it("tells the teacher's words with the teacher's name", () => {
  render(<Subtitle teacher={teacher} text="我们先看看桌子上有什么。" />);
  expect(screen.getByRole('status')).toHaveTextContent('小猫头鹰：我们先看看桌子上有什么。');
});

it('shows nothing while the teacher has nothing to say', () => {
  const { container } = render(<Subtitle teacher={teacher} />);
  expect(container).toBeEmptyDOMElement();
});

it('carries a paused narration on from the mark on the portrait', async () => {
  const resume = vi.fn();
  render(
    <Subtitle teacher={teacher} text="碰一碰这个苹果。" narration="paused" onResume={resume} />,
  );
  await userEvent.click(screen.getByRole('button', { name: '接着听小猫头鹰讲' }));
  expect(resume).toHaveBeenCalledOnce();
});

it('only shows that the narration is held while the child speaks', () => {
  render(<Subtitle teacher={teacher} text="碰一碰这个苹果。" narration="held" />);
  expect(screen.queryByRole('button')).toBeNull();
});

it('says the teacher is thinking while a reply is on its way, naming the teacher once', () => {
  render(<Subtitle teacher={teacher} thinking />);
  expect(screen.getByRole('status')).toHaveTextContent(/^小猫头鹰：正在想…$/);
});

it('can be reached from the keyboard to scroll long words', () => {
  render(<Subtitle teacher={teacher} text="我们先看看桌子上有什么。" />);
  expect(screen.getByRole('status')).toHaveAttribute('tabindex', '0');
});
