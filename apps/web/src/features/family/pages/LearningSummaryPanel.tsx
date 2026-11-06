import { useState } from 'react';
import { learningSummaryPageSize } from '@education/contracts';
import { LearningSummaryList } from '../components/LearningSummaryList';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useLearningSummary } from '../data-access/useLearningSummary';
import card from '../components/RegistrationForm.module.css';
import panel from '../components/RegistrationKeyCard.module.css';
import styles from '../components/LearningSummary.module.css';

export function LearningSummaryPanel({ csrf }: { csrf: string }) {
  return (
    <section className={`${card.card} ${panel.panel}`} aria-labelledby="learning-summary-title">
      <h2 id="learning-summary-title">学习摘要</h2>
      <LearningSummaryBody csrf={csrf} />
    </section>
  );
}

function LearningSummaryBody({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const [selection, select] = useState({ childId: '', offset: 0 });
  if (family.isPending) return <p role="status">正在加载孩子列表…</p>;
  if (family.isError)
    return (
      <>
        <p role="alert">暂时无法加载孩子列表。</p>
        <button type="button" onClick={() => void family.refetch()}>
          刷新孩子列表
        </button>
      </>
    );
  const { children } = family.data;
  if (!children.length) return <p>关联孩子账号后，可以在这里查看学习摘要。</p>;
  const childId = children.some(({ id }) => id === selection.childId) ? selection.childId : '';
  return (
    <>
      <div className={styles.picker}>
        <label htmlFor="learning-summary-child">选择孩子</label>
        <select
          id="learning-summary-child"
          value={childId}
          onChange={(event) => select({ childId: event.target.value, offset: 0 })}
        >
          <option value="">请选择</option>
          {children.map(({ id, nickname }) => (
            <option key={id} value={id}>
              {nickname}
            </option>
          ))}
        </select>
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
      {summary.isPending && <p role="status">正在加载学习记录…</p>}
      {summary.isError && <p role="alert">{summary.error.message}</p>}
      {summary.isSuccess && <LearningSummaryList problems={summary.data.problems} />}
      <div className={panel.actions}>
        {offset > 0 && (
          <button type="button" onClick={() => onPage(offset - learningSummaryPageSize)}>
            上一页
          </button>
        )}
        {summary.isSuccess && summary.data.hasMore && (
          <button type="button" onClick={() => onPage(offset + learningSummaryPageSize)}>
            下一页
          </button>
        )}
        <button type="button" disabled={summary.isFetching} onClick={() => void summary.refetch()}>
          刷新学习记录
        </button>
      </div>
    </>
  );
}
