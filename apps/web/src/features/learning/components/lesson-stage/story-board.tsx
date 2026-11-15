import type { AmountDrawing } from '@education/problems/lesson-content';
import { boardAmount, type BoardAmount, type BoardPicture } from './board-layout';
import type { BoardFact } from './ConclusionBoard';

// Conclusions for the stories of the conclusion board and the lesson stage,
// so they show the board without borrowing a lesson's props: the balls and
// the box from the stage stories' table. Like the story look, their colours
// are written out and never borrow the site's tokens.
const things = {
  gold: {
    art: <circle cx="50%" cy="50%" r="42%" fill="#e5b950" stroke="#8a5f3c" strokeWidth="2" />,
    shape: 'round',
  },
  rose: {
    art: <circle cx="50%" cy="50%" r="42%" fill="#dd9276" stroke="#8a5f3c" strokeWidth="2" />,
    shape: 'round',
  },
  box: {
    art: <rect x="12%" y="18%" width="76%" height="64%" rx="12%" fill="#9a6a45" stroke="#5e3b24" />,
    shape: 'tall',
  },
} satisfies Record<string, BoardPicture>;

type Thing = keyof typeof things;

const amount = (count: number, thing: Thing, drawing: AmountDrawing = {}) =>
  boardAmount(`${thing}-${count}-${drawing.group ?? 1}`, count, things[thing], drawing);

const fact = (id: string, says: string, ...amounts: BoardAmount[]): BoardFact => ({
  id,
  says,
  amounts,
  lit: false,
  supposed: false,
});

const first = fact('box-gold', '1 个盒子和 2 个黄球一样重', amount(1, 'box'), amount(2, 'gold'));
const second = fact('gold-rose', '1 个黄球和 3 个红球一样重', amount(1, 'gold'), amount(3, 'rose'));
const third = fact(
  'box-groups',
  '1 个盒子和 2 组红球一样重',
  amount(1, 'box'),
  amount(6, 'rose', { group: 3 }),
);
const answered: BoardFact = {
  ...third,
  says: '1 个盒子和 2 组红球、6 个红球一样重',
  amounts: [...third.amounts, amount(6, 'rose')],
};
const supposed: BoardFact = {
  ...fact('gold-rose-two', '假如 1 个黄球和 2 个红球一样重', amount(1, 'gold'), amount(2, 'rose')),
  supposed: true,
  lit: true,
};
const many = fact(
  'box-many',
  '1 个盒子和 4 组红球一样重，每组 8 个，一共 32 个',
  amount(1, 'box'),
  amount(32, 'rose', { group: 8, times: true }),
  amount(32, 'rose', { times: true }),
);

// The board as a lesson fills it: the first conclusion alone, three with the
// newest in use, the count answered onto the last, a changed condition in use
// beside the one it changes, and amounts too many to draw one by one.
export const storyBoards = {
  one: [first],
  inUse: [first, second, { ...third, lit: true }],
  answered: [first, second, answered],
  supposed: [first, second, supposed, answered],
  many: [first, many],
} satisfies Record<string, readonly BoardFact[]>;
