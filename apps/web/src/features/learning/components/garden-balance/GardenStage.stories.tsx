import type { Meta, StoryObj } from '@storybook/react-vite';
import { arrive } from '../../lessons/garden-balance/garden-story';
import { lines } from '../../lessons/garden-balance/script';
import { GardenStage } from './GardenStage';

const meta = {
  title: 'Learning/Garden balance',
  component: GardenStage,
  args: {
    state: arrive('leaves').state,
    handling: {},
    speaking: false,
    narrow: false,
    entryLabel: '开始短片',
    onEnter: () => {},
    onReplay: () => {},
    onActivate: () => {},
  },
} satisfies Meta<typeof GardenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Opening: Story = {
  args: { state: { ...arrive('leaves').state, shot: 'opening' } },
};
export const TwoCabbages: Story = { args: { caption: lines.question.text } };
export const AppleSideDown: Story = {
  args: { state: arrive('apples').state, caption: lines.tip.text },
};
export const BalancedLineDidNotPlay: Story = {
  args: {
    state: { ...arrive('apples').state, apples: 3 },
    caption: lines.balanced.text,
    failure: 'refused',
  },
};
export const OneAppleThreeCucumbers: Story = {
  args: { state: { ...arrive('exchange').state, revealed: true }, caption: lines.three.text },
};
export const CountTheCucumbers: Story = {
  args: { state: arrive('answer').state, caption: lines.bridgeDone.text },
};
export const TwoEachInstead: Story = {
  args: { state: arrive('end').state, caption: lines.changeDone.text },
};
