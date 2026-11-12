// What an open shelf is narrowed to. An empty value is every grade, every
// subject or every book; only one child's shelf can also keep the books the
// child has or only those the child does not have.
export type ShelfFilter = Readonly<{
  grade: string;
  subject: string;
  state: '' | 'assigned' | 'unassigned';
}>;

export const everyBook: ShelfFilter = { grade: '', subject: '', state: '' };

export const isShelfState = (state: string | null): state is ShelfFilter['state'] =>
  state === '' || state === 'assigned' || state === 'unassigned';
