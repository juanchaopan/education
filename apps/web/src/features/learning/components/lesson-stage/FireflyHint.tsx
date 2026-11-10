import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import styles from './FireflyHint.module.css';

type Props = {
  // How many hints are still to be had.
  left: number;
  // A hint can be asked for now.
  ready: boolean;
  onHint: () => void;
};

// Where the fireflies float inside the drop, the first three of those left.
const places = [
  { x: 9, y: 13 },
  { x: 15, y: 9.5 },
  { x: 14.5, y: 15.5 },
] as const;

function Fireflies({ count }: { count: number }) {
  return (
    <svg className={styles.fireflies} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {places.slice(0, count).map(({ x, y }) => (
        <g key={`${x}-${y}`} className={styles.firefly} transform={`translate(${x} ${y})`}>
          <circle className={styles.glow} r="3.2" />
          <ellipse className={styles.wing} cx="-1.1" cy="-1.4" rx="1.3" ry="0.8" />
          <ellipse className={styles.wing} cx="1.1" cy="-1.4" rx="1.3" ry="0.8" />
          <circle className={styles.body} r="1.25" />
        </g>
      ))}
    </svg>
  );
}

// The hint drop: glass with as many fireflies inside as there are hints left,
// and the number of them on its shoulder. Each tap lets one firefly go, as one
// more hint, which the teacher then says. Once none are left the drop stays,
// empty and fogged, so the child sees the hints are used up.
export function FireflyHint({ left, ready, onHint }: Props) {
  return (
    <Dewdrop
      art={<Fireflies count={left} />}
      label={left ? `给我一个提示，还有 ${left} 个` : '提示用完了'}
      badge={left || undefined}
      disabled={!ready || !left}
      onClick={onHint}
    />
  );
}
