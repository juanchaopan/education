import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import { Loading } from '../../../shared/ui/Loading';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { StatTiles } from './StatTiles';
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
  childId: string;
  nickname: string;
  // The child's place in the family's list, which picks the avatar's colour.
  place: number;
  totals?: LearningTotals;
  // The record is being read, the first time or again after a failure.
  loading?: boolean;
  failed?: boolean;
  onRetry: () => void;
};

// One child at a glance: how many problems they have tried, how many times
// they finished one on their own and how many after a hint, with the way to
// this child's full record. Finishing after a hint is never counted as
// finishing alone.
export function ChildDigest({ childId, nickname, place, totals, loading, failed, onRetry }: Props) {
  const titleId = `child-digest-${childId}`;
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
      <StandaloneLink to={`/family/learning?child=${encodeURIComponent(childId)}`}>
        <Icon name="chart" />
        看学习记录
      </StandaloneLink>
    </Card>
  );
}

function Totals({ totals }: { totals: LearningTotals }) {
  if (!totals.problems) return <p className={styles.empty}>还没有学习记录。</p>;
  const more = totals.complete ? '' : '+';
  return (
    <StatTiles
      size="large"
      tiles={[
        ['道题', `${totals.problems}${more}`],
        ['次独立完成', `${totals.independent}${more}`],
        ['次提示后完成', `${totals.assisted}${more}`],
      ]}
    />
  );
}
