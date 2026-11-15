import { Brand } from '../shared/ui/Brand';
import { Frame } from './Frame';
import { useScrollMemory } from './useScrollMemory';
import styles from './SiteLayout.module.css';

// The pages that bring no frame of their own, such as a path that leads
// nowhere: the brand, which leads home, above the page the route shows,
// which keeps its scroll position for the child coming back.
export function SiteLayout() {
  useScrollMemory();
  return (
    <Frame className={styles.shell}>
      <header className={styles.header}>
        <Brand />
      </header>
    </Frame>
  );
}
