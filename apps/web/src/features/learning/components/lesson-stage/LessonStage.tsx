import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
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
  stagingStyle,
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
  // The teacher is saying a line, which its figure shows.
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
  // The controls laid into the picture once the film has started, each in a
  // `StagePlace`, and the conclusion board in its `BoardPlace`.
  controls?: ReactNode;
  // How much of the bottom of the screen an on-screen keyboard covers, which
  // the controls move above.
  keyboard?: number;
  // Starts the film; while it is missing the film is not ready to start yet.
  onEnter?: () => void;
  onActivate: (target: Activation) => void;
  // The lesson's own scene, drawn on the 1200×675 world.
  children?: ReactNode;
};

// Where a control sits in the picture: the tools in the top corner, a notice
// under them, the teacher's subtitle, the answer, the hint, the question
// box, the microphone, and the bottom corner where the microphone would be.
export type Place =
  'tools' | 'notice' | 'subtitle' | 'answer' | 'hint' | 'question' | 'microphone' | 'corner';

// One control laid into the picture, at its place. The stage arranges the
// places for the shape of its frame.
export function StagePlace({ at, children }: { at: Place; children: ReactNode }) {
  return (
    <div className={styles.place} data-at={at}>
      {children}
    </div>
  );
}

// How the conclusion board's place tells the stage its height, which an
// upright frame keeps clear of the props.
const BoardBlock = createContext<(pixels: number) => void>(() => {});

// The conclusion board's place along the top of the picture. While it is on
// screen it tells the stage how tall it is.
export function BoardPlace({ children }: { children: ReactNode }) {
  const report = useContext(BoardBlock);
  const measure = useCallback(
    (place: HTMLDivElement | null) => {
      if (!place || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => report(place.offsetHeight));
      observer.observe(place);
      return () => {
        observer.disconnect();
        report(0);
      };
    },
    [report],
  );
  return (
    <div ref={measure} className={styles.place} data-at="board">
      {children}
    </div>
  );
}

const framing = ({ zoom, x = 0, y = 0 }: Camera) => `scale(${zoom}) translate(${x}%, ${y}%)`;

const painting = ({ image }: StageLook['backdrop']) => `url("${image}")`;

function Painting({ look, shot }: { look: StageLook; shot: string }) {
  const camera = look.cameras?.[shot] ?? establishing;
  return (
    <div className={styles.painting}>
      <div
        className={styles.backdrop}
        style={{
          backgroundImage: painting(look.backdrop),
          backgroundPosition: look.backdrop.focus,
          transform: framing(camera),
        }}
      />
      <div className={styles.light} />
    </div>
  );
}

type EntryProps = Pick<StageLook, 'title' | 'theater'> & Pick<Props, 'entryLabel' | 'onEnter'>;

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

function TeacherFigure({ teacher }: { teacher: Teacher }) {
  return (
    <>
      <ellipse className={styles.ground} {...teacher.ground} />
      <image className={styles.teacher} {...teacher.place} href={teacher.image} />
    </>
  );
}

function Controls({ keyboard = 0, children }: { keyboard?: number; children: ReactNode }) {
  return (
    <div
      className={styles.controls}
      style={{ '--keyboard': `${keyboard}px` } as CSSProperties}
      data-keyboard={keyboard > 0 || undefined}
    >
      {children}
    </div>
  );
}

// The stage's own layout: its palette, where its props stand, and how tall
// the conclusion board is, once there is one.
function useLayout(look: StageLook) {
  const [board, setBoard] = useState(0);
  // The stage redraws on every step of a drag; its palette and layout stay
  // the same.
  const style = useMemo(
    () => ({
      ...paletteStyle(look.palette),
      ...stagingStyle(look.staging),
      ...(board > 0 && { '--board-block': `${board}px` }),
    }),
    [look.palette, look.staging, board],
  );
  return { style: style as CSSProperties, reportBoard: setBoard };
}

// A lesson as a short film that fills the screen: a painted backdrop framed
// for each scene, the lesson's own props as vector art in front, and the
// teacher. The title card opens it; afterwards the controls are laid into the
// picture's edges. A wide frame is filled by the backdrop and the world as
// one picture, so the props stand where the painting expects them. An
// upright frame is filled by the painting alone, and the props, without the
// teacher, are fitted to its width and to the height the controls leave. The
// stage reports which prop or place the child chose; the page decides what
// that does.
export function LessonStage(props: Props) {
  const { look, shot, speaking, failure, worldRef, onActivate } = props;
  const layout = useLayout(look);
  const opening = shot === 'opening';
  const choose = (event: MouseEvent | KeyboardEvent) => {
    const target = activationAt(event.target);
    if (target) onActivate(target);
  };
  return (
    <section
      className={classNames(styles.stage, speaking && styles.speaking)}
      style={layout.style}
      data-shot={shot}
      data-narration-failure={failure}
      aria-label={look.label}
    >
      <div className={styles.canvas}>
        <div className={styles.surround} style={{ backgroundImage: painting(look.backdrop) }} />
        <Painting look={look} shot={shot} />
        <div className={styles.picture}>
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
        <BoardBlock value={layout.reportBoard}>
          <Controls keyboard={props.keyboard}>{props.controls}</Controls>
        </BoardBlock>
      )}
    </section>
  );
}
