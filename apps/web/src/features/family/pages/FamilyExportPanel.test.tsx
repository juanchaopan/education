import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FamilyExport } from '@education/contracts';
import { FamilyExportPanel } from './FamilyExportPanel';

const before = 'a'.repeat(43);
const renewed = 'b'.repeat(43);
const file: FamilyExport = {
  format: {
    name: 'education-family-export',
    version: 4,
    generatedAt: '2026-11-07T12:00:00.000Z',
    includes: [],
    excludes: [],
  },
  parent: { email: 'parent@example.test', emailVerified: true },
  timeZone: { name: 'Asia/Shanghai', set: true },
  aiConsents: [],
  children: [],
};
const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: renewed,
};
const passwordLabel = '导出前输入家长密码';

const create = vi.fn((_blob: Blob) => 'blob:family-data');
let downloads: string[] = [];

beforeEach(() => {
  downloads = [];
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
});

afterEach(() => {
  cleanup();
  create.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(reply: { password?: Response; file?: Response } = {}) {
  const fetcher = vi.fn(async (url: string) =>
    url.endsWith('/reauthenticate')
      ? (reply.password ?? Response.json(session))
      : (reply.file ?? Response.json(file)),
  );
  vi.stubGlobal('fetch', fetcher);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FamilyExportPanel csrf={before} />
    </QueryClientProvider>,
  );
  return fetcher;
}

async function exportWithPassword() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(passwordLabel), 'parent-password');
  await user.click(screen.getByRole('button', { name: '确认并下载' }));
}

const csrfOf = (call: unknown[]) =>
  ((call[1] as RequestInit).headers as Record<string, string>)['X-CSRF-Token'];

it('explains what the file holds before the parent confirms anything', () => {
  setup();
  expect(screen.getByRole('heading', { name: '文件包含' })).toBeVisible();
  expect(screen.getByText('密码和 PIN 的哈希')).toBeVisible();
  expect(screen.getByText(/JSON 文件/)).toBeVisible();
});

it('names its password field and button apart from the other password confirmations', () => {
  setup();
  expect(screen.queryByLabelText(/确认家长密码/)).toBeNull();
  expect(screen.queryByRole('button', { name: '确认密码' })).toBeNull();
});

it('confirms the password, then downloads the export with the renewed session', async () => {
  const fetcher = setup();
  await exportWithPassword();
  expect(await screen.findByText(/已下载 family-data-2026-11-07\.json/)).toBeVisible();
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/parents/reauthenticate',
    '/api/v1/parents/family-export',
  ]);
  expect(csrfOf(fetcher.mock.calls[0]!)).toBe(before);
  expect(csrfOf(fetcher.mock.calls[1]!)).toBe(renewed);
  expect(downloads).toEqual(['family-data-2026-11-07.json']);
  expect(await create.mock.calls[0]![0].text()).toBe(JSON.stringify(file));
  expect(screen.getByLabelText(passwordLabel)).toHaveValue('');
});

it('does not ask for the file when the password is wrong', async () => {
  const fetcher = setup({ password: new Response(null, { status: 401 }) });
  await exportWithPassword();
  expect(await screen.findByRole('alert')).toHaveTextContent('密码不正确');
  expect(fetcher).toHaveBeenCalledOnce();
  expect(downloads).toEqual([]);
});

it('saves nothing when the export is refused or incomplete', async () => {
  for (const response of [
    new Response(null, { status: 403 }),
    Response.json({ ...file, children: undefined }),
  ]) {
    setup({ file: response });
    await exportWithPassword();
    expect(await screen.findByRole('alert')).toHaveTextContent(/重新确认家长密码|暂时无法导出/);
    cleanup();
  }
  expect(create).not.toHaveBeenCalled();
  expect(downloads).toEqual([]);
});
