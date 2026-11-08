import { useEffect, useRef, useState } from 'react';
import { createChime } from '../../interaction/chime';
import type { CueResult } from '../../interaction/narration';
import { useNarration } from '../../interaction/useNarration';
import {
  arrive,
  opening,
  respond,
  type GardenState,
  type Move,
  type Reaction,
  type Scene,
} from './garden-story';
import { lines, type LineId, type Shot } from './script';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// A clip that has not started playing by then, such as a stalled download,
// stops holding the scene. A clip that is playing, or paused while the child
// asks a question, is always waited for to its real end.
const longestStall = 11_000;
const betweenLines = 310;
// How long a caption stays when its sound cannot play, so it can still be read.
const readingTime = (text: string) => Math.max(1_500, text.length * 220);

type Voice = {
  interrupt: (step: string, source?: string, onCue?: () => void) => Promise<CueResult>;
};
type Telling = {
  voice: Voice;
  shot: Scene;
  show: (caption: string) => void;
  // Whether this run of lines is still the one on screen.
  current: () => boolean;
};

async function sayLine({ voice, shot, show }: Telling, id: LineId) {
  const { text, clip } = lines[id];
  show(text);
  let started = false;
  const cue = voice.interrupt(shot, clip, () => {
    started = true;
  });
  const stalled = wait(longestStall).then(() => (started ? cue : ('stalled' as const)));
  const heard = await Promise.race([cue, stalled]);
  if (heard === 'unavailable') await wait(readingTime(text));
  return heard;
}

// Says a scene's lines in order and tells whether they were all heard.
async function tell(telling: Telling, ids: readonly LineId[]) {
  for (const [index, id] of ids.entries()) {
    if (index > 0) await wait(betweenLines);
    if (!telling.current()) return false;
    const heard = await sayLine(telling, id);
    if (heard === 'cancelled' || !telling.current()) return false;
  }
  return true;
}

// The garden film as it plays: the scene, the rabbit's caption and voice, and
// the tones. A new event cuts in on whatever the rabbit was still saying, and
// a scene that follows its lines starts only if they were heard to the end.
// `onArrive` hears of every scene the child reaches, as it is reached. Leaving
// the lesson stops whatever was still to be said.
export function useGardenStory(onArrive: (shot: Shot) => void = () => {}) {
  const [state, setState] = useState<GardenState>(opening);
  const [caption, setCaption] = useState<string>();
  const narration = useNarration(state.shot);
  const [chime] = useState(() => createChime());
  const runs = useRef(0);
  const shown = useRef<Scene>('opening');
  const arrived = useRef(onArrive);
  useEffect(() => {
    arrived.current = onArrive;
  });
  useEffect(() => {
    const story = runs;
    return () => {
      story.current++;
      chime.close();
    };
  }, [chime]);

  function apply({ state: next, chime: tones, say, then }: Reaction) {
    if (next.shot !== shown.current && next.shot !== 'opening') arrived.current(next.shot);
    shown.current = next.shot;
    setState(next);
    chime.play(tones);
    if (!say.length) return;
    const run = ++runs.current;
    const current = () => runs.current === run;
    void tell({ voice: narration, shot: next.shot, show: setCaption, current }, say).then(
      (finished) => {
        if (finished && then && current()) apply(arrive(then));
      },
    );
  }

  return {
    state,
    caption,
    speaking: narration.status === 'playing',
    paused: narration.status === 'paused',
    enter(shot: Shot = 'leaves') {
      chime.play([392, 494, 587]);
      apply(arrive(shot));
    },
    act(move: Move) {
      const reaction = respond(state, move);
      if (reaction) apply(reaction);
    },
    go: (shot: Shot) => apply(arrive(shot)),
    replay: narration.replay,
    pause: narration.pause,
    resume: narration.resume,
  };
}

export type GardenStory = ReturnType<typeof useGardenStory>;
