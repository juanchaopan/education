import type { ChildBook } from '@education/contracts';

const dayLength = 24 * 60 * 60 * 1000;

// Whole calendar days, on this device's clock, from one moment to a later one.
function daysBetween(earlier: Date, later: Date) {
  const start = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const end = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / dayLength));
}

// How long ago, in the words a child uses: 今天, 昨天, 3 天前, 上周, 2 周前,
// 1 个月前.
export function ago(days: number) {
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 14) return '上周';
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 个月前`;
}

// The last words under a book's title: when a new book was given, when the
// child last studied the book, or that the child has opened it but not yet
// answered anything in it.
export function bookWhen(book: Pick<ChildBook, 'fresh' | 'assignedAt' | 'studiedAt'>, now: Date) {
  if (book.fresh) {
    const days = daysBetween(new Date(book.assignedAt), now);
    return days === 0 ? '刚刚安排' : `${ago(days)}安排`;
  }
  if (book.studiedAt === null) return '还没做';
  return `${ago(daysBetween(new Date(book.studiedAt), now))}学过`;
}
