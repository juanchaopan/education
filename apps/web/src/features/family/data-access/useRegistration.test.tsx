import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { useRegistration } from './useRegistration';

vi.mock('../../../shared/lib/device-time-zone', () => ({
  deviceTimeZone: () => 'America/Toronto',
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

it("signs a new family up in the time zone of the parent's browser", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ status: 'pending-verification', mail: 'not-sent' }, { status: 202 }),
  );
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useRegistration(), { wrapper: queryWrapper() });
  result.current.mutate({ email: 'parent@example.test', password: 'a private phrase for us' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(String(init.body))).toEqual({
    email: 'parent@example.test',
    password: 'a private phrase for us',
    timeZone: 'America/Toronto',
  });
});
