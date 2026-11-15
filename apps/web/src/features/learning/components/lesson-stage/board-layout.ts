import type { AmountDrawing } from '@education/problems/lesson-content';
import type { ReactNode } from 'react';

// How the conclusion board lays out the things of one amount, so a lesson
// declares only how many there are and the board keeps every pile low and
// narrow: never more than two lines of things.
//
// A thing's shape decides how its copies sit together:
// - `round`, an apple: side by side, then in two rows with the shorter row on
//   top, so three make a triangle and four a square;
// - `long`, a cucumber lying down: stacked in one column, then in two;
// - `tall`, a standing bottle or a frame of things: side by side, then in two
//   rows with the longer row on top.
export type BoardShape = 'round' | 'long' | 'tall';

// One of the things conclusions are drawn with: its picture, an SVG element
// the board scales to the size of the words, and its shape, which lays out
// its copies.
export type BoardPicture = Readonly<{ art: ReactNode; shape: BoardShape }>;

// How many of one thing a conclusion weighs out, drawn with the thing's
// picture as many times as it counts: in frames of `group` when given, and as
// 「k×」 before one of them when `times` says so. `shape` lays the copies out.
// `key` names it among the amounts of its line.
export type BoardAmount = Readonly<{
  key: string;
  count: number;
  picture: ReactNode;
  shape: BoardShape;
}> &
  AmountDrawing;

export const boardAmount = (
  key: string,
  count: number,
  { art, shape }: BoardPicture,
  drawing: AmountDrawing = {},
): BoardAmount => ({ key, count, picture: art, shape, ...drawing });

// The things of a pile line by line, and whether the lines are rows across
// or columns down.
export type Arrangement = Readonly<{ lines: readonly number[]; across: boolean }>;

// How many fit on one line before a pile takes a second.
const oneLine: Readonly<Record<BoardShape, number>> = { round: 2, long: 3, tall: 4 };

export function arrangement(count: number, shape: BoardShape): Arrangement {
  const across = shape !== 'long';
  if (count <= oneLine[shape]) return { lines: [count], across };
  const short = Math.floor(count / 2);
  const long = count - short;
  return { lines: shape === 'round' ? [short, long] : [long, short], across };
}

// What the board draws of an amount: `times`, the 「k×」 written before it if
// any; `frames`, how its frames are laid out when it is drawn in groups; and
// `things`, how the things in each frame, or in the amount, are laid out.
// Frames stand side by side as tall things do, and a 「k×」 amount draws one
// thing, or one frame.
export type AmountPlan = Readonly<{
  times?: number;
  frames?: Arrangement;
  things: Arrangement;
}>;

export function amountPlan(
  count: number,
  shape: BoardShape,
  { group, times = false }: AmountDrawing,
): AmountPlan {
  const many = count / (group ?? 1);
  const shown = times ? 1 : many;
  return {
    ...(times && { times: many }),
    ...(group === undefined
      ? { things: arrangement(shown, shape) }
      : { frames: arrangement(shown, 'tall'), things: arrangement(group, shape) }),
  };
}

// Whether the board draws an amount's things smaller than a single one, as
// it does when they pile up in two lines or sit in frames.
export const piled = ({ frames, things }: AmountPlan) =>
  frames !== undefined || things.lines.length > 1;
