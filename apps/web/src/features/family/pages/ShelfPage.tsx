import { useSearchParams } from 'react-router-dom';
import type { ChildAccess } from '@education/contracts';
import { Avatar } from '../../../shared/ui/Avatar';
import { Icon } from '../../../shared/ui/Icon';
import { LinkButton } from '../../../shared/ui/LinkButton';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ShelfChoices } from '../components/ShelfChoices';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { isShelfState, type ShelfFilter } from '../model';
import { ChildBooks, FamilyBooks } from './ShelfBooks';
import styles from './ShelfPage.module.css';

// The open shelf: the library, the family shelf, or one child's, by id.
type View = 'library' | 'family' | ChildAccess;

// The shelf and filter the address names; anything it names that the family
// does not have falls back to the library and to every book.
function viewOf(search: URLSearchParams, family: readonly ChildAccess[]): View {
  const child = family.find(({ id }) => id === search.get('child'));
  if (child) return child;
  return search.get('shelf') === 'family' && family.length ? 'family' : 'library';
}

// A grade or subject name, or nothing for one longer than any name can be.
const label = (value: string | null) => (value && value.length <= 40 ? value : '');

// Only one child's shelf is narrowed by whether the child has the book.
function filterOf(search: URLSearchParams, view: View): ShelfFilter {
  const state = search.get('state');
  return {
    grade: label(search.get('grade')),
    subject: label(search.get('subject')),
    state: typeof view !== 'string' && isShelfState(state) ? state : '',
  };
}

function addressOf(view: View, { grade, subject, state }: ShelfFilter) {
  const search = new URLSearchParams();
  if (view === 'family') search.set('shelf', 'family');
  if (typeof view !== 'string') search.set('child', view.id);
  if (grade) search.set('grade', grade);
  if (subject) search.set('subject', subject);
  if (state) search.set('state', state);
  return search;
}

// The icon of a shelf in the row, on a round tile the size of a child's
// avatar, so the shelves and the children line up.
function ShelfMark({ icon }: { icon: 'library' | 'home' }) {
  return (
    <span className={styles.mark} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}

// Until a child joins, the row of shelves gives way to an invitation.
function Invite() {
  return (
    <div className={styles.invite}>
      <span className={styles.bubble} aria-hidden="true">
        <Icon name="users" />
      </span>
      <p>孩子加入家庭以后，就能给孩子安排书</p>
      <LinkButton to="/family/profile#registration-key-title">
        <Icon name="key" />
        邀请孩子
      </LinkButton>
    </div>
  );
}

// The parent's bookshelf. A row picks the library, the family shelf or one
// child; under it the open shelf with its filters. The shelf and the filters
// live in the address, so a refresh or the back button keeps them, and
// changing either starts the shelf over from its first batch.
export function ShelfPage({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const [search, setSearch] = useSearchParams();
  if (family.isPending) return <Loading label="正在打开书架…" />;
  if (family.isError) return <Notice tone="error">孩子列表没有读出来，请刷新页面。</Notice>;
  const { children } = family.data;
  const view = viewOf(search, children);
  const filter = filterOf(search, view);
  const go = (next: View, nextFilter: ShelfFilter) => setSearch(addressOf(next, nextFilter));
  const onFilter = (next: ShelfFilter) => go(view, next);
  const onShelf = (shelf: 'library' | 'family') => go(shelf, { ...filter, state: '' });
  return (
    <>
      {children.length ? (
        <ShelfChoices
          legend="书架"
          name="shelf"
          look="pill"
          value={typeof view === 'string' ? view : view.id}
          choices={[
            { value: 'library', label: '书库', mark: <ShelfMark icon="library" /> },
            { value: 'family', label: '我的家庭', mark: <ShelfMark icon="home" /> },
            ...children.map((child, place) => ({
              value: child.id,
              label: child.nickname,
              mark: <Avatar name={child.nickname} place={place} />,
              apart: place === 0,
            })),
          ]}
          onChange={(value) =>
            go(
              value === 'library' || value === 'family'
                ? value
                : (children.find(({ id }) => id === value) ?? 'library'),
              { ...filter, state: '' },
            )
          }
        />
      ) : (
        <Invite />
      )}
      {typeof view === 'string' ? (
        <FamilyBooks
          key={view}
          csrf={csrf}
          shelf={view}
          family={children}
          filter={filter}
          onFilter={onFilter}
          onShelf={onShelf}
        />
      ) : (
        <ChildBooks key={view.id} csrf={csrf} child={view} filter={filter} onFilter={onFilter} />
      )}
    </>
  );
}
