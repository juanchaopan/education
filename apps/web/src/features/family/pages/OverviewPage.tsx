import type { ChildAccess } from '@education/contracts';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Icon } from '../../../shared/ui/Icon';
import { LinkButton } from '../../../shared/ui/LinkButton';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ChildDigest } from '../components/ChildDigest';
import { ParentSection } from '../components/ParentSection';
import { SettingsList } from '../components/SettingsList';
import { useAiConsent } from '../data-access/useAiConsent';
import { useChildrenAssigned } from '../data-access/useBookshelf';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useFamilyOverview } from '../data-access/useLearningSummary';
import { useRegistrationKey } from '../data-access/useRegistrationKey';
import { FamilyCodePanel } from './FamilyCodePanel';
import { AssignedBooks, ReviewIdeas, type ChildActivity } from './OverviewPractice';
import styles from './OverviewPage.module.css';

// The first page of the parent space: the family code and the way to invite a
// child, each child at a glance, the problems worth another try and the
// books already given, then the family's settings.
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

// Each child's card, then what is worth practising again beside what is
// already given. The family's record comes in one reply; each child's books
// are read side by side and kept together with the child. A record read
// again after a failure shows as being read until it arrives, on the cards
// and in the review ideas alike. A child the reply leaves out, such as one
// removed meanwhile, shows that the record could not be read, with a retry.
function FamilyActivity({ csrf, family }: { csrf: string; family: readonly ChildAccess[] }) {
  const childIds = family.map(({ id }) => id);
  const overview = useFamilyOverview(csrf, childIds);
  const books = useChildrenAssigned(csrf, childIds);
  const records = new Map(overview.data?.children.map((record) => [record.id, record]));
  const activity: ChildActivity[] = family.map((child, place) => ({
    child,
    record: records.get(child.id),
    books: books[place]!,
  }));
  const failed = overview.isError && !overview.isFetching;
  const reading = !overview.data && !failed;
  return (
    <>
      <div className={styles.children}>
        {activity.map(({ child, record }, place) => (
          <ChildDigest
            key={child.id}
            childId={child.id}
            nickname={child.nickname}
            place={place}
            totals={record?.total}
            loading={reading}
            failed={failed || (!!overview.data && !record && !overview.isFetching)}
            onRetry={() => void overview.refetch()}
          />
        ))}
      </div>
      <div className={styles.pair}>
        <ReviewIdeas activity={activity} reading={reading} failed={failed} />
        <AssignedBooks csrf={csrf} activity={activity} />
      </div>
    </>
  );
}

function ConsentSettings({ csrf }: { csrf: string }) {
  const { status } = useAiConsent(csrf);
  return <SettingsList consent={status.data} />;
}
