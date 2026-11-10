import type { ChildAccess } from '@education/contracts';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Icon } from '../../../shared/ui/Icon';
import { LinkButton } from '../../../shared/ui/LinkButton';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ChildDigest, type LearningTotals } from '../components/ChildDigest';
import { ParentSection } from '../components/ParentSection';
import { SettingsList } from '../components/SettingsList';
import { useAiConsent } from '../data-access/useAiConsent';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useChildRecords, type ChildRecord } from '../data-access/useLearningSummary';
import { useChildrenPractice } from '../data-access/usePractice';
import { useRegistrationKey } from '../data-access/useRegistrationKey';
import { FamilyCodePanel } from './FamilyCodePanel';
import { AssignedPractice, ReviewIdeas, type ChildActivity } from './OverviewPractice';
import styles from './OverviewPage.module.css';

// The first page of the parent space: the family code and the way to invite a
// child, each child at a glance, the problems worth another try and the
// practice already planned, then the family's settings.
export function OverviewPage({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const registration = useRegistrationKey(csrf);
  return (
    <ParentSection
      titleId="overview-title"
      title="总览"
      actions={
        <>
          <FamilyCodePanel
            code={registration.data?.familyCode}
            loading={registration.isPending}
            failed={registration.isError}
          />
          <LinkButton to="/family/children#registration-key-title">
            <Icon name="key" />
            邀请孩子
          </LinkButton>
        </>
      }
    >
      {family.isPending && <Loading label="正在加载孩子列表…" />}
      {family.isError && <Notice tone="error">孩子列表没有读出来，请刷新页面。</Notice>}
      {family.isSuccess &&
        (family.data.children.length ? (
          <FamilyActivity csrf={csrf} family={family.data.children} />
        ) : (
          <EmptyState
            icon="users"
            title="还没有孩子"
            description="点「邀请孩子」生成注册 KEY，孩子用它加入家庭。"
          />
        ))}
      <ConsentSettings csrf={csrf} />
    </ParentSection>
  );
}

function totalsOf({ problems, complete }: ChildRecord): LearningTotals {
  const sum = (count: (problem: ChildRecord['problems'][number]) => number) =>
    problems.reduce((total, problem) => total + count(problem), 0);
  return {
    problems: problems.length,
    independent: sum((problem) => problem.independent),
    assisted: sum((problem) => problem.assisted),
    complete,
  };
}

// Each child's card, then what is worth practising again beside what is
// already planned. Every child's record and practice are read side by side,
// and each child is kept together with its own record and practice.
function FamilyActivity({ csrf, family }: { csrf: string; family: readonly ChildAccess[] }) {
  const ids = family.map(({ id }) => id);
  const records = useChildRecords(csrf, ids);
  const practice = useChildrenPractice(csrf, ids);
  const activity: ChildActivity[] = family.map((child, place) => ({
    child,
    record: records[place]!,
    practice: practice[place]!,
  }));
  return (
    <>
      <div className={styles.children}>
        {activity.map(({ child, record }, place) => (
          <ChildDigest
            key={child.id}
            nickname={child.nickname}
            place={place}
            totals={record.data && totalsOf(record.data)}
            loading={record.isPending}
            failed={record.isError}
            onRetry={() => void record.refetch()}
          />
        ))}
      </div>
      <div className={styles.pair}>
        <ReviewIdeas csrf={csrf} activity={activity} />
        <AssignedPractice activity={activity} />
      </div>
    </>
  );
}

function ConsentSettings({ csrf }: { csrf: string }) {
  const { status } = useAiConsent(csrf);
  return <SettingsList consent={status.data} />;
}
