import type { ReactNode } from 'react';
import styles from './StatTiles.module.css';

type Props = {
  // Each tile's label and its count, in the order they are shown. The labels
  // are distinct and name the tiles.
  tiles: readonly (readonly [label: string, count: ReactNode])[];
};

// Counts on soft tiles side by side, as many as fit on a problem's tile in
// the learning record, each count above its label. The label comes first in
// the markup, so a screen reader names the count before reading it.
export function StatTiles({ tiles }: Props) {
  return (
    <dl className={styles.tiles}>
      {tiles.map(([label, count]) => (
        <div key={label} className={styles.tile}>
          <dt className={styles.label}>{label}</dt>
          <dd className={styles.count}>{count}</dd>
        </div>
      ))}
    </dl>
  );
}
