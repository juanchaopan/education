import { AI_HELP_TIMEOUT_MS } from '@education/contracts';
import type { AiHelpResult } from '@education/contracts';

type State = AiHelpResult | { status: 'pending' } | { status: 'guidance' };
type Attempt = { controller: AbortController; timer: ReturnType<typeof setTimeout> };

export function createAiHelpRequest(update: (state: State) => void) {
  let current: Attempt | undefined;

  function finish(state?: State) {
    const attempt = current;
    current = undefined;
    if (attempt) {
      clearTimeout(attempt.timer);
      attempt.controller.abort();
    }
    if (state) update(state);
  }

  return {
    async request(load: (signal: AbortSignal) => Promise<AiHelpResult>) {
      if (current) return;
      const controller = new AbortController();
      const timer = setTimeout(
        () => finish({ status: 'fallback', reason: 'timeout' }),
        AI_HELP_TIMEOUT_MS,
      );
      const attempt = { controller, timer };
      current = attempt;
      update({ status: 'pending' });
      if (current !== attempt) return;
      let result: AiHelpResult;
      try {
        result = await load(controller.signal);
      } catch {
        result = { status: 'fallback', reason: 'unavailable' };
      }
      if (current === attempt) finish(result);
    },
    guide: () => finish({ status: 'guidance' }),
    cancel: () => {
      if (current) finish({ status: 'fallback', reason: 'cancelled' });
    },
    dispose: () => finish(),
  };
}
