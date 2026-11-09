import type { PropsWithChildren } from 'react';
import { ReloadReadinessProvider } from '../shared/lib/ReloadReadinessProvider';
import { queryWrapper } from './query-wrapper';

// A fresh query client on a page whose parts report how they stand toward a
// reload, as the app's page does.
export function pageWrapper() {
  const Query = queryWrapper();
  return function PageWrapper({ children }: PropsWithChildren) {
    return (
      <Query>
        <ReloadReadinessProvider>{children}</ReloadReadinessProvider>
      </Query>
    );
  };
}
