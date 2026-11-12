import { useRef, useState } from 'react';
import type { FilmState, Reaction } from './lesson-film';
import {
  emptyLog,
  lessonRecord,
  logArrival,
  logMove,
  type LessonLog,
  type LessonRecording,
} from './lesson-record';

// The lesson as the page has seen it since the child opened it, kept for the
// questions the child asks: the film reports each scene reached, with the
// state it shows there, and each move, and a question takes the record as it
// stands. A move the scene takes leaves the picture of the state it brings,
// so a move that plays on into the next scene ends the scene on screen with
// the picture that next scene opens on. Nothing here renders, so it is kept
// out of the page's state.
export function useLessonRecord<State extends FilmState<Shot>, Shot extends string, Move>(
  recording: LessonRecording<State, Move>,
  shots: readonly Shot[],
) {
  const log = useRef<LessonLog>(emptyLog);
  const [record] = useState(() => ({
    arrive(shot: Shot, state: State) {
      log.current = logArrival(log.current, shots, shot, recording.picture(state));
    },
    move(state: State, move: Move, reaction?: Reaction<State, Shot, string>) {
      if (state.shot === 'opening') return;
      const action = recording.action(state, move, reaction !== undefined);
      const picture = reaction && recording.picture(reaction.state);
      log.current = logMove(log.current, action, picture);
    },
    read: () => lessonRecord(log.current),
  }));
  return record;
}
