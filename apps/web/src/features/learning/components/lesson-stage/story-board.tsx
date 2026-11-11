import type { BoardFact } from './ConclusionBoard';

// Conclusions for the stories of the conclusion board and the lesson stage,
// so they show the board without borrowing a lesson's props: the balls and
// the box from the stage stories' table, and a frame holding a group of
// three red balls. Like the story look, their colours are written out and
// never borrow the site's tokens.
const pictures = {
  gold: <circle cx="50%" cy="50%" r="42%" fill="#e5b950" stroke="#8a5f3c" strokeWidth="2" />,
  rose: <circle cx="50%" cy="50%" r="42%" fill="#dd9276" stroke="#8a5f3c" strokeWidth="2" />,
  box: <rect x="12%" y="18%" width="76%" height="64%" rx="12%" fill="#9a6a45" stroke="#5e3b24" />,
  group: (
    <>
      <rect x="18%" y="4%" width="64%" height="92%" rx="14%" fill="#f3e8d633" stroke="#f3e8d6" />
      <circle cx="50%" cy="24%" r="13%" fill="#dd9276" />
      <circle cx="50%" cy="50%" r="13%" fill="#dd9276" />
      <circle cx="50%" cy="76%" r="13%" fill="#dd9276" />
    </>
  ),
};

const amount = (count: number, picture: keyof typeof pictures) => ({
  key: `${picture}-${count}`,
  count,
  picture: pictures[picture],
});

const fact = (id: string, says: string, ...amounts: ReturnType<typeof amount>[]): BoardFact => ({
  id,
  says,
  amounts,
  lit: false,
  supposed: false,
});

const first = fact('box-gold', '1 个盒子和 2 个黄球一样重', amount(1, 'box'), amount(2, 'gold'));
const second = fact('gold-rose', '1 个黄球和 3 个红球一样重', amount(1, 'gold'), amount(3, 'rose'));
const third = fact('box-groups', '1 个盒子和 2 组红球一样重', amount(1, 'box'), amount(2, 'group'));
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

// The board as a lesson fills it: the first conclusion alone, three with the
// newest in use, the count answered onto the last, and a changed condition
// in use beside the one it changes.
export const storyBoards = {
  one: [first],
  inUse: [first, second, { ...third, lit: true }],
  answered: [first, second, answered],
  supposed: [first, second, supposed, answered],
} satisfies Record<string, readonly BoardFact[]>;
