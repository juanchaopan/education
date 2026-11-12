import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { footState } from '../components/foot-state';
import { Panel } from '../components/Panel';
import { PracticeBooks } from '../components/PracticeBooks';
import { ShelfFoot } from '../components/ShelfFoot';
import { usePracticeBooks } from '../data-access/useBookshelf';
import styles from './ChildPracticePanel.module.css';

// The signed-in child's practice: the books a parent gave, ten at a time,
// with every problem in each.
export function ChildPracticePanel({ csrf }: { csrf: string }) {
  const books = usePracticeBooks(csrf);
  const shown = books.data?.pages.flatMap((page) => page.books) ?? [];
  return (
    <Panel titleId="child-practice-title" title="我的练习">
      {books.isPending && <Loading label="正在打开练习…" />}
      {books.isError && !books.data && (
        <div className={styles.failed}>
          <Notice tone="error">{books.error.message}</Notice>
          <Button variant="secondary" onClick={() => void books.refetch()}>
            再试一次
          </Button>
        </div>
      )}
      {books.isSuccess && !shown.length && <p>家长还没有给你安排练习。</p>}
      <PracticeBooks books={shown} />
      {shown.length > 0 && (
        <ShelfFoot state={footState(books)} onMore={() => void books.fetchNextPage()} />
      )}
    </Panel>
  );
}
