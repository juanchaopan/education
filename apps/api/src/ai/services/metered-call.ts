import { AI_HELP_TIMEOUT_MS } from '@education/contracts';
import type { AiHelpFallback } from '@education/contracts';
import { RequestError } from '../../shared/request-error.js';
import type { BillingResult } from '../domain/tutoring-cost.js';

export type Credentials = { token?: string; csrf?: string };
export type ProviderSettings = { paidAiEnabled: boolean; eligible: boolean; apiKey: string };
type InFlight = { response: Promise<Response> };
export type Authorize = (
  credentials: Credentials,
  start: (signal: AbortSignal) => Promise<InFlight>,
) => Promise<InFlight>;
export type Meter = {
  reserve(credentials: Credentials, model: string, amount: bigint): Promise<string | null>;
  settle(id: string, result: BillingResult): Promise<void>;
};

// One provider request: the model it is for, what to hold against the budget,
// how to send it, and how to read the reply into a value and what it cost.
export type ProviderExchange<O> = {
  model: string;
  reservation: bigint;
  send(signal: AbortSignal): Promise<Response>;
  read(response: Response): Promise<{ value?: O; billing: BillingResult }>;
};

function fallback(reason: AiHelpFallback) {
  return { status: 'fallback', reason } as const;
}

function unavailable(settings: ProviderSettings): AiHelpFallback | undefined {
  if (!settings.paidAiEnabled) return 'disabled';
  if (!settings.apiKey) return 'missing-key';
  if (!settings.eligible) return 'ineligible';
}

async function bounded<T>(
  external: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal;
  if (signal.aborted) return fallback('cancelled');
  let stop!: (result: ReturnType<typeof fallback>) => void;
  const stopped = new Promise<ReturnType<typeof fallback>>((resolve) => {
    stop = resolve;
  });
  const cancel = () => stop(fallback(external?.aborted ? 'cancelled' : 'timeout'));
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(), AI_HELP_TIMEOUT_MS);
  try {
    return await Promise.race([run(signal), stopped]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
    controller.abort();
  }
}

async function meteredRequest<O>(
  exchange: ProviderExchange<O>,
  meter: Meter,
  credentials: Credentials,
  dispatch: (onSend: () => void) => Promise<InFlight>,
) {
  const id = await meter.reserve(credentials, exchange.model, exchange.reservation);
  if (!id) return fallback('usage-limited');
  let billing: BillingResult = { status: 'released' };
  try {
    const { response } = await dispatch(() => {
      billing = { status: 'unknown' };
    });
    const result = await exchange.read(await response);
    billing = result.billing;
    // A reply that broke the agreed bounds is never served, whatever it says.
    if (billing.status === 'out-of-bounds' || result.value === undefined)
      return fallback('unavailable');
    return { status: 'ready', value: result.value } as const;
  } finally {
    await meter.settle(id, billing);
  }
}

// Consent, admission, the response deadline, cancellation and settlement are
// the same for every provider call; exchanges only speak the provider protocol.
// The exchange is built only once paid AI is known to be usable.
export function createMeteredCall(settings: ProviderSettings, authorize: Authorize, meter: Meter) {
  return async <O>(
    build: () => ProviderExchange<O> | undefined,
    credentials: Credentials,
    external?: AbortSignal,
  ) => {
    const reason = unavailable(settings);
    if (reason) return fallback(reason);
    const exchange = build();
    if (!exchange) return fallback('invalid-input');
    const started = performance.now();
    try {
      return await bounded(external, async (signal) => {
        const result = await meteredRequest(exchange, meter, credentials, (onSend) =>
          authorize(credentials, async (authorizationSignal) => {
            const dispatchSignal = AbortSignal.any([signal, authorizationSignal]);
            dispatchSignal.throwIfAborted();
            onSend();
            const response = exchange.send(dispatchSignal);
            void response.catch(() => {});
            return { response };
          }),
        );
        if (result.status === 'fallback') return result;
        return {
          ...result,
          model: exchange.model,
          elapsedMs: performance.now() - started,
        } as const;
      });
    } catch (error) {
      if (error instanceof RequestError && [401, 403].includes(error.statusCode))
        return fallback('unauthorized');
      return fallback('unavailable');
    }
  };
}
