import {
  useMemo,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import { Icon } from '../../../../shared/ui/Icon';
import { activationAt, type Activation } from '../../interaction/stage-activation';
import {
  establishing,
  paletteStyle,
  world,
  type Camera,
  type StageLook,
  type Teacher,
} from './stage-look';
import styles from './LessonStage.module.css';

type Props = {
  look: StageLook;
  // The scene on screen; `opening` is the title card.
  shot: string;
  caption?: string;
  speaking: boolean;
  // Why the line on screen did not come out, while it waits to be heard again.
  failure?: string;
  entryLabel: string;
  worldRef?: Ref<SVGSVGElement>;
  // The lesson's paints and symbols, and what drifts over its scenes. Both
  // stay the same while the film plays, so React leaves them alone.
  defs?: ReactNode;
  ambience?: ReactNode;
  // The prop under the child's finger while it is dragged.
  ghost?: ReactNode;
  // Starts the film; while it is missing the film is not ready to start yet.
  onEnter?: () => void;
  onReplay: () => void;
  onActivate: (target: Activation) => void;
  // The lesson's own scene, drawn on the 1200×675 world.
  children?: ReactNode;
};

// The picture takes its shape from the world every lesson draws on, so the
// painting and the props always share one size.
const worldShape = {
  '--world-width': world.width,
  '--world-height': world.height,
} as CSSProperties;

const framing = ({ zoom, x = 0, y = 0 }: Camera) => `scale(${zoom}) translate(${x}%, ${y}%)`;

const painting = ({ image }: StageLook['backdrop']) => `url("${image}")`;

function Backdrop({ look, shot }: { look: StageLook; shot: string }) {
  const camera = look.cameras?.[shot] ?? establishing;
  return (
    <div
      className={styles.backdrop}
      style={{
        backgroundImage: painting(look.backdrop),
        backgroundPosition: look.backdrop.focus,
        transform: framing(camera),
      }}
    />
  );
}

type TitleProps = Pick<StageLook, 'title' | 'theater'>;
type EntryProps = TitleProps & Pick<Props, 'entryLabel' | 'onEnter'>;

function TitleCard({ title, theater, entryLabel, onEnter }: EntryProps) {
  return (
    <div className={styles.titleCard}>
      <small>小小探索家 · {theater}</small>
      <h2>{title}</h2>
      <button type="button" className={styles.entry} onClick={onEnter} disabled={!onEnter}>
        <Icon name="play" className={styles.entryMark} /> {entryLabel}
      </button>
    </div>
  );
}

function TitleBar({ title, theater }: TitleProps) {
  return (
    <div className={styles.titleBar} aria-hidden="true">
      <span>{theater}</span>
      <i />
      <span>{title}</span>
    </div>
  );
}

type ReplayProps = Pick<Props, 'onReplay' | 'speaking'> & { again: boolean };

// Hearing the line again: a small button with the replay icon while all is
// well, and one that says so in words while a line that did not come out
// waits for the child.
function ReplayButton({ again, speaking, onReplay }: ReplayProps) {
  return (
    <button
      type="button"
      className={classNames(styles.replay, speaking && styles.playing, again && styles.again)}
      aria-label={again ? undefined : '重听这一句'}
      onClick={onReplay}
    >
      <Icon name="replay" />
      {again && ' 再听一次'}
    </button>
  );
}

function TeacherFigure({ teacher }: { teacher: Teacher }) {
  return (
    <>
      <ellipse className={styles.ground} {...teacher.ground} />
      <image className={styles.teacher} {...teacher.place} href={teacher.image} />
    </>
  );
}

// A lesson as a short film: a painted backdrop framed for each scene, the
// lesson's own props as vector art in front, the teacher and its caption. The
// title card opens it; afterwards the title bar runs along the top and the
// replay button stays in the top right. The stage fills whatever frame it is
// given: the backdrop and the world share one picture, so the props always
// stand where the painting expects them, as large as the frame allows, and
// the painting, softly blurred, fills the rest. The stage reports which prop
// or place the child chose; the page decides what that does.
export function LessonStage(props: Props) {
  const { look, shot, caption, speaking, failure, worldRef, onActivate } = props;
  // The stage redraws on every step of a drag; its palette stays the same.
  const palette = useMemo(() => paletteStyle(look.palette), [look.palette]);
  const opening = shot === 'opening';
  const choose = (event: MouseEvent | KeyboardEvent) => {
    const target = activationAt(event.target);
    if (target) onActivate(target);
  };
  return (
    <section
      className={classNames(styles.stage, speaking && styles.speaking)}
      style={palette}
      data-shot={shot}
      data-narration-failure={failure}
      aria-label={look.label}
    >
      <div className={styles.surround} style={{ backgroundImage: painting(look.backdrop) }} />
      <div className={styles.picture} style={worldShape}>
        <Backdrop look={look} shot={shot} />
        <div className={styles.light} />
        <svg
          ref={worldRef}
          className={styles.world}
          viewBox={`${world.x} ${world.y} ${world.width} ${world.height}`}
          role="group"
          aria-label={look.worldLabel}
          onClick={choose}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            choose(event);
          }}
        >
          {props.defs}
          {props.ambience}
          <g key={shot} className={styles.scene}>
            {!opening && <TeacherFigure teacher={look.teacher} />}
            {props.children}
          </g>
          {props.ghost}
        </svg>
      </div>
      <div className={styles.vignette} />
      {opening ? (
        <TitleCard
          title={look.title}
          theater={look.theater}
          entryLabel={props.entryLabel}
          onEnter={props.onEnter}
        />
      ) : (
        <>
          <TitleBar title={look.title} theater={look.theater} />
          <ReplayButton
            again={failure !== undefined}
            speaking={speaking}
            onReplay={props.onReplay}
          />
        </>
      )}
      <p
        className={styles.caption}
        data-speaker={look.teacher.name}
        role="status"
        hidden={!caption}
      >
        {caption}
      </p>
    </section>
  );
}
