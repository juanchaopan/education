import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import type { Handling } from '../../interaction/stage-activation';
import { railLesson } from '../../lessons/rail-chase/definition';
import { arrive, type RailState } from '../../lessons/rail-chase/rail-story';
import { lines, type Shot } from '../../lessons/rail-chase/script';
import { stageLook } from '../../lessons/lesson-definition';
import { backdrops } from '../../media/backdrops/backdrops';
import { ClearingOutline } from '../lesson-stage/ClearingOutline';
import { LessonStage, StagePlace } from '../lesson-stage/LessonStage';
import { establishing, framed } from '../lesson-stage/stage-look';
import { StoryFrame, type FrameShape } from '../lesson-stage/StoryFrame';
import { Subtitle } from '../lesson-stage/Subtitle';
import { RailScene } from './RailScene';

type FilmArgs = Omit<ComponentProps<typeof LessonStage>, 'look' | 'shot' | 'children'> & {
  state: RailState;
  handling: Handling;
  // The owl's line in its subtitle.
  line?: string;
  frame?: FrameShape;
};

const look = stageLook(railLesson);

// The rail chase scenes on the lesson stage, as the lesson page shows them,
// with the owl's line in its subtitle.
function RailFilm({ state, handling, line, frame, ...stage }: FilmArgs) {
  return (
    <StoryFrame shape={frame}>
      <LessonStage
        {...stage}
        look={look}
        shot={state.shot}
        defs={railLesson.defs}
        controls={
          <StagePlace at="subtitle">
            <Subtitle teacher={look.teacher} text={line} />
          </StagePlace>
        }
      >
        <RailScene state={state} handling={handling} />
      </LessonStage>
    </StoryFrame>
  );
}

const at = (shot: Shot, change: Partial<RailState> = {}): RailState => ({
  ...arrive(shot).state,
  ...change,
});

const meta = {
  title: 'Learning/Rail chase',
  component: RailFilm,
  args: {
    state: at('story'),
    handling: {},
    speaking: false,
    entryLabel: '开始短片',
    onEnter: () => {},
    onActivate: () => {},
  },
} satisfies Meta<typeof RailFilm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Opening: Story = { args: { state: { ...at('story'), shot: 'opening' } } };
export const WhoIsWhere: Story = { args: { line: lines.storyCars.text } };
// The stretch each car drives in a second, once both are tapped.
export const HowFast: Story = {
  args: { state: at('speed', { taps: 2 }), line: lines.speedBlue.text },
};
export const WhatTheQuestionAsks: Story = {
  args: { state: at('question', { taps: 2 }), line: lines.questionFour.text },
};
export const TapTheStartGap: Story = {
  args: { state: at('start-gap'), line: lines.startAsk.text },
};
export const FirstSecond: Story = {
  args: { state: at('one-second', { t: 1, stopped: true }), line: lines.oneCompare.text },
};
// Pushed half way through a second, between the start and the stop.
export const HalfWayThroughASecond: Story = {
  args: { state: at('two-seconds', { t: 1.5 }), handling: { lifted: 'yellow-car' } },
};
export const NameTheSeconds: Story = {
  args: { state: at('name-t', { taps: 1 }), line: lines.nameRest.text },
};
export const LinedUp: Story = {
  args: { state: at('catch-up', { t: 10, stopped: true }), line: lines.catchMeet.text },
};
export const YellowAhead: Story = {
  args: { state: at('past', { t: 11, stopped: true, taps: 1 }), line: lines.pastSign.text },
};
export const AbsoluteValue: Story = {
  args: { state: at('distance', { t: 12, stopped: true }), line: lines.distanceAbs.text },
};
export const TapTheFour: Story = {
  args: { state: at('equation'), line: lines.equationAsk.text },
};
export const TwoWays: Story = {
  args: { state: at('two-ways', { taps: 1 }), line: lines.waysBlue.text },
};
export const SayBothTimes: Story = {
  args: { state: at('solve'), line: lines.solveAsk.text },
};
export const CheckTheSecondTime: Story = {
  args: { state: at('check-fourteen', { t: 14, stopped: true }), line: lines.checkTwo.text },
};
export const FasterYellowCar: Story = {
  args: { state: at('vary'), line: lines.varyGuess.text },
};
export const VariationRevealed: Story = {
  args: { state: at('vary-seven', { t: 7, stopped: true }), line: lines.varyReveal.text },
};
// A phone held upright: the painting fills it, and the tracks span its width.
export const OnAnUprightPhone: Story = {
  args: { state: at('solve'), line: lines.solveAsk.text, frame: 'phone' },
};

// The backdrop's clearing and the part of the world the props take up, over
// the scene where the cars have driven furthest, so a person can see that
// everything the lesson draws stands in the clearing.
export const PropsInTheClearing: Story = {
  args: { state: at('check-fourteen', { t: 14, stopped: true }) },
  render: ({ state, handling, frame, ...stage }) => (
    <StoryFrame shape={frame}>
      <LessonStage {...stage} look={look} shot={state.shot} defs={railLesson.defs}>
        <RailScene state={state} handling={handling} />
        <ClearingOutline
          box={framed(backdrops[railLesson.backdrop].clearZone, establishing)}
          kind="clearing"
        />
        <ClearingOutline box={railLesson.staging} kind="staging" />
      </LessonStage>
    </StoryFrame>
  ),
};
