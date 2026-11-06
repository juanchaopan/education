import { useState } from 'react';
import { practicePageSize } from '@education/contracts';
import { PracticeList } from '../components/PracticeList';
import { usePractice } from '../data-access/usePractice';
import panel from '../components/RegistrationKeyCard.module.css';

export function PracticePages({ csrf, childId }: { csrf: string; childId?: string }) {
  const [offset, setOffset] = useState(0);
  const query = usePractice(csrf, offset, childId);
  return (
    <>
      {query.isPending && <p role="status">正在打开练习安排…</p>}
      {query.isError && (
        <div>
          <p role="alert">{query.error.message}</p>
          <button type="button" onClick={() => void query.refetch()}>
            重试查看
          </button>
        </div>
      )}
      {query.isSuccess && <PracticeList problems={query.data.problems} learner={!childId} />}
      <div className={panel.actions}>
        {offset > 0 && (
          <button type="button" onClick={() => setOffset(offset - practicePageSize)}>
            上一页练习
          </button>
        )}
        {query.data?.hasMore && (
          <button type="button" onClick={() => setOffset(offset + practicePageSize)}>
            下一页练习
          </button>
        )}
      </div>
    </>
  );
}
