import { useState, type ComponentType, type ReactNode } from 'react';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonPreferences } from '../data-access/useLessonPreferences';
import { useLessonRecordings } from '../data-access/useLessonRecordings';
import type { FilmState } from '../interaction/lesson-film';
import { createSubtitle, type Subtitle } from '../interaction/subtitle';
import { useLessonFilm, type LessonFilm } from '../interaction/useLessonFilm';
import { filmStory, resumed, stageLook, type LessonDefinition } from '../lessons/lesson-definition';
import { createMicrophoneTurn, type MicrophoneTurn } from '../voice/microphone-turn';
import { FilmControls } from './FilmControls';
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
  const tale = filmStory(script, story);
  const firstScene = script.shots[0];
  const first = { stepId: firstScene, drawing: [] };
  const Screen = lessonScreen(lesson, look);
  // What the controls in the picture share: the playing film, the teacher's
  // subtitle and the lesson's one microphone.
  type Film = LessonFilm<State, Shot, Move>;
  type Lesson = { film: Film; subtitle: Subtitle; turn: MicrophoneTurn };
  type BodyProps = {
    start?: Start<Shot>;
    onArrive?: (shot: Shot) => void;
    controls: (lesson: Lesson) => ReactNode;
  };

  // The playing film filling the screen, its recordings fetched as the page
  // opens, its sound and captions as the child chose them on this device, and
  // the controls every lesson has beside the page's own.
  function Body({ start = {}, onArrive, controls }: BodyProps) {
    const recordings = useLessonRecordings(script.lines);
    const preferences = useLessonPreferences();
    const film = useLessonFilm(tale, { onArrive, muted: !preferences.sound });
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
              {controls({ film, subtitle, turn })}
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
        controls={({ film, subtitle, turn }) => (
          <LessonPanels
            lesson={lesson}
            teacher={look.teacher.name}
            scope={scope}
            film={film}
            turn={turn}
            subtitle={subtitle}
            draft={draft}
            resumed={picked}
            onRestart={() => startOver(film)}
          />
        )}
      />
    );
  }

  return function LessonPage({ csrf }) {
    if (!csrf) return <Body controls={visitorControls} />;
    return <SignedIn scope={{ ...lesson.problem, csrf }} />;
  };
}
