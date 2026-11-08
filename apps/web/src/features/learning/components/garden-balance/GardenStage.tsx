import type { KeyboardEvent, MouseEvent, Ref } from 'react';
import {
  activationAt,
  type Activation,
  type Handling,
  type StageGhost,
} from '../../interaction/useStageDrag';
import rabbit from '../../lessons/garden-balance/assets/garden-rabbit.webp';
import type { GardenState } from '../../lessons/garden-balance/garden-story';
import { Fireflies, SpriteUse } from './garden-art';
import { GardenDefs } from './garden-defs';
import { ExchangeScene, SwapScene, WeighScene } from './garden-scenes';
import type { MovableLook } from './movable-props';
import styles from './GardenStage.module.css';

type Props = {
  state: GardenState;
  handling: Handling;
  ghost?: StageGhost<MovableLook>;
  caption?: string;
  speaking: boolean;
  // Phones in portrait see the scale and the basket, cropped from the sides.
  narrow: boolean;
  entryLabel: string;
  worldRef?: Ref<SVGSVGElement>;
  // Starts the film; while it is missing the film is not ready to start yet.
  onEnter?: () => void;
  onReplay: () => void;
  onActivate: (target: Activation) => void;
};

const title = '一棵青菜有多重？';

// The paints, symbols and fireflies never change, so React leaves them alone
// while a prop is dragged across the scene.
const defs = <GardenDefs />;
const fireflies = <Fireflies />;

function Scene({ state, handling }: { state: GardenState; handling: Handling }) {
  if (state.shot === 'leaves' || state.shot === 'apples')
    return <WeighScene state={state} handling={handling} />;
  if (state.shot === 'exchange') return <ExchangeScene state={state} />;
  if (state.shot === 'opening') return null;
  return <SwapScene state={state} />;
}

type OverlayProps = Pick<Props, 'entryLabel' | 'onEnter' | 'onReplay' | 'speaking'> & {
  opening: boolean;
};

function Overlay({ opening, entryLabel, speaking, onEnter, onReplay }: OverlayProps) {
  if (opening)
    return (
      <div className={styles.filmTitle}>
        <small>小小探索家 · 菜园小剧场</small>
        <h2>{title}</h2>
        <button type="button" className={styles.entry} onClick={onEnter} disabled={!onEnter}>
          <i aria-hidden="true">▶</i> {entryLabel}
        </button>
      </div>
    );
  return (
    <>
      <div className={styles.filmMeta} aria-hidden="true">
        <span>菜园小剧场</span>
        <i />
        <span>{title}</span>
      </div>
      <button
        type="button"
        className={[styles.replay, speaking && styles.playing].filter(Boolean).join(' ')}
        aria-label="重听这一句"
        onClick={onReplay}
      >
        ♪
      </button>
    </>
  );
}

// The garden as a short film: a painted plate behind, the props as vector art
// in front, and the rabbit's caption. The scene reports which prop or place the
// child chose; the page decides what that does.
export function GardenStage(props: Props) {
  const { state, handling, ghost, caption, speaking, narrow, worldRef, onActivate } = props;
  const choose = (event: MouseEvent | KeyboardEvent) => {
    const target = activationAt(event.target);
    if (target) onActivate(target);
  };
  return (
    <section
      className={[styles.film, speaking && styles.speaking].filter(Boolean).join(' ')}
      data-shot={state.shot}
      aria-label="菜园天平互动短片"
    >
      <div className={styles.plate} />
      <div className={styles.light} />
      <div className={styles.vignette} />
      <svg
        ref={worldRef}
        className={styles.world}
        viewBox={narrow ? '145 0 910 675' : '0 0 1200 675'}
        role="group"
        aria-label="可互动的菜园道具"
        onClick={choose}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          choose(event);
        }}
      >
        {defs}
        {fireflies}
        <g key={state.shot} className={styles.sceneArt}>
          {state.shot !== 'opening' && (
            <>
              <ellipse cx="262" cy="472" rx="75" ry="13" fill="#2a2b19" opacity=".22" />
              <image
                className={styles.rabbit}
                x="174"
                y="210"
                width="194"
                height="271"
                href={rabbit}
              />
            </>
          )}
          <Scene state={state} handling={handling} />
        </g>
        {ghost && (
          <g className={styles.ghost} transform={`translate(${ghost.x} ${ghost.y})`}>
            <SpriteUse sprite={ghost.sprite} size={ghost.size} />
          </g>
        )}
      </svg>
      <Overlay
        opening={state.shot === 'opening'}
        entryLabel={props.entryLabel}
        speaking={speaking}
        onEnter={props.onEnter}
        onReplay={props.onReplay}
      />
      <p className={styles.caption} role="status" hidden={!caption}>
        {caption}
      </p>
    </section>
  );
}
