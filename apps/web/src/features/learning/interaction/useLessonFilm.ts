import { useEffect, useRef, useState } from 'react';
import { useReloadReadiness } from '../../../shared/lib/reload-readiness';
import { createChime } from './chime';
import { tell, type FilmScene, type FilmStory, type Reaction } from './lesson-film';
import type { NarrationFailure } from './narration';
import { useNarration } from './useNarration';

// The rising tones that open every film.
const startTones = [392, 494, 587];

type Options<Shot extends string> = {
  // Hears of every scene the child reaches, as it is reached.
  onArrive?: (shot: Shot) => void;
  createAudio?: () => HTMLAudioElement;
};

type Voice = Readonly<{
  speaking: boolean;
  paused: boolean;
  // Why the line on screen did not come out, while it waits to be heard again.
  failure?: NarrationFailure;
  replay: () => void;
  pause: () => void;
  resume: () => void;
}>;

export type LessonFilm<State, Shot extends string, Move> = Voice &
  Readonly<{
    state: State;
    caption?: string;
    // Whether the teacher is telling lines the child is hearing, the short
    // pauses between them included.
    playing: boolean;
    // Starts the film at its first scene, or at a saved one.
    enter: (shot?: Shot) => void;
    act: (move: Move) => void;
    go: (shot: Shot) => void;
  }>;

// What the child hears of the teacher, and can do with it.
function voiceOf(narration: ReturnType<typeof useNarration>): Voice {
  return {
    speaking: narration.status === 'playing',
    paused: narration.status === 'paused',
    failure: narration.failure,
    replay: narration.replay,
    pause: narration.pause,
    resume: narration.resume,
  };
}

// The latest callback, for work that outlives the render that started it.
function useLatest<Callback>(callback: Callback) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  return latest;
}

// The film's tones, and its runs of lines: each new run tells whether it is
// still the one on screen. Leaving the lesson ends the run on screen and
// closes the tones.
function useFilmRuns() {
  const [chime] = useState(() => createChime());
  const runs = useRef(0);
  useEffect(() => {
    const film = runs;
    return () => {
      film.current++;
      chime.close();
    };
  }, [chime]);
  const [begin] = useState(() => () => {
    const run = ++runs.current;
    return () => runs.current === run;
  });
  return { chime, begin };
}

// A lesson film as it plays: the scene, the teacher's caption and voice, and
// the tones. A new event cuts in on whatever the teacher was still saying, and
// a scene that follows its lines starts only once they are heard to the end;
// a line that did not come out holds the scene until the child hears it again.
// While the child hears the teacher, the page knows a reload would cut the
// film off. Leaving the lesson stops whatever was still to be said.
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
  const [telling, setTelling] = useState(false);
  const narration = useNarration(state.shot, createAudio);
  const { chime, begin } = useFilmRuns();
  const shown = useRef<FilmScene<Shot>>('opening');
  const arrived = useLatest(onArrive);

  function apply({ state: next, chime: tones, say, then }: Reaction<State, Shot, Line>) {
    if (next.shot !== shown.current && next.shot !== 'opening') arrived.current(next.shot);
    shown.current = next.shot;
    setState(next);
    chime.play(tones);
    if (!say.length) return;
    const current = begin();
    const said = say.map((line) => story.lines[line]);
    setTelling(true);
    void tell({ voice: narration, step: next.shot, show: setCaption, current }, said).then(
      (finished) => {
        if (!current()) return;
        setTelling(false);
        if (finished && then) apply(story.arrive(then));
      },
    );
  }

  const voice = voiceOf(narration);
  const playing = telling && !voice.paused && !voice.failure;
  useReloadReadiness(playing ? 'playing' : 'ready');

  return {
    ...voice,
    state,
    caption,
    playing,
    enter(shot = story.first) {
      chime.play(startTones);
      apply(story.arrive(shot));
    },
    act(move) {
      const reaction = story.respond(state, move);
      if (reaction) apply(reaction);
    },
    go: (shot) => apply(story.arrive(shot)),
  };
}
