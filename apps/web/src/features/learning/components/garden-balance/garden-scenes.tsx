import type { Handling } from '../../interaction/stage-activation';
import {
  cucumbersPerApple,
  tilt,
  type GardenState,
} from '../../lessons/garden-balance/garden-story';
import { Basket, BoardText, Part, Scale, Spark, type PartProps } from './garden-art';
import { movableProps } from './movable-props';
import styles from './garden-art.module.css';

type SceneProps = { state: GardenState; handling: Handling };

function held(id: string, { selected, lifted }: Handling): Partial<PartProps> {
  return { id, selected: selected === id, lifted: lifted === id };
}

const appleSpots = [
  [-55, -18],
  [0, -18],
  [55, -18],
  [-44, -62],
  [12, -62],
  [59, -62],
] as const;

// Cabbages against apples: the child lifts one cabbage into the basket, then
// apples until the beam is level.
function WeighScene({ state, handling }: SceneProps) {
  const { shot, leaves, apples } = state;
  const weighing = shot === 'leaves';
  const removing = shot === 'apples' && apples > 3;
  const { leaf, apple } = movableProps;
  const left =
    leaves === 2 ? (
      <>
        <Part
          {...leaf}
          x={-43}
          y={-29}
          entrance
          highlight={weighing}
          {...(weighing && { part: 'leaf', label: '青菜', ...held('leaf-0', handling) })}
        />
        <Part
          {...leaf}
          x={39}
          y={-29}
          entrance
          {...(weighing && { part: 'leaf', label: '青菜', ...held('leaf-1', handling) })}
        />
      </>
    ) : (
      <Part sprite="garden-cabbage" x={0} y={-27} size={78} />
    );
  const right = appleSpots
    .slice(0, apples)
    .map(([x, y], i) => (
      <Part
        key={`apple-${x}-${y}`}
        {...apple}
        x={x}
        y={y}
        entrance={weighing}
        highlight={removing && i === apples - 1}
        {...(removing && { part: 'apple', label: '苹果', ...held(`apple-${i}`, handling) })}
      />
    ));
  return (
    <>
      <Scale left={left} right={right} tilt={tilt(state)} />
      <Basket highlight={apples > 3} over={handling.over === 'basket'} />
      {apples > 3 &&
        (weighing ? (
          <Spark from={[438, 274]} to={[938, 408]} />
        ) : (
          <Spark from={[823, 271]} to={[938, 397]} />
        ))}
    </>
  );
}

const cucumberSpots = [-53, 0, 53];

// One apple on the scale; touching it shows the three cucumbers it weighs.
function ExchangeScene({ state }: { state: GardenState }) {
  const { revealed } = state;
  const left = (
    <Part
      sprite="garden-apple"
      x={0}
      y={-32}
      size={91}
      entrance
      highlight={!revealed}
      {...(!revealed && { part: 'exchange', id: 'exchange', label: '苹果' })}
    />
  );
  const right =
    revealed &&
    cucumberSpots.map((x, i) => (
      <Part
        key={`cucumber-${x}`}
        sprite="garden-cucumber"
        x={x}
        y={-23}
        size={74}
        entrance
        delay={0.09 * i}
      />
    ));
  return (
    <>
      <Scale left={left} right={right} tilt={tilt(state)} />
      {!revealed && <Spark from={[423, 223]} to={[477, 282]} />}
    </>
  );
}

const groupSpots = [-58, 0, 58];

function CucumberGroup({ x, count, fresh }: { x: number; count: number; fresh: boolean }) {
  return (
    <g className={fresh ? styles.swapIn : undefined}>
      <rect
        x={x - 26}
        y={-63}
        width={52}
        height={64}
        rx={11}
        fill="#a0c47842"
        stroke="#e4dea0"
        strokeWidth={1.8}
      />
      {Array.from({ length: count }, (_, j) => (
        <Part
          key={`cucumber-${x}-${-45 + j * 13}`}
          sprite="garden-cucumber"
          x={x}
          y={-45 + j * 13}
          size={47}
        />
      ))}
    </g>
  );
}

function SpareCucumbers() {
  return (
    <g transform="translate(978 414)">
      <use href="#garden-basket" x="-75" y="-58" width="150" height="112" />
      <Part sprite="garden-cucumber" x={-14} y={-28} size={54} />
      <Part sprite="garden-cucumber" x={15} y={-33} size={54} />
      <BoardText x={0} y={61} size={20}>
        一个苹果换两根
      </BoardText>
    </g>
  );
}

// One cabbage against the three apples it weighs; each apple in turn becomes
// its group of cucumbers, three each in the problem and two in the variation.
function SwapScene({ state }: { state: GardenState }) {
  const { shot, replaced } = state;
  const swapping = shot === 'bridge' || shot === 'variation';
  const next = groupSpots[replaced];
  const right = groupSpots.map((x, i) =>
    i < replaced ? (
      <CucumberGroup
        key={`group-${x}`}
        x={x}
        count={cucumbersPerApple(shot)}
        fresh={i === replaced - 1}
      />
    ) : (
      <Part
        key={`apple-${x}`}
        sprite="garden-apple"
        x={x}
        y={-20}
        size={54}
        highlight={swapping && i === replaced}
        {...(swapping &&
          i === replaced && { part: 'replace', id: `replace-${i}`, label: '把这个苹果换成黄瓜' })}
      />
    ),
  );
  return (
    <>
      <Scale
        left={<Part sprite="garden-cabbage" x={0} y={-32} size={87} />}
        right={right}
        tilt={0}
      />
      {swapping && next !== undefined && <Spark from={[817 + next, 232]} to={[817 + next, 285]} />}
      {(shot === 'variation' || shot === 'end') && <SpareCucumbers />}
      {shot === 'end' && (
        <>
          <rect
            x="505"
            y="495"
            width="310"
            height="48"
            rx="18"
            fill="url(#garden-paper)"
            stroke="#95572f"
            strokeWidth="2"
          />
          <BoardText x={660} y={526} size={22}>
            组数一样，每组的根数变了
          </BoardText>
        </>
      )}
    </>
  );
}

// The garden scene on the lesson stage: the scale halved and weighed, the
// single apple and its cucumbers, then the swaps. The title card shows none.
export function GardenScene({ state, handling }: SceneProps) {
  if (state.shot === 'leaves' || state.shot === 'apples')
    return <WeighScene state={state} handling={handling} />;
  if (state.shot === 'exchange') return <ExchangeScene state={state} />;
  if (state.shot === 'opening') return null;
  return <SwapScene state={state} />;
}
