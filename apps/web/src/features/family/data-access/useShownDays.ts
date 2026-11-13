import type { CalendarDate, ChildOverview, StudyDay } from '@education/contracts';
import { daysShown, earlierBlocks } from '../day-window';
import { useEarlierDays } from './useLearningSummary';

// The earlier blocks to read for the days shown, once the overview is here.
function blocksToRead(record?: ChildOverview, end?: CalendarDate) {
  const first = record?.days[0]?.date;
  return record && first && end ? earlierBlocks(first, end, record.earliest) : [];
}

// Every day loaded so far: the overview's block and the earlier blocks read.
function loadedDays(
  record: ChildOverview | undefined,
  blocks: readonly (StudyDay[] | undefined)[],
) {
  return new Map(
    [record?.days ?? [], ...blocks].flatMap((days) => days ?? []).map((day) => [day.date, day]),
  );
}

// The seven days a child's card shows, ending on `end`, from the overview's
// block of days and the earlier blocks read as the card moves back. Until all
// seven have arrived there are none; an earlier block that could not be read
// says so and can be read again.
export function useShownDays(
  csrf: string,
  childId: string,
  record: ChildOverview | undefined,
  end: CalendarDate | undefined,
) {
  const blocks = useEarlierDays(csrf, childId, blocksToRead(record, end));
  const loaded = loadedDays(
    record,
    blocks.map(({ data }) => data?.days),
  );
  const days = end ? daysShown(end, loaded) : undefined;
  return {
    days,
    failed: !days && blocks.some(({ isError }) => isError),
    retry: () => {
      for (const block of blocks) if (block.isError) void block.refetch();
    },
  };
}
