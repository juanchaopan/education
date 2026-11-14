import type { ReactNode } from 'react';
import { Icon } from '../../../shared/ui/Icon';
import styles from './SignInTabs.module.css';

export type SignInTab = 'child' | 'parent';

const tabs: readonly { tab: SignInTab; label: string; icon: 'user' | 'users' }[] = [
  { tab: 'child', label: '孩子登录', icon: 'user' },
  { tab: 'parent', label: '家长登录', icon: 'users' },
];

type Props = {
  tab: SignInTab;
  onTab: (tab: SignInTab) => void;
  // What the chosen tab holds.
  children: ReactNode;
};

// The two ways in, as a pair of tabs: a raised slider in a trough marks the
// chosen one. The arrow keys move between them, as tabs do.
export function SignInTabs({ tab, onTab, children }: Props) {
  const move = (step: number) => {
    const place = tabs.findIndex((entry) => entry.tab === tab);
    const next = tabs[(place + step + tabs.length) % tabs.length]!;
    onTab(next.tab);
    document.getElementById(`sign-in-tab-${next.tab}`)?.focus();
  };
  return (
    <>
      <div
        role="tablist"
        aria-label="登录"
        className={styles.tabs}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') move(1);
          if (event.key === 'ArrowLeft') move(-1);
        }}
      >
        {tabs.map((entry) => (
          <button
            key={entry.tab}
            id={`sign-in-tab-${entry.tab}`}
            type="button"
            role="tab"
            aria-selected={entry.tab === tab}
            aria-controls="sign-in-panel"
            tabIndex={entry.tab === tab ? 0 : -1}
            className={styles.tab}
            onClick={() => onTab(entry.tab)}
          >
            <Icon name={entry.icon} className={styles.icon} />
            {entry.label}
          </button>
        ))}
      </div>
      <div
        id="sign-in-panel"
        role="tabpanel"
        aria-labelledby={`sign-in-tab-${tab}`}
        className={styles.panel}
      >
        {children}
      </div>
    </>
  );
}
