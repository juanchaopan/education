import { AI_HELP_TIMEOUT_MS } from '@education/contracts';
import type { AiHelpFallback } from '@education/contracts';

type Fallback = { status: 'fallback'; reason: AiHelpFallback };
type State<Result> = Result | Fallback | { status: 'pending' } | { status: 'guidance' };
type Attempt = { controller: AbortController; timer: ReturnType<typeof setTimeout> };

// One AI request at a time for a lesson step. A slow, failed or cancelled request
// ends in a fallback or guidance state, and a late reply never replaces it.
export function createAiHelpRequest<Result extends { status: string }>(
  update: (state: State<Result>) => void,
) {
  let current: Attempt | undefined;

  function finish(state?: State<Result>) {
    const attempt = current;
    current = undefined;
    if (attempt) {
      clearTimeout(attempt.timer);
      attempt.controller.abort();
    }
    if (state) update(state);
  }

  return {
    async request(load: (signal: AbortSignal) => Promise<Result | Fallback>) {
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
      let result: Result | Fallback;
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
