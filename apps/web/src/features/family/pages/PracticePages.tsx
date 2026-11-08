import { useState } from 'react';
import { practicePageSize } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { PracticeList } from '../components/PracticeList';
import { usePractice } from '../data-access/usePractice';

export function PracticePages({ csrf, childId }: { csrf: string; childId?: string }) {
  const [offset, setOffset] = useState(0);
  const query = usePractice(csrf, offset, childId);
  return (
    <>
      {query.isPending && <Loading label="正在打开练习安排…" />}
      {query.isError && (
        <div>
          <p role="alert">{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>重试查看</Button>
        </div>
      )}
      {query.isSuccess && <PracticeList problems={query.data.problems} learner={!childId} />}
      <Actions>
        {offset > 0 && (
          <Button onClick={() => setOffset(offset - practicePageSize)}>上一页练习</Button>
        )}
        {query.data?.hasMore && (
          <Button onClick={() => setOffset(offset + practicePageSize)}>下一页练习</Button>
        )}
      </Actions>
    </>
  );
}
