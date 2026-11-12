import { useGlide } from '../../interaction/useGlide';
import type { Handling } from '../../interaction/stage-activation';
import { derivationOf } from '../../lessons/rail-chase/rail-board';
import { runs, type RailState } from '../../lessons/rail-chase/rail-story';
import type { Shot } from '../../lessons/rail-chase/script';
import {
  carHeights,
  lengths,
  positions,
  rows,
  speedOf,
  starts,
  trackEnd,
  unit,
  wonBack,
  xAt,
  type Car,
} from '../../lessons/rail-chase/rail-track';
import { railView, type RailView } from '../../lessons/rail-chase/rail-view';
import type { SceneProps } from '../../lessons/lesson-definition';
import { AttentionCue, type Point } from '../lesson-stage/AttentionCue';
import { DerivationBoard } from '../lesson-stage/DerivationBoard';
import { RailCar } from './rail-cars';
import { Compare, FourSample, Question, Squares, Tag } from './rail-parts';
import { GapRow, Legend, StartGapToTap, StartStrip, Ways } from './rail-rows';
import styles from './rail-art.module.css';

// How fast the cars drive on to where a tap or an arrow key sends them, in
// seconds of the problem a second.
const pace = 1.6;

const trackY: Readonly<Record<Car, number>> = { yellow: rows.yellow, blue: rows.blue };
const names: Readonly<Record<Car, string>> = { yellow: '黄车', blue: '蓝车' };

// What a car says it is to a screen reader, when the child can push or tap
// it now; otherwise it is only drawn.
function carLabel(car: Car, state: RailState, view: RailView) {
  if (state.shot === 'opening') return;
  const run = runs[state.shot];
  if (run && !state.stopped) return `推${names[car]}，点一下走一秒`;
  if (state.shot === 'story' || view.next === `${car}-car`) return names[car];
}

// Where the cue for the next thing to touch points.
function cueAt(view: RailView, m: number, n: number): Point | undefined {
  switch (view.next) {
    case 'yellow-car':
      return [xAt(m), rows.yellow - carHeights.yellow.middle];
    case 'blue-car':
      return [xAt(n), rows.blue - carHeights.blue.middle];
    case 'start-gap':
      return [xAt(4), rows.start];
    case 'rest':
      return [xAt(8), rows.start];
    case 'gap':
      return [(xAt(m) + xAt(n)) / 2, rows.gap];
    case 'four':
      return [459, rows.question];
    case 'blue-ahead':
      return [255, 341];
    case 'yellow-ahead':
      return [455, 341];
    default:
      return undefined;
  }
}

function Tracks({ m, n, t }: { m: number; n: number; t: number }) {
  return (
    <g>
      <path
        d={`M150 ${rows.yellow}H${trackEnd} M150 ${rows.blue}H${trackEnd}`}
        className={styles.track}
      />
      {t > 0 && (
        <>
          <path
            d={`M${xAt(starts.yellow)} ${rows.yellow}H${xAt(m)}`}
            className={styles.trailYellow}
          />
          <path d={`M${xAt(starts.blue)} ${rows.blue}H${xAt(n)}`} className={styles.trailBlue} />
        </>
      )}
    </g>
  );
}

// The stretch each car drives in one second, dashed in front of it, as the
// child taps the car on the speed scene.
function Steps({ cars, m, n }: { cars: RailView['steps']; m: number; n: number }) {
  const ahead = { yellow: m + lengths.yellow / 2, blue: n + lengths.blue / 2 };
  return cars.map((car) => (
    <g key={car}>
      <Squares
        from={ahead[car]}
        to={ahead[car] + speedOf(car, 'speed')}
        y={trackY[car] - 18}
        className={styles.step}
        height={16}
      />
      <text
        x={xAt(ahead[car] + speedOf(car, 'speed') / 2)}
        y={trackY[car] - 32}
        className={styles.label}
      >
        1 秒
      </text>
    </g>
  ));
}

// Each car's speed on a tag beside it, on the side with room for it.
function Speeds({ m, n, shot }: { m: number; n: number; shot: Shot }) {
  const tag = (car: Car, at: number) => {
    const half = (lengths[car] * unit) / 2;
    const right = xAt(at) + half + 56;
    const x = right + 46 > trackEnd ? xAt(at) - half - 56 : right;
    return (
      <Tag x={x} y={trackY[car] - 20} width={96} tone={car === 'yellow' ? 'warm' : 'cool'}>
        {`每秒 ${speedOf(car, shot)} 格`}
      </Tag>
    );
  };
  return (
    <g>
      {tag('yellow', m)}
      {tag('blue', n)}
    </g>
  );
}

