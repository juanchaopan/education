import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ReactNode } from 'react';
import type { Handling } from '../../interaction/stage-activation';
import { gardenLesson } from '../../lessons/garden-balance/definition';
import { arrive, type GardenState } from '../../lessons/garden-balance/garden-story';
import { lines, variationAnswer } from '../../lessons/garden-balance/script';
import { boardFacts } from '../../lessons/lesson-board';
import { stageLook } from '../../lessons/lesson-definition';
import { backdrops } from '../../media/backdrops/backdrops';
import { AnswerCapsule } from '../lesson-stage/AnswerCapsule';
import { AskMicrophone } from '../lesson-stage/AskMicrophone';
import { ClearingOutline } from '../lesson-stage/ClearingOutline';
import { ConclusionBoard } from '../lesson-stage/ConclusionBoard';
import { FireflyHint } from '../lesson-stage/FireflyHint';
import { BoardPlace, LessonStage, StagePlace } from '../lesson-stage/LessonStage';
import { ReasonCapsule } from '../lesson-stage/ReasonCapsule';
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
  // What the child answers in, with the hints and the microphone beside it.
  answering?: ReactNode;
  frame?: FrameShape;
};

const look = stageLook(gardenLesson);
const { content } = gardenLesson;
const nothing = () => {};

// The garden scenes on the lesson stage, as the lesson page shows them, with
// the conclusions found so far on the board, the rabbit's line in its
// subtitle and, while the child answers, the capsule beside it.
function GardenFilm({
  state,
  handling,
  line,
  answered = false,
  answering,
  frame,
  ...stage
}: FilmArgs) {
  const facts = boardFacts(gardenLesson.board, content.conclusions, content, state, { answered });
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
            {answering}
          </>
        }
      >
        <GardenScene state={state} handling={handling} />
      </LessonStage>
    </StoryFrame>
  );
}

// The variation's hint and the microphone to ask the rabbit, beside what the
// child answers in, as in every scene the variation is answered in.
function Answering({ children }: { children?: ReactNode }) {
  return (
    <>
      {children && <StagePlace at="answer">{children}</StagePlace>}
      <StagePlace at="hint">
        <FireflyHint left={1} ready onHint={nothing} />
      </StagePlace>
      <StagePlace at="microphone">
        <AskMicrophone label="按住问小兔" holding={false} onPress={nothing} onRelease={nothing} />
      </StagePlace>
    </>
  );
}

const capsuleHandlers = {
  blocked: false,
  onListen: nothing,
  onFinish: nothing,
  onStopWaiting: nothing,
  onConfirm: nothing,
  onRetry: nothing,
};

const { guess, reason } = variationAnswer;

const guessCapsule = (step: ComponentProps<typeof AnswerCapsule>['step']) => (
  <Answering>
    <AnswerCapsule
      {...capsuleHandlers}
      label="说出你猜的数"
      question={guess.question}
      step={step}
      unit={guess.unit}
      choices={guess.choices}
      onChoose={nothing}
      onContinue={nothing}
    />
  </Answering>
);

const reasonCapsule = (step: ComponentProps<typeof ReasonCapsule>['step']) => (
  <Answering>
    <ReasonCapsule
      {...capsuleHandlers}
      question={reason.question}
      step={step}
      choices={content.variation?.choices ?? {}}
      onChoose={nothing}
    />
  </Answering>
);

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
// A phone held upright: the painting fills it, and the scale spans its width.
export const OnAnUprightPhone: Story = {
  args: { state: arrive('answer').state, line: lines.bridgeDone.text, frame: 'phone' },
};

// The variation, another problem: the board keeps only the cabbage that
// weighs three apples beside the 假如 condition, the basket shows the new
// condition, and the apples rest while the child guesses. The guess heard,
// to agree with or say again.
export const VariationGuessHeard: Story = {
  args: {
    state: arrive('guess').state,
    line: '我听到你说「六根」，是 6 吗？',
    answering: guessCapsule({ kind: 'confirm', heard: '六根', said: [6] }),
  },
};
// The guess recorded, neither right nor wrong, a moment before the lesson
// moves on by itself.
export const VariationGuessRecorded: Story = {
  args: {
    state: arrive('guess').state,
    line: lines.change.text,
    answering: guessCapsule({ kind: 'recorded', said: [6] }),
  },
};
// The child swaps the apples in twos; the rabbit says nothing of the total.
export const VariationSwap: Story = {
  args: {
    state: { ...arrive('swap').state, replaced: 1 },
    line: lines.swap.text,
    answering: <Answering />,
  },
};
export const VariationReasonHeard: Story = {
  args: {
    state: arrive('reason').state,
    line: '我听到你说「还是三组，只是每组变成了两根」，对吗？',
    answering: reasonCapsule({ kind: 'confirm', heard: '还是三组，只是每组变成了两根' }),
  },
};
// Speech cannot be used, or two tries came to nothing: the two rows of words.
export const VariationReasonChoices: Story = {
  args: {
    state: arrive('reason').state,
    line: lines.why.text,
    answering: reasonCapsule({ kind: 'ask', message: '', choices: true }),
  },
};
// A reason that was not clear: the rabbit's words in the subtitle, the honey
// drop to say it again and the firefly hint at hand.
export const VariationReasonUnclear: Story = {
  args: {
    state: arrive('reason').state,
    line: reason.unclear,
    answering: reasonCapsule({ kind: 'ask', message: reason.unclear, choices: false }),
  },
};
// Revealed: the 那么 result follows the 假如 condition, three frames of two.
export const VariationReveal: Story = {
  args: { state: arrive('reveal').state, line: lines.reveal.text },
};
export const VariationReasonOnAnUprightPhone: Story = {
  args: { ...VariationReasonChoices.args, frame: 'phone' },
};
export const VariationRevealOnAnUprightPhone: Story = {
  args: { ...VariationReveal.args, frame: 'phone' },
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
          box={framed(backdrops[content.backdrop].clearZone, establishing)}
          kind="clearing"
        />
        <ClearingOutline box={gardenLesson.staging} kind="staging" />
      </LessonStage>
    </StoryFrame>
  ),
};
