import { useEffect, useRef, useState } from 'react';
import { useLatest } from '../../../shared/lib/useLatest';
import { useReloadReadiness } from '../../../shared/lib/reload-readiness';
import { createChime, type Chime } from './chime';
import { tell, type FilmScene, type FilmState, type FilmStory, type Reaction } from './lesson-film';
import type { NarrationFailure } from './narration';
import { useNarration } from './useNarration';

// The rising tones that open every film.
const startTones = [392, 494, 587];

type Options<State, Shot extends string, Line extends string, Move> = {
  // Hears of every scene the child reaches, as it is reached, with the state
  // the film shows there.
  onArrive?: (shot: Shot, state: State) => void;
  // Hears of every move the child makes, before the film follows it, with
  // what the scene on screen made of it, or nothing when it took no notice.
  onMove?: (state: State, move: Move, reaction?: Reaction<State, Shot, Line>) => void;
  createAudio?: () => HTMLAudioElement;
  // The lesson's sound is off: the lines and tones play without it.
  muted?: boolean;
};

type Voice = Readonly<{
  // A line is sounding now.
  speaking: boolean;
  // The scene's lines are still being told, the pauses between them included.
  telling: boolean;
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
    // The lesson's tones and its audio context, for the parts beneath the film.
    chime: Pick<Chime, 'play' | 'audio'>;
    // Starts the film at its first scene, or at a saved one.
    enter: (shot?: Shot) => void;
    act: (move: Move) => void;
    go: (shot: Shot) => void;
  }>;

// What the child hears of the teacher, and can do with it.
function voiceOf(narration: ReturnType<typeof useNarration>, telling: boolean): Voice {
  return {
    speaking: narration.status === 'playing',
    telling,
    paused: narration.status === 'paused',
    failure: narration.failure,
    replay: narration.replay,
    pause: narration.pause,
    resume: narration.resume,
  };
}

// The film's tones, and its runs of lines: each new run tells whether it is
// still the one on screen. Leaving the lesson ends the run on screen and
// closes the tones.
function useFilmRuns(muted: boolean) {
  const [chime] = useState(() => createChime());
  const runs = useRef(0);
  useEffect(() => {
    const film = runs;
    return () => {
      film.current++;
      chime.close();
    };
  }, [chime]);
  useEffect(() => chime.mute(muted), [chime, muted]);
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
// While the teacher tells lines the child hears, the short pauses between
// them included, the page knows a reload would cut the film off. Leaving the
// lesson stops whatever was still to be said.
export function useLessonFilm<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
>(
  story: FilmStory<State, Shot, Line, Move>,
  {
    onArrive = () => {},
    onMove = () => {},
    createAudio,
    muted = false,
  }: Options<State, Shot, Line, Move> = {},
): LessonFilm<State, Shot, Move> {
  const [state, setState] = useState<State>(story.opening);
  const [caption, setCaption] = useState<string>();
  const [telling, setTelling] = useState(false);
  const narration = useNarration(state.shot, createAudio, muted);
  const { chime, begin } = useFilmRuns(muted);
  const shown = useRef<FilmScene<Shot>>('opening');
  const arrived = useLatest(onArrive);
  const moved = useLatest(onMove);

  function apply({ state: next, chime: tones, say, then }: Reaction<State, Shot, Line>) {
    if (next.shot !== shown.current && next.shot !== 'opening') arrived.current(next.shot, next);
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

  const voice = voiceOf(narration, telling);
  useReloadReadiness(telling && !voice.paused && !voice.failure ? 'playing' : 'ready');

  return {
    ...voice,
    state,
    caption,
    chime,
    enter(shot = story.first) {
      chime.play(startTones);
      apply(story.arrive(shot));
    },
    act(move) {
      const reaction = story.respond(state, move);
      moved.current(state, move, reaction);
      if (reaction) apply(reaction);
    },
    go: (shot) => apply(story.arrive(shot)),
  };
}