// The lines dropped from both midpoints to the squares between them.
function Drops({ m, n, to }: { m: number; n: number; to: number }) {
  return (
    <path
      d={`M${xAt(m)} ${rows.yellow - carHeights.yellow.middle}V${to} M${xAt(n)} ${rows.blue - carHeights.blue.middle}V${to}`}
      className={styles.drop}
    />
  );
}

function Cars({
  state,
  view,
  handling,
  m,
  n,
}: {
  state: RailState;
  view: RailView;
  handling: Handling;
  m: number;
  n: number;
}) {
  const car = (kind: Car, at: number, point: string) => (
    <RailCar
      car={kind}
      x={xAt(at)}
      y={trackY[kind]}
      length={lengths[kind] * unit}
      point={point}
      lit={state.shot === 'story' && state.taps > 0}
      label={carLabel(kind, state, view)}
      highlight={view.next === `${kind}-car`}
      held={handling.lifted === `${kind}-car`}
      key={`${kind}-${state.shot === 'story' ? state.taps : 0}`}
    />
  );
  return (
    <>
      {car('yellow', m, 'M')}
      {car('blue', n, 'N')}
    </>
  );
}

// What the scene shows above the tracks: the question, with its 4 格 to
// tap when the scene asks, how long four squares are, and the first second
// of both cars side by side.
function Above({ view }: { view: RailView }) {
  return (
    <>
      {view.question && <Question four={view.next === 'four' ? 'tap' : undefined} />}
      {view.sample && <FourSample />}
      {view.compare && <Compare />}
    </>
  );
}

type UnderProps = { view: RailView; shown: number; shot: Shot; m: number; n: number };

// What the scene shows under the tracks: the lines dropped from the
// midpoints, the start strip and what its gold squares stand for, and the
// squares between the midpoints once the cars have moved.
function Under({ view, shown, shot, m, n }: UnderProps) {
  const moved = shown > 0;
  return (
    <>
      {view.drops && (
        <Drops
          m={moved ? m : starts.yellow}
          n={moved ? n : starts.blue}
          to={moved ? rows.gap : rows.start}
        />
      )}
      {view.next === 'start-gap' && <StartGapToTap />}
      {view.strip && (
        <StartStrip
          won={wonBack(shown, shot)}
          counting={view.counting}
          restToTap={view.next === 'rest'}
        />
      )}
      {view.legend && <Legend supposed={view.legend === 'supposed'} />}
      {(moved || view.meet) && (
        <GapRow
          m={m}
          n={n}
          count={Number.isInteger(shown)}
          ruler={view.ruler}
          ahead={view.ahead}
          meet={view.meet}
          toTap={view.next === 'gap'}
        />
      )}
    </>
  );
}

const wayTapped = (next: RailView['next']) =>
  next === 'blue-ahead' || next === 'yellow-ahead' ? next : undefined;

// The rail chase on the workshop's workbench: two plain tracks, the two
// cars and their midpoints M and N, and only what the scene has found so
// far about the distance between them. The cars glide to where they are
// pushed, so the squares change one at a time on the way.
export function RailScene({ state, handling }: SceneProps<RailState>) {
  const shown = useGlide(state.t, { rate: pace, held: handling.lifted !== undefined });
  const view = railView(state);
  const shot = state.shot === 'opening' ? 'story' : state.shot;
  const { m, n } = positions(shown, shot);
  const board = derivationOf(state);
  const cue = cueAt(view, m, n);
  return (
    <g className={styles.scene}>
      <Above view={view} />
      <Tracks m={m} n={n} t={shown} />
      <Under view={view} shown={shown} shot={shot} m={m} n={n} />
      <Steps cars={view.steps} m={m} n={n} />
      {view.speeds && <Speeds m={m} n={n} shot={shot} />}
      <Cars state={state} view={view} handling={handling} m={m} n={n} />
      {view.ways !== undefined && <Ways tapped={view.ways} next={wayTapped(view.next)} />}
      {board && <DerivationBoard x={590} y={266} width={410} {...board} />}
      {cue && <AttentionCue kind="pulse" at={cue} radius={26} />}
    </g>
  );
}
