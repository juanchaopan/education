import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { learningSummaryPageSize } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { SelectField } from '../../../shared/ui/SelectField';
import { LearningSummaryList } from '../components/LearningSummaryList';
import { Panel } from '../components/Panel';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useLearningSummary } from '../data-access/useLearningSummary';
import styles from '../components/LearningSummary.module.css';

// One child's learning record at a time, a page of problems at a time. An
// address that names a child after "?child=", as a child's card on the
// overview links, opens on that child's record.
export function LearningSummaryPanel({ csrf }: { csrf: string }) {
  return (
    <Panel titleId="learning-summary-title" title="学习摘要">
      <LearningSummaryBody csrf={csrf} />
    </Panel>
  );
}

function LearningSummaryBody({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const [search] = useSearchParams();
  const [selection, select] = useState({ childId: search.get('child') ?? '', offset: 0 });
  if (family.isPending) return <Loading label="正在加载孩子列表…" />;
  if (family.isError)
    return (
      <>
        <p role="alert">暂时无法加载孩子列表。</p>
        <Button onClick={() => void family.refetch()}>刷新孩子列表</Button>
      </>
    );
  const { children } = family.data;
  if (!children.length) return <p>关联孩子账号后，可以在这里查看学习摘要。</p>;
  const childId = children.some(({ id }) => id === selection.childId) ? selection.childId : '';
  return (
    <>
      <div className={styles.picker}>
        <SelectField
          id="learning-summary-child"
          label="选择孩子"
          value={childId}
          onChange={(event) => select({ childId: event.target.value, offset: 0 })}
        >
          <option value="">请选择</option>
          {children.map(({ id, nickname }) => (
            <option key={id} value={id}>
              {nickname}
            </option>
          ))}
        </SelectField>
      </div>
      {childId && (
        <SummaryPage
          csrf={csrf}
          childId={childId}
          offset={selection.offset}
          onPage={(offset) => select({ childId, offset })}
        />
      )}
    </>
  );
}

function SummaryPage({
  csrf,
  childId,
  offset,
  onPage,
}: {
  csrf: string;
  childId: string;
  offset: number;
  onPage: (offset: number) => void;
}) {
  const summary = useLearningSummary(csrf, childId, offset);
  return (
    <>
      {summary.isPending && <Loading label="正在加载学习记录…" />}
      {summary.isError && <p role="alert">{summary.error.message}</p>}
      {summary.isSuccess && <LearningSummaryList problems={summary.data.problems} />}
      <Actions>
        {offset > 0 && (
          <Button onClick={() => onPage(offset - learningSummaryPageSize)}>上一页</Button>
        )}
        {summary.isSuccess && summary.data.hasMore && (
          <Button onClick={() => onPage(offset + learningSummaryPageSize)}>下一页</Button>
        )}
        <Button disabled={summary.isFetching} onClick={() => void summary.refetch()}>
          刷新学习记录
        </Button>
      </Actions>
    </>
  );
}
