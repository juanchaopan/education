import { useNavigate } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ChildAccess, ChildOverview, ChildShelfPage } from '@education/contracts';
import { problemPath } from '../../../shared/lib/problem-path';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Hint } from '../../../shared/ui/Hint';
import { Icon } from '../../../shared/ui/Icon';
import { IconLink } from '../../../shared/ui/IconLink';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { BookRows, ChildBooksLinks, type BookRow } from '../components/BookRows';
import { ParentCard } from '../components/ParentCard';
import { ProblemRows, type ProblemRow } from '../components/ProblemRows';
import { useBookToggles, type BookFailure } from '../data-access/useBookshelf';

// A child with its part of the family overview, once read, and the first
// page of the books it has.
export type ChildActivity = {
  child: ChildAccess;
  record?: ChildOverview;
  books: UseQueryResult<ChildShelfPage>;
};

// The overview shows the first few books given; each child's link opens all
// of that child's books.
const shownBooks = 5;
const library = '/family/practice';
const childBooks = (childId: string) =>
  `/family/practice?child=${encodeURIComponent(childId)}&state=assigned`;

// Problems a child answered wrongly and has not yet finished alone, as the
// server marks them. A record that could not be read is said to have failed
// rather than to hold nothing.
export function ReviewIdeas({
  activity,
  reading,
  failed,
}: {
  activity: readonly ChildActivity[];
  reading: boolean;
  failed: boolean;
}) {
  const rows: ProblemRow[] = activity.flatMap(({ child, record }) =>
    (record?.review ?? []).map(({ id, version, title, incorrect }) => ({
      key: `${child.id}/${problemPath(id, version)}`,
      title,
      detail: `${child.nickname} · 答错 ${incorrect} 次`,
    })),
  );
  return (
    <ParentCard titleId="review-ideas-title" icon="bulb" title="值得再练">
      <Hint>答错过、还没有独立完成的题。</Hint>
      {reading && <Loading label="正在读取学习记录…" />}
      {failed && <Notice tone="error">有的学习记录没有读出来，请刷新页面。</Notice>}
      {!reading && !failed && !rows.length && <p>暂时没有。</p>}
      <ProblemRows icon="bulb" rows={rows} />
    </ParentCard>
  );
}

// Each child's books as rows, taken in turn one child at a time, so the
// first few shown include every child's books rather than all of one
// child's. A book that is unavailable offers to take it back instead of its
// progress.
type TakeBack = Readonly<{
  press: (childId: string, bookId: string) => void;
  pending: (childId: string, bookId: string) => boolean;
}>;

function booksInTurn(activity: readonly ChildActivity[], takeBack: TakeBack): BookRow[] {
  const lists = activity.map(({ child, books }) =>
    (books.data?.books ?? []).map((book) => {
      const unavailable = book.status === 'unavailable';
      return {
        key: `${child.id}/${book.id}`,
        book,
        detail: `${child.nickname} · ${unavailable ? '暂时不可用' : `${book.grade}${book.subject}`}`,
        done: book.done,
        action: unavailable ? (
          <Button
            variant="secondary"
            aria-label={`取消给${child.nickname}安排《${book.name}》`}
            disabled={takeBack.pending(child.id, book.id)}
            onClick={() => takeBack.press(child.id, book.id)}
          >
            <Icon name="close" />
            取消
          </Button>
        ) : undefined,
      };
    }),
  );
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, turn) =>
    lists.flatMap((list) => list.slice(turn, turn + 1)),
  ).flat();
}

// Which child's book a change that did not go through was for, and why.
function failureWords(activity: readonly ChildActivity[], failure: BookFailure) {
  const found = activity.find(({ child }) => child.id === failure.childId);
  const book = found?.books.data?.books.find(({ id }) => id === failure.bookId);
  return found && book
    ? `${found.child.nickname}《${book.name}》：${failure.message}`
    : failure.message;
}

// The books given to the children, the first few of them, and a link to
// each child's books.
export function AssignedBooks({
  csrf,
  activity,
}: {
  csrf: string;
  activity: readonly ChildActivity[];
}) {
  const navigate = useNavigate();
  const toggles = useBookToggles(csrf);
  const rows = booksInTurn(activity, {
    press: (childId, bookId) => void toggles.toggle({ childId, bookId, assign: false }),
    pending: toggles.isPending,
  }).slice(0, shownBooks);
  const failure = toggles.failure && failureWords(activity, toggles.failure);
  const reading = activity.some(({ books }) => books.isPending);
  const failed = activity.some(({ books }) => books.isError);
  const links = activity.flatMap(({ child, books }, place) =>
    books.data?.total
      ? [{ childId: child.id, nickname: child.nickname, place, count: books.data.total }]
      : [],
  );
  return (
    <ParentCard
      titleId="assigned-books-title"
      icon="calendar"
      title="已安排"
      action={<IconLink to={library} icon="plus" label="去书库挑书" />}
    >
      {reading && <Loading label="正在读取安排的书…" />}
      {failed && <Notice tone="error">有的孩子安排的书没有读出来，请刷新页面。</Notice>}
      {!reading && !failed && !rows.length && (
        <EmptyState
          icon="library"
          title="还没有安排书"
          description="在书库里挑书，安排给孩子。"
          actionLabel="去书库挑书"
          onAction={() => void navigate(library)}
        />
      )}
      <BookRows rows={rows} />
      {failure && <Notice tone="error">{failure}</Notice>}
      {links.length > 0 && <ChildBooksLinks links={links} to={childBooks} />}
    </ParentCard>
  );
}
