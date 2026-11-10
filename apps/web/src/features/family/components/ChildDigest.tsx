import { useId } from 'react';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import { Loading } from '../../../shared/ui/Loading';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import styles from './ChildDigest.module.css';

// A child's record added up over every problem they have tried. A record
// read only in part says so with a "+" rather than passing for the whole.
export type LearningTotals = {
  problems: number;
  independent: number;
  assisted: number;
  complete: boolean;
};

type Props = {
  nickname: string;
  // The child's place in the family's list, which picks the avatar's colour.
  place: number;
  totals?: LearningTotals;
  loading?: boolean;
  failed?: boolean;
  onRetry: () => void;
};

// One child at a glance: how many problems they have tried, how many times
// they finished one on their own and how many after a hint. Finishing after
// a hint is never counted as finishing alone.
export function ChildDigest({ nickname, place, totals, loading, failed, onRetry }: Props) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId} className={styles.card}>
      <h2 id={titleId} className={styles.name}>
        <Avatar name={nickname} place={place} />
        <span className={styles.nickname}>{nickname}</span>
      </h2>
      {loading && <Loading label={`正在读取${nickname}的学习记录…`} />}
      {failed && (
        <p role="alert" className={styles.failed}>
          学习记录没有读出来。
          <Button variant="text" onClick={onRetry}>
            重试
          </Button>
        </p>
      )}
      {totals && <Totals totals={totals} />}
      <StandaloneLink to="/family/learning">
        <Icon name="chart" />
        看学习记录
      </StandaloneLink>
    </Card>
  );
}

function Totals({ totals }: { totals: LearningTotals }) {
  if (!totals.problems) return <p className={styles.empty}>还没有学习记录。</p>;
  const more = totals.complete ? '' : '+';
  const tiles = [
    ['道题', totals.problems],
    ['次独立完成', totals.independent],
    ['次提示后完成', totals.assisted],
  ] as const;
  return (
    <dl className={styles.tiles}>
      {tiles.map(([label, count]) => (
        <div key={label} className={styles.tile}>
          <dt className={styles.label}>{label}</dt>
          <dd className={styles.count}>
            {count}
            {more}
          </dd>
        </div>
      ))}
    </dl>
  );
}
