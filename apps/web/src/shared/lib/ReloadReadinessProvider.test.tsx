import { act, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usePageReadiness, useReloadReadiness, type Readiness } from './reload-readiness';
import { ReloadReadinessProvider } from './ReloadReadinessProvider';

type PartProps = { readiness: Readiness; save?: () => void };

function Part({ readiness, save }: PartProps) {
  useReloadReadiness(readiness, save);
  return null;
}

function Page() {
  const page = usePageReadiness();
  return (
    <button type="button" onClick={page.saveUnsaved}>
      {page.readiness}
    </button>
  );
}

// Parts keep their place in the list, so a part whose props change is the
// same part reporting again.
function Screen({ parts }: { parts: PartProps[] }) {
  return (
    <ReloadReadinessProvider>
      {parts.map((part, place) => (
        <Part key={place} {...part} />
      ))}
      <Page />
    </ReloadReadinessProvider>
  );
}

describe('reload readiness', () => {
  it('is ready with nothing on the page, and reports the strongest hold', () => {
    const { rerender } = render(<Screen parts={[]} />);
    expect(screen.getByRole('button')).toHaveTextContent('ready');
    rerender(<Screen parts={[{ readiness: 'showing' }, { readiness: 'ready' }]} />);
    expect(screen.getByRole('button')).toHaveTextContent('showing');
    rerender(<Screen parts={[{ readiness: 'showing' }, { readiness: 'saving' }]} />);
    expect(screen.getByRole('button')).toHaveTextContent('saving');
    rerender(<Screen parts={[{ readiness: 'saving' }, { readiness: 'unsaved' }]} />);
    expect(screen.getByRole('button')).toHaveTextContent('unsaved');
    rerender(<Screen parts={[{ readiness: 'playing' }, { readiness: 'unsaved' }]} />);
    expect(screen.getByRole('button')).toHaveTextContent('playing');
  });

  it('forgets a part that leaves the page', () => {
    const { rerender } = render(<Screen parts={[{ readiness: 'playing' }]} />);
    expect(screen.getByRole('button')).toHaveTextContent('playing');
    rerender(<Screen parts={[]} />);
    expect(screen.getByRole('button')).toHaveTextContent('ready');
  });

  it('saves only the parts whose work is unsaved, with their latest save', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const saving = vi.fn();
    const { rerender } = render(
      <Screen
        parts={[
          { readiness: 'unsaved', save: first },
          { readiness: 'saving', save: saving },
        ]}
      />,
    );
    rerender(
      <Screen
        parts={[
          { readiness: 'unsaved', save: latest },
          { readiness: 'saving', save: saving },
        ]}
      />,
    );
    act(() => screen.getByRole('button').click());
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
    expect(saving).not.toHaveBeenCalled();
  });

  it('reports nowhere outside a provider', () => {
    const { result } = renderHook(() => {
      const [readiness] = useState<Readiness>('playing');
      useReloadReadiness(readiness);
      return usePageReadiness().readiness;
    });
    expect(result.current).toBe('ready');
  });
});
