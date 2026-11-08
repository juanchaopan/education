import type { ReactNode } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import { delayStyle } from './stage-look';
import styles from './Prop.module.css';

type PropProps = {
  // Where the prop's middle sits on the stage's world, and how big it is.
  x: number;
  y: number;
  size: number;
  // A prop with a kind is a button the child can tap, drag or reach with the
  // keyboard; `id` tells it apart from others of its kind, `label` names it.
  part?: string;
  id?: string;
  label?: string;
  // Outlined as the next to move.
  highlight?: boolean;
  // Lands on the stage as its scene opens, after `delay` seconds.
  entrance?: boolean;
  delay?: number;
  // Chosen by a tap, or picked up and carried away under the child's finger.
  selected?: boolean;
  lifted?: boolean;
  // The lesson's own drawing of the prop, centred on its middle.
  children: ReactNode;
};

// A prop on the stage. The stage tells the page which one the child tapped by
// its `data-part` and `data-key`; a finger gets a target at least 60 world
// units across however small the prop is drawn.
export function Prop({ x, y, size, part, id, label, highlight, children, ...look }: PropProps) {
  const classes = classNames(
    part && styles.prop,
    look.entrance && styles.entrance,
    look.selected && styles.selected,
    look.lifted && styles.lifted,
  );
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={classes || undefined}
      style={look.delay ? delayStyle(look.delay) : undefined}
      {...(part && {
        'data-part': part,
        'data-key': id,
        role: 'button',
        tabIndex: 0,
        'aria-label': label,
      })}
    >
      {part && <circle r={Math.max(size / 2, 30)} fill="transparent" />}
      {highlight && <circle className={styles.halo} r={size * 0.52} />}
      {children}
    </g>
  );
}

type Ellipse = Readonly<{ rx: number; ry: number; cy?: number }>;

type PlaceProps = {
  // The place's name, which the stage reports when a prop is put on it.
  place: string;
  label: string;
  x: number;
  y: number;
  // Outlined while a prop should go there, brighter while one is dragged over.
  highlight: boolean;
  over: boolean;
  halo: Ellipse;
  // What lies beneath the outline, such as the place's shadow and the area a
  // finger can hit, and the lesson's drawing of the place above it.
  ground?: ReactNode;
  children: ReactNode;
};

// A place props are put on, by dragging one there or tapping a prop and then
// the place.
export function PropPlace({ place, label, x, y, highlight, over, halo, ...art }: PlaceProps) {
  return (
    <g
      className={classNames(styles.place, over && styles.over)}
      data-place={place}
      role="button"
      tabIndex={0}
      aria-label={label}
      transform={`translate(${x} ${y})`}
    >
      {art.ground}
      {highlight && <ellipse className={styles.halo} {...halo} />}
      {art.children}
    </g>
  );
}

// A prop being dragged, drawn as it looks on the stage under the child's
// finger at the stage coordinates of the pointer.
export function DragGhost({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g className={styles.ghost} transform={`translate(${x} ${y})`}>
      {children}
    </g>
  );
}
