import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { Teacher } from '../components/lesson-stage/stage-look';
import { StageTools } from '../components/lesson-stage/StageTools';
import type { useLessonPreferences } from '../data-access/useLessonPreferences';
import type { Subtitle } from '../interaction/subtitle';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { LessonSubtitle } from './LessonSubtitle';

// What the controls take from the playing film: its caption and voice.
type Film = Pick<
  LessonFilm<unknown, string, unknown>,
  'caption' | 'speaking' | 'paused' | 'failure' | 'replay' | 'resume'
>;

type Props = {
  film: Film;
  subtitle: Subtitle;
  turn: MicrophoneTurn;
  preferences: ReturnType<typeof useLessonPreferences>;
  teacher: Teacher;
  // The page's own controls, laid in beside these.
  children?: ReactNode;
};

// Hearing a line again, or carrying a paused one on, brings it back into the
// subtitle over whatever was said since; `again` counts how often.
function useNarrationAgain(film: Film) {
  const [again, setAgain] = useState(0);
  return {
    again,
    replay() {
      setAgain((count) => count + 1);
      film.replay();
    },
    resume() {
      setAgain((count) => count + 1);
      film.resume();
    },
  };
}

// The controls every lesson has in its picture once the film has started:
// the tools in the top corner and the teacher's subtitle, which says each
// narrated line unless the child turned the captions off; a line that did
// not come out is shown all the same. While the child holds the microphone,
// a paused narration shows it is held; afterwards the child carries it on
// from the subtitle.
export function FilmControls({ film, subtitle, turn, preferences, teacher, children }: Props) {
  const held = useSyncExternalStore(turn.subscribe, turn.held, turn.held);
  const narration = useNarrationAgain(film);
  useSubtitleWords(subtitle, 'narration', {
    text: film.caption,
    hidden: !preferences.captions && film.failure === undefined,
    again: narration.again,
  });
  return (
    <>
      <StagePlace at="tools">
        <StageTools
          speaking={film.speaking}
          again={film.failure !== undefined}
          captions={preferences.captions}
          sound={preferences.sound}
          onReplay={narration.replay}
          onCaptions={preferences.toggleCaptions}
          onSound={preferences.toggleSound}
        />
      </StagePlace>
      <LessonSubtitle
        words={subtitle}
        teacher={teacher}
        narration={film.paused ? (held ? 'held' : 'paused') : undefined}
        onResume={narration.resume}
      />
      {children}
    </>
  );
}
