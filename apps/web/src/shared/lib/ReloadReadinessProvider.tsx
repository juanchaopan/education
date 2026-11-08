import { useMemo, useState, type ReactNode } from 'react';
import {
  PartsContext,
  RegistryContext,
  type ReadinessPart,
  type ReadinessRegistry,
} from './reload-readiness';

// Collects what every part of the page reports about a reload. A report that
// changes nothing leaves the page as it is drawn.
export function ReloadReadinessProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<ReadonlyMap<string, ReadinessPart>>(new Map());
  const registry = useMemo<ReadinessRegistry>(
    () => ({
      put: (id, part) =>
        setParts((current) =>
          current.get(id)?.readiness === part.readiness ? current : new Map(current).set(id, part),
        ),
      remove: (id) =>
        setParts((current) => {
          if (!current.has(id)) return current;
          const next = new Map(current);
          next.delete(id);
          return next;
        }),
    }),
    [],
  );
  return (
    <RegistryContext value={registry}>
      <PartsContext value={parts}>{children}</PartsContext>
    </RegistryContext>
  );
}
