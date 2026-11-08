import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import type { Handling } from '../../interaction/stage-activation';
import { gardenLook } from '../../lessons/garden-balance/garden-look';
import { arrive, type GardenState } from '../../lessons/garden-balance/garden-story';
import { lines } from '../../lessons/garden-balance/script';
import { Ambience } from '../lesson-stage/Ambience';
import { LessonStage } from '../lesson-stage/LessonStage';
import { GardenDefs } from './garden-defs';
import { GardenScene } from './garden-scenes';

type FilmArgs = Omit<ComponentProps<typeof LessonStage>, 'look' | 'shot' | 'children'> & {
  state: GardenState;
  handling: Handling;
};

const defs = <GardenDefs />;
const fireflies = <Ambience kind="fireflies" />;

// The garden scenes on the lesson stage, as the lesson page shows them.
function GardenFilm({ state, handling, ...stage }: FilmArgs) {
  return (
    <LessonStage {...stage} look={gardenLook} shot={state.shot} defs={defs} ambience={fireflies}>
      <GardenScene state={state} handling={handling} />
    </LessonStage>
  );
}

const meta = {
  title: 'Learning/Garden balance',
  component: GardenFilm,
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
} satisfies Meta<typeof GardenFilm>;
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
