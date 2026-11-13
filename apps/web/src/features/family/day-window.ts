import {
  addDays,
  daysBetween,
  isCalendarDate,
  learningRangeLongest,
  shownDays,
  studyDaysBlock,
  type CalendarDate,
  type StudyDay,
} from '@education/contracts';

// The seven days a child's card shows, ending on `end`, the earliest first.
export const shownDates = (end: CalendarDate) =>
  Array.from({ length: shownDays }, (_, place) => addDays(end, place + 1 - shownDays));

// The seven days that end on a day, as the learning record names them.
export const sevenDaysEnding = (to: CalendarDate) => ({ from: shownDates(to)[0]!, to });

// The card moves back while the first day shown is later than the child's
// first day with any record; a child without a record has nothing earlier.
export const canGoBack = (end: CalendarDate, earliest: CalendarDate | null) =>
  earliest !== null && shownDates(end)[0]! > earliest;

// The last days of the earlier blocks to read for the days shown, nearest
// first. The overview sends the block ending today; each earlier block is read
// once the days shown come within a week of the earliest day loaded, so moving
// back never waits for the network. Blocks wholly before the child's first
// day are never read.
export function earlierBlocks(
  overviewFirst: CalendarDate,
  end: CalendarDate,
  earliest: CalendarDate | null,
): CalendarDate[] {
  if (earliest === null) return [];
  const wanted = addDays(shownDates(end)[0]!, -shownDays);
  const ends: CalendarDate[] = [];
  for (let first = overviewFirst; first > wanted && first > earliest;) {
    const last = addDays(first, -1);
    ends.push(last);
    first = addDays(last, 1 - studyDaysBlock);
  }
  return ends;
}

// The days shown, found among the days loaded so far; none until all seven
// have arrived.
export function daysShown(end: CalendarDate, loaded: ReadonlyMap<CalendarDate, StudyDay>) {
  const days = shownDates(end).map((date) => loaded.get(date));
  return days.every((day) => day !== undefined) ? (days as StudyDay[]) : undefined;
}

// The record's address for the days a card shows, or the one day picked;
// before the days are known, the child's record as it opens by itself.
export function recordAddress(childId: string, end?: CalendarDate, picked?: CalendarDate) {
  const query = new URLSearchParams({ child: childId });
  if (end) {
    query.set('from', picked ?? shownDates(end)[0]!);
    query.set('to', picked ?? end);
  }
  return `/family/learning?${query}`;
}

// The days an address of the learning record names: one to seven real days
// up to today, else today and the six days before it.
export function chosenDays(from: string | null, to: string | null, today: CalendarDate) {
  const real = (day: string | null): day is CalendarDate => !!day && isCalendarDate(day);
  if (real(from) && real(to) && from <= to && to <= today) {
    if (daysBetween(from, to) < learningRangeLongest) return { from, to };
  }
  return sevenDaysEnding(today);
}
