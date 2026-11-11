import { useSyncExternalStore } from 'react';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { Teacher } from '../components/lesson-stage/stage-look';
import { Subtitle, type NarrationHold } from '../components/lesson-stage/Subtitle';
import type { Subtitle as Words } from '../interaction/subtitle';

type Props = {
  words: Words;
  teacher: Teacher;
  narration?: NarrationHold;
  onResume: () => void;
};

// The teacher's subtitle in the picture, with the newest words any part of
// the lesson said. Words said but hidden, like a narrated line with the
// captions off, leave it quiet.
export function LessonSubtitle({ words, teacher, narration, onResume }: Props) {
  const said = useSyncExternalStore(words.subscribe, words.newest, words.newest);
  const shown = said?.hidden ? undefined : said;
  return (
    <StagePlace at="subtitle">
      <Subtitle
        teacher={teacher}
        text={shown?.text}
        thinking={shown?.thinking}
        narration={narration}
        onResume={onResume}
      />
    </StagePlace>
  );
}
