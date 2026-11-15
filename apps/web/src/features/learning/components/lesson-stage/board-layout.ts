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
  { group, times = false }: Readonly<{ group?: number; times?: boolean }>,
): AmountPlan {
  if (group === undefined) {
    return times
      ? { times: count, things: arrangement(1, shape) }
      : { things: arrangement(count, shape) };
  }
  const frames = count / group;
  return {
    ...(times && { times: frames }),
    frames: arrangement(times ? 1 : frames, 'tall'),
    things: arrangement(group, shape),
  };
}

// Whether the board draws an amount's things smaller than a single one, as
// it does when they pile up in two lines or sit in frames.
export const piled = ({ frames, things }: AmountPlan) =>
  frames !== undefined || things.lines.length > 1;
