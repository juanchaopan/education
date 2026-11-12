import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import type { Handling } from '../../interaction/stage-activation';
import { gardenLesson } from '../../lessons/garden-balance/definition';
import { arrive, type GardenState } from '../../lessons/garden-balance/garden-story';
import { lines } from '../../lessons/garden-balance/script';
import { boardFacts } from '../../lessons/lesson-board';
import { stageLook } from '../../lessons/lesson-definition';
import { backdrops } from '../../media/backdrops/backdrops';
import { ClearingOutline } from '../lesson-stage/ClearingOutline';
import { ConclusionBoard } from '../lesson-stage/ConclusionBoard';
import { BoardPlace, LessonStage, StagePlace } from '../lesson-stage/LessonStage';
import { establishing, framed } from '../lesson-stage/stage-look';
import { StoryFrame, type FrameShape } from '../lesson-stage/StoryFrame';
import { Subtitle } from '../lesson-stage/Subtitle';
import { GardenScene } from './garden-scenes';

type FilmArgs = Omit<ComponentProps<typeof LessonStage>, 'look' | 'shot' | 'children'> & {
  state: GardenState;
  handling: Handling;
  // The rabbit's line in its subtitle.
  line?: string;
  // The child has said the count right.
  answered?: boolean;
  frame?: FrameShape;
};

const look = stageLook(gardenLesson);
const scenes = { shots: gardenLesson.script.shots, answer: gardenLesson.answer.shot };
const kept = { ...gardenLesson.board, conclusions: gardenLesson.content.conclusions };

// The garden scenes on the lesson stage, as the lesson page shows them, with
// the conclusions found so far on the board and the rabbit's line in its
// subtitle.
function GardenFilm({ state, handling, line, answered = false, frame, ...stage }: FilmArgs) {
  const facts = boardFacts(kept, scenes, state, { answered });
  return (
    <StoryFrame shape={frame}>
      <LessonStage
        {...stage}
        look={look}
        shot={state.shot}
        defs={gardenLesson.defs}
        ambience={gardenLesson.ambience}
        controls={
          <>
            <BoardPlace>
              <ConclusionBoard facts={facts} />
            </BoardPlace>
            <StagePlace at="subtitle">
              <Subtitle teacher={look.teacher} text={line} />
            </StagePlace>
          </>
        }
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
    onActivate: () => {},
  },
} satisfies Meta<typeof GardenFilm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Opening: Story = {
  args: { state: { ...arrive('leaves').state, shot: 'opening' } },
};
export const TwoCabbages: Story = { args: { line: lines.question.text } };
export const AppleSideDown: Story = {
  args: { state: arrive('apples').state, line: lines.tip.text },
};
export const BalancedLineDidNotPlay: Story = {
  args: {
    state: { ...arrive('apples').state, apples: 3 },
    line: lines.balanced.text,
    failure: 'refused',
  },
};
export const OneAppleThreeCucumbers: Story = {
  args: { state: { ...arrive('exchange').state, revealed: true }, line: lines.three.text },
};
export const CountTheCucumbers: Story = {
  args: { state: arrive('answer').state, line: lines.bridgeDone.text },
};
// The count said right is written on the board.
export const NineCucumbers: Story = {
  args: { state: arrive('answer').state, line: lines.bridgeDone.text, answered: true },
};
export const TwoEachInstead: Story = {
  args: { state: arrive('end').state, line: lines.changeDone.text },
};
// A phone held upright: the painting fills it, and the scale spans its width.
export const OnAnUprightPhone: Story = {
  args: { state: arrive('answer').state, line: lines.bridgeDone.text, frame: 'phone' },
};
// On a phone the board wraps onto a second line once the variation sets its
// condition beside the one it changes.
export const TwoEachOnAnUprightPhone: Story = {
  args: { state: arrive('end').state, line: lines.changeDone.text, frame: 'phone' },
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
