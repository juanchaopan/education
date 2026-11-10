import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import type { Handling } from '../../interaction/stage-activation';
import { gardenLesson } from '../../lessons/garden-balance/definition';
import { arrive, type GardenState } from '../../lessons/garden-balance/garden-story';
import { lines } from '../../lessons/garden-balance/script';
import { stageLook } from '../../lessons/lesson-definition';
import { backdrops } from '../../media/backdrops/backdrops';
import { ClearingOutline } from '../lesson-stage/ClearingOutline';
import { LessonStage } from '../lesson-stage/LessonStage';
import { establishing, framed } from '../lesson-stage/stage-look';
import { StoryFrame, type FrameShape } from '../lesson-stage/StoryFrame';
import { GardenScene } from './garden-scenes';

type FilmArgs = Omit<ComponentProps<typeof LessonStage>, 'look' | 'shot' | 'children'> & {
  state: GardenState;
  handling: Handling;
  frame?: FrameShape;
};

const look = stageLook(gardenLesson);

// The garden scenes on the lesson stage, as the lesson page shows them.
function GardenFilm({ state, handling, frame, ...stage }: FilmArgs) {
  return (
    <StoryFrame shape={frame}>
      <LessonStage
        {...stage}
        look={look}
        shot={state.shot}
        defs={gardenLesson.defs}
        ambience={gardenLesson.ambience}
      >
        <GardenScene state={state} handling={handling} />
      </LessonStage>
    </StoryFrame>
  );
}

const meta = {
  title: 'Learning/Garden balance',
  component: GardenFilm,
  args: {
    state: arrive('leaves').state,
    handling: {},
    speaking: false,
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
// A phone held upright: the painting fills it, and the scale spans its width.
export const OnAnUprightPhone: Story = {
  args: { state: arrive('answer').state, caption: lines.bridgeDone.text, frame: 'phone' },
};

// The backdrop's clearing and the part of the world the props take up, over
// the scene whose apple side sinks lowest, so a person can see that the props
// stand in the clearing. The backdrop keeps its establishing framing, and the
// clearing is outlined where that framing shows it.
export const PropsInTheClearing: Story = {
  args: { state: arrive('apples').state },
  render: ({ state, handling, frame, ...stage }) => (
    <StoryFrame shape={frame}>
      <LessonStage
        {...stage}
        look={{ ...look, cameras: undefined }}
        shot={state.shot}
        defs={gardenLesson.defs}
        ambience={gardenLesson.ambience}
      >
        <GardenScene state={state} handling={handling} />
        <ClearingOutline
          box={framed(backdrops[gardenLesson.backdrop].clearZone, establishing)}
          kind="clearing"
        />
        <ClearingOutline box={gardenLesson.staging} kind="staging" />
      </LessonStage>
    </StoryFrame>
  ),
};
