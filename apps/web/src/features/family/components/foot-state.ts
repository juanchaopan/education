// Where the reading of a list read batch by batch stands: more to read, a
// batch on its way, a batch that did not load, or every batch read.
export type FootState = 'more' | 'loading' | 'failed' | 'done';

export function footState(list: {
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
}): FootState {
  if (list.isFetchingNextPage) return 'loading';
  if (list.isFetchNextPageError) return 'failed';
  return list.hasNextPage ? 'more' : 'done';
}
