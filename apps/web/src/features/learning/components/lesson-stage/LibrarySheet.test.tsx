import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { backdrops } from '../../media/backdrops/backdrops';
import { teachers } from '../../media/teachers/teachers';
import { BackdropSheet, TeacherSheet } from './LibrarySheet';

const tag = (name: string) => screen.getByText(name).nextElementSibling;

describe('the backdrop sheet', () => {
  it('shows the tags a lesson picks a backdrop by', () => {
    render(<BackdropSheet backdrop={backdrops['art-studio-evening']} showClearing />);
    expect(tag('场景')).toHaveTextContent('画室');
    expect(tag('时间和色调')).toHaveTextContent('傍晚紫橙灯光');
    expect(tag('年级')).toHaveTextContent('低年级（1–2）、中年级（3–4）');
    expect(tag('空地')).toHaveTextContent('整片开阔：x 150、y 270、宽 890、高 350');
    expect(tag('适合')).toHaveTextContent('配对和计数、排列和分类');
  });

  it('outlines the clearing in world units only when asked', () => {
    const backdrop = backdrops['garden-morning'];
    const { container, rerender } = render(<BackdropSheet backdrop={backdrop} showClearing />);
    const outline = container.querySelector('rect');
    const { x, y, width, height } = backdrop.clearZone;
    expect([x, y, width, height].map(String)).toEqual(
      ['x', 'y', 'width', 'height'].map((name) => outline?.getAttribute(name)),
    );
    rerender(<BackdropSheet backdrop={backdrop} showClearing={false} />);
    expect(container.querySelector('rect')).toBeNull();
  });
});

describe('the teacher sheet', () => {
  it('shows the teacher by name, with its school years and manner', () => {
    render(<TeacherSheet teacher={teachers.rabbit} />);
    expect(screen.getByRole('img', { name: '小兔' })).toHaveAttribute('src', teachers.rabbit.image);
    expect(tag('年级')).toHaveTextContent('低年级（1–2）');
    expect(tag('性格')).toHaveTextContent(teachers.rabbit.personality);
  });
});
