import { useState, type ComponentType, type ReactNode } from 'react';
import type { LessonRecord } from '@education/contracts';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useLessonAnswer';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonPreferences } from '../data-access/useLessonPreferences';
import { useLessonRecordings } from '../data-access/useLessonRecordings';
import type { FilmState, FilmStory } from '../interaction/lesson-film';
import type { LessonRecording } from '../interaction/lesson-record';
import { createSubtitle, type Subtitle } from '../interaction/subtitle';
import { useLessonFilm, type LessonFilm } from '../interaction/useLessonFilm';
import { useLessonRecord } from '../interaction/useLessonRecord';
import type { AnswerProgress, BoardScenes } from '../lessons/lesson-board';
import { filmStory, resumed, stageLook, type LessonDefinition } from '../lessons/lesson-definition';
import { createMicrophoneTurn, type MicrophoneTurn } from '../voice/microphone-turn';
import { FilmControls } from './FilmControls';
import { KeptConclusions } from './KeptConclusions';
import { LessonPanels } from './LessonPanels';
import { LessonSignInNotice } from './LessonSignInNotice';
import { lessonScreen, type Start } from './lesson-screen';
import styles from './LessonPage.module.css';

// The sign-in notice a visitor sees where a child's microphone would be.
const visitorControls = () => (
  <StagePlace at="corner">
    <LessonSignInNotice />
  </StagePlace>
);

const unanswered: AnswerProgress = { answered: false };

// How far the child has got with the count, which the conclusion board
// follows: answered right in this visit, and the last hint received. Coming
// to a scene up to the one that asks for the count, by starting over or
// picking up a saved place, asks for it afresh.
function useAnswerProgress<Shot extends string>({ shots, answerScene }: BoardScenes<Shot>) {
  const [progress, setProgress] = useState(unanswered);
  const [events] = useState<AnswerEvents>(() => ({
    onHint: (hint) => setProgress((now) => ({ ...now, hint })),
    onCorrect: () => setProgress((now) => ({ ...now, answered: true })),
  }));
  return {
    progress,
    events,
    arrive(shot: Shot) {
      if (shots.indexOf(shot) <= shots.indexOf(answerScene)) setProgress(unanswered);
    },
  };
}

// What a lesson's film plays from: its story, how its scenes are recorded,
// and its scenes in teaching order with the one that asks for the count.
type Played<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
> = Readonly<{
  tale: FilmStory<State, Shot, Line, Move>;
  recording: LessonRecording<State, Move>;
  scenes: BoardScenes<Shot>;
}>;

// The film as it plays, with what the page follows beside it: how far the
// child has got with the count, and the lesson so far as the page has seen
// it, which questions carry.
function usePlayingFilm<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
>(
  { tale, recording, scenes }: Played<State, Shot, Line, Move>,
  onArrive: (shot: Shot) => void,
  muted: boolean,
) {
  const answer = useAnswerProgress(scenes);
  const record = useLessonRecord(recording, scenes.shots);
  const film = useLessonFilm(tale, {
    onArrive: (shot, state) => {
      answer.arrive(shot);
      record.arrive(shot, state);
      onArrive(shot);
    },
    onMove: record.move,
    muted,
  });
  return { film, answer, record };
}

// What the controls in the picture share: the playing film, the lesson so
// far as the page has seen it, the teacher's subtitle, the lesson's one
// microphone, and what the answer tells the conclusion board.
type Shared<State, Shot extends string, Move> = Readonly<{
  film: LessonFilm<State, Shot, Move>;
  record: () => LessonRecord;
  subtitle: Subtitle;
  turn: MicrophoneTurn;
  answer: AnswerEvents;
}>;

// Where the film starts, what the page does on reaching a scene, and the
// controls it adds to those every lesson has.
type BodyProps<State, Shot extends string, Move> = {
  start?: Start<Shot>;
  onArrive?: (shot: Shot) => void;
  controls: (shared: Shared<State, Shot, Move>) => ReactNode;
};

// One problem's lesson page, built once for its own definition, so the page
// holds the lesson to its own state, scenes, lines, moves and props. Anyone
// can watch and play the scenes; saving, questions and the answer need a
// signed-in child, whose session token the page takes.
export function lessonPage<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
>(
  lesson: LessonDefinition<State, Shot, Line, Move, Piece, Look>,
): ComponentType<{ csrf?: string }> {
  const { script, story } = lesson;
  const look = stageLook(lesson);
  const played = {
    tale: filmStory(script, story),
    recording: lesson.record,
    scenes: lesson.content,
  };
  const firstScene = script.shots[0];
  const first = { stepId: firstScene, drawing: [] };
  const Screen = lessonScreen(lesson, look);
  type Film = LessonFilm<State, Shot, Move>;

  // The playing film filling the screen, its recordings fetched as the page
  // opens, its sound and captions as the child chose them on this device, and
  // the controls every lesson has beside the page's own, with the conclusions
  // it keeps when its way of teaching uses the board.
  function Body({ start = {}, onArrive = () => {}, controls }: BodyProps<State, Shot, Move>) {
    const recordings = useLessonRecordings(script.lines);
    const preferences = useLessonPreferences();
    const { film, answer, record } = usePlayingFilm(played, onArrive, !preferences.sound);
    const [subtitle] = useState(createSubtitle);
    const [turn] = useState(createMicrophoneTurn);
    return (
      <div className={styles.lesson}>
        <Screen
          film={film}
          recordings={recordings}
          start={start}
          controls={
            <FilmControls
              film={film}
              subtitle={subtitle}
              turn={turn}
              preferences={preferences}
              teacher={look.teacher}
            >
              <KeptConclusions lesson={lesson} state={film.state} progress={answer.progress} />
              {controls({ film, record: record.read, subtitle, turn, answer: answer.events })}
            </FilmControls>
          }
        />
      </div>
    );
  }

  // A signed-in child's lesson: each scene reached that is work in progress
  // is saved, so coming back resumes at its start, and the answer, the
  // questions and the draft all belong to this child. Starting over from a
  // resumed scene plays the first scene, which saves over the place picked
  // up when it is work in progress; otherwise the draft is dropped.
  function SignedIn({ scope }: { scope: LearningScope }) {
    const draft = useLessonDraft(scope, first);
    const [picked, setPicked] = useState<{ shot: Shot }>();
    const saved = draft.status === 'saved' ? draft.content.stepId : undefined;
    const resume = saved === undefined ? undefined : resumed(script, saved);
    function startOver(film: Film) {
      film.go(firstScene);
      if (!story.savesProgress(firstScene)) void draft.discard();
    }
    return (
      <Body
        start={{
          resume,
          finding: draft.status === 'loading',
          onResume: (shot) => setPicked({ shot }),
        }}
        onArrive={(shot) => {
          if (story.savesProgress(shot)) void draft.saveAs({ stepId: shot, drawing: [] });
        }}
        controls={({ film, record, subtitle, turn, answer }) => (
          <LessonPanels
            lesson={lesson}
            teacher={look.teacher.name}
            scope={scope}
            film={film}
            record={record}
            turn={turn}
            subtitle={subtitle}
            draft={draft}
            resumed={picked}
            onRestart={() => startOver(film)}
            answerEvents={answer}
          />
        )}
      />
    );
  }

  return function LessonPage({ csrf }) {
    if (!csrf) return <Body controls={visitorControls} />;
    return <SignedIn scope={{ ...lesson.content.problem, csrf }} />;
  };
}
