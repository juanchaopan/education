import { useRef, useState } from 'react';
import { createChime } from '../../interaction/chime';
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// A line that never reports its end, such as a stalled download, stops
// holding the scene after this long.
const longestLine = 11_000;
const betweenLines = 310;

// The garden film as it plays: the scene, the rabbit's caption and voice, and
// the tones. A new event cuts in on whatever the rabbit was still saying, and
// a scene that follows its lines starts only if they were heard to the end.
// `onArrive` hears of every scene the child reaches, as it is reached.
export function useGardenStory(onArrive: (shot: Shot) => void = () => {}) {
  const [state, setState] = useState<GardenState>(opening);
  const [caption, setCaption] = useState<string>();
  const narration = useNarration(state.shot);
  const [chime] = useState(() => createChime());
  const runs = useRef(0);
  const shown = useRef<Scene>('opening');

  async function speak(shot: Scene, say: readonly LineId[]) {
    const run = ++runs.current;
    for (const [index, id] of say.entries()) {
      if (index > 0) await wait(betweenLines);
      if (runs.current !== run) return false;
      setCaption(lines[id].text);
      const heard = await Promise.race([
        narration.interrupt(shot, lines[id].clip),
        wait(longestLine),
      ]);
      if (heard === 'cancelled' || runs.current !== run) return false;
    }
    return true;
  }

  function apply({ state: next, chime: tones, say, then }: Reaction) {
    if (next.shot !== shown.current && next.shot !== 'opening') onArrive(next.shot);
    shown.current = next.shot;
    setState(next);
    chime(tones);
    if (!say.length) return;
    void speak(next.shot, say).then((finished) => {
      if (finished && then) apply(arrive(then));
    });
  }

  return {
    state,
    caption,
    speaking: narration.status === 'playing',
    paused: narration.status === 'paused',
    enter(shot: Shot = 'leaves') {
      chime([392, 494, 587]);
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
