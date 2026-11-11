import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConclusionBoard, type BoardFact } from './ConclusionBoard';
import { onStoryPainting } from './on-story-painting';

// The balls and the box from the lesson stage's own story table stand in for
// a lesson's props, with a frame holding a group of three red balls.
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

type Picture = keyof typeof pictures;

const amount = (count: number, picture: Picture) => ({
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
const supposed: BoardFact = {
  ...fact('gold-rose-two', '假如 1 个黄球和 2 个红球一样重', amount(1, 'gold'), amount(2, 'rose')),
  supposed: true,
};
const answered: BoardFact = {
  ...third,
  says: '1 个盒子和 2 组红球、6 个红球一样重',
  amounts: [...third.amounts, amount(6, 'rose')],
};

const meta = {
  title: 'Learning/Lesson stage/Conclusion board',
  component: ConclusionBoard,
  decorators: [onStoryPainting],
  args: { facts: [first] },
} satisfies Meta<typeof ConclusionBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OneFound: Story = {};
// The scene uses the newest conclusion, which glows gold.
export const InUse: Story = { args: { facts: [first, second, { ...third, lit: true }] } };
// Once the count is answered right, it is written onto the conclusion it
// comes from.
export const WithTheAnswer: Story = { args: { facts: [first, second, answered] } };
// A changed condition sits beside the one it changes.
export const Supposed: Story = {
  args: { facts: [first, second, { ...supposed, lit: true }, answered] },
};
// Too narrow for one line, the board wraps onto a second.
export const Wrapping: Story = {
  args: { facts: [first, second, { ...supposed, lit: true }, answered] },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};
