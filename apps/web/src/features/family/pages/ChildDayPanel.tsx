import { useState } from 'react';
import { addDays, type CalendarDate, type ChildOverview } from '@education/contracts';
import { ChildDayCard } from '../components/ChildDayCard';
import { useShownDays } from '../data-access/useShownDays';
import { canGoBack, recordAddress } from '../day-window';

type Props = {
  csrf: string;
  childId: string;
  nickname: string;
  place: number;
  // The family's today and this child's days ending today, once the overview
  // has arrived.
  today?: CalendarDate;
  record?: ChildOverview;
  failed: boolean;
  onRetry: () => void;
};

type View = { end?: CalendarDate; picked?: CalendarDate };

// One child's card on the overview, holding which days it shows and which day
// is picked. Moving the days drops the pick; pressing the picked day again
// goes back to the seven days.
export function ChildDayPanel({
  csrf,
  childId,
  nickname,
  place,
  today,
  record,
  ...overview
}: Props) {
  const [view, setView] = useState<View>({});
  const end = view.end ?? today;
  const shown = useShownDays(csrf, childId, record, end);
  const move = (step: number) => {
    if (end) setView({ end: addDays(end, step) });
  };
  return (
    <ChildDayCard
      childId={childId}
      nickname={nickname}
      place={place}
      days={shown.days}
      today={today}
      picked={view.picked}
      canGoBack={!!end && canGoBack(end, record?.earliest ?? null)}
      canGoForward={!!end && !!today && end < today}
      failed={overview.failed || shown.failed}
      onRetry={shown.failed ? shown.retry : overview.onRetry}
      onBack={() => move(-1)}
      onForward={() => move(1)}
      onPick={(date) => setView({ end, picked: view.picked === date ? undefined : date })}
      record={recordAddress(childId, end, view.picked)}
    />
  );
}
