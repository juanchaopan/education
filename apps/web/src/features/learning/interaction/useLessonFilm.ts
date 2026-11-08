import { useEffect, useRef, useState } from 'react';
import { createChime } from './chime';
import { tell, type FilmScene, type FilmStory, type Reaction } from './lesson-film';
import { useNarration } from './useNarration';

// The rising tones that open every film.
const startTones = [392, 494, 587];

type Options<Shot extends string> = {
  // Hears of every scene the child reaches, as it is reached.
  onArrive?: (shot: Shot) => void;
  createAudio?: () => HTMLAudioElement;
};

export type LessonFilm<State, Shot extends string, Move> = Readonly<{
  state: State;
  caption?: string;
  speaking: boolean;
  paused: boolean;
  // Starts the film at its first scene, or at a saved one.
  enter: (shot?: Shot) => void;
  act: (move: Move) => void;
  go: (shot: Shot) => void;
  replay: () => void;
  pause: () => void;
  resume: () => void;
}>;

// A lesson film as it plays: the scene, the teacher's caption and voice, and
// the tones. A new event cuts in on whatever the teacher was still saying, and
// a scene that follows its lines starts only if they were heard to the end.
// Leaving the lesson stops whatever was still to be said.
export function useLessonFilm<
  State extends Readonly<{ shot: FilmScene<Shot> }>,
  Shot extends string,
  Line extends string,
  Move,
>(
  story: FilmStory<State, Shot, Line, Move>,
  { onArrive = () => {}, createAudio }: Options<Shot> = {},
): LessonFilm<State, Shot, Move> {
  const [state, setState] = useState<State>(story.opening);
  const [caption, setCaption] = useState<string>();
  const narration = useNarration(state.shot, createAudio);
  const [chime] = useState(() => createChime());
  const runs = useRef(0);
  const shown = useRef<FilmScene<Shot>>('opening');
  const arrived = useRef(onArrive);
  useEffect(() => {
    arrived.current = onArrive;
  });
  useEffect(() => {
    const film = runs;
    return () => {
      film.current++;
      chime.close();
    };
  }, [chime]);

  function apply({ state: next, chime: tones, say, then }: Reaction<State, Shot, Line>) {
    if (next.shot !== shown.current && next.shot !== 'opening') arrived.current(next.shot);
    shown.current = next.shot;
    setState(next);
    chime.play(tones);
    if (!say.length) return;
    const run = ++runs.current;
    const current = () => runs.current === run;
    const said = say.map((line) => story.lines[line]);
    void tell({ voice: narration, step: next.shot, show: setCaption, current }, said).then(
      (finished) => {
        if (finished && then && current()) apply(story.arrive(then));
      },
    );
  }

  return {
    state,
    caption,
    speaking: narration.status === 'playing',
    paused: narration.status === 'paused',
    enter(shot = story.first) {
      chime.play(startTones);
      apply(story.arrive(shot));
    },
    act(move) {
      const reaction = story.respond(state, move);
      if (reaction) apply(reaction);
    },
    go: (shot) => apply(story.arrive(shot)),
    replay: narration.replay,
    pause: narration.pause,
    resume: narration.resume,
  };
}
