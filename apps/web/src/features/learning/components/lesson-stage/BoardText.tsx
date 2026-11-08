import styles from './BoardText.module.css';

type BoardTextProps = { x: number; y: number; size?: number; children: string };

// Writing on a board or a label in the scene, centred on its point, in the
// stage's board ink.
export function BoardText({ x, y, size = 21, children }: BoardTextProps) {
  return (
    <text className={styles.board} x={x} y={y} textAnchor="middle" fontWeight="850" fontSize={size}>
      {children}
    </text>
  );
}
