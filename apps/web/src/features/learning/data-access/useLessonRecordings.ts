import { useQuery } from '@tanstack/react-query';

// Whether a lesson's recordings are being fetched, have all arrived, or did
// not all arrive and can be fetched again.
export type Preparation = 'preparing' | 'ready' | 'failed';

type Lines = Readonly<Record<string, Readonly<{ clip: string }>>>;

async function downloadRecording(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Recording ${source} answered ${response.status}`);
  await response.arrayBuffer();
}

async function downloadRecordings(sources: readonly string[]) {
  await Promise.all(sources.map(downloadRecording));
  return true;
}

// Every recording a lesson's lines play, fetched in full as the lesson opens
// so that no line waits on the network: the player still plays each from its
// own address, which the browser answers from the copy it keeps. Blob and data
// addresses are not used, as some WebKit builds refuse to play audio from them.
// A failed download is shown at once and fetched again on request.
export function useLessonRecordings(lines: Lines) {
  const sources = [...new Set(Object.values(lines).map(({ clip }) => clip))];
  const query = useQuery({
    queryKey: ['lesson-recordings', ...sources],
    queryFn: () => downloadRecordings(sources),
    staleTime: Infinity,
    retry: false,
  });
  let preparation: Preparation = 'preparing';
  if (query.isSuccess) preparation = 'ready';
  else if (query.isError && !query.isFetching) preparation = 'failed';
  return { preparation, retry: () => void query.refetch() };
}
