import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderFamilyPage } from '../../../test/family-page';

const device = vi.hoisted(() => ({ zone: 'America/New_York' }));
vi.mock('../../../shared/lib/device-time-zone', () => ({
  deviceTimeZone: () => device.zone,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  device.zone = 'America/New_York';
});

const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: 'c'.repeat(43),
};

type Zone = { timeZone: string; set: boolean };

// A parent space whose family starts with the given time zone setting. Saving
// a zone changes it, a fill only while the family has none, and the reply is
// the family's zone afterwards, in the server's spelling when one is given;
// `failSaves` makes the server refuse to save. Requests the family does not
// answer fail as the server would when it is down.
function stubFamily(start: Zone, failSaves = false, spelling = (zone: string) => zone) {
  let zone = start;
  const save = (body: string) => {
    if (failSaves) return Response.json({}, { status: 503 });
    const change = JSON.parse(body);
    if (!(change.fill && zone.set)) zone = { timeZone: spelling(change.timeZone), set: true };
    return Response.json(zone);
  };
  const replies: Record<string, (init?: RequestInit) => Response> = {
    'GET session': () => Response.json(session),
    'GET parents/registration-keys': () =>
      Response.json({ key: null, reauthenticationRequired: false, familyCode: 'K7M4-Q2AB-9XRT' }),
    'GET parents/children': () => Response.json({ reauthenticationRequired: false, children: [] }),
    'GET parents/family/time-zone': () => Response.json(zone),
    'PUT parents/family/time-zone': (init) => save(String(init?.body)),
  };
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const reply = replies[`${init?.method ?? 'GET'} ${url.replace('/api/v1/', '')}`];
    return reply ? reply(init) : Response.json({}, { status: 503 });
  });
  vi.stubGlobal('fetch', fetcher);
  const saves = () =>
    fetcher.mock.calls
      .filter(([, init]) => init?.method === 'PUT')
      .map(([, init]) => JSON.parse(String(init?.body)));
  return { saves };
}

// The parent space reads the session, the children, the KEY and the time zone
// before its cards show, which can take longer than a second on a busy machine.
const opening = { timeout: 5000 };
const timeZoneCard = () => screen.findByRole('region', { name: '家庭时区' }, opening);

it("shows the family's page with its code, the KEY and the time zone", async () => {
  stubFamily({ timeZone: 'America/New_York', set: true });
  renderFamilyPage('/family/profile');
  expect(await screen.findByRole('heading', { name: '家庭', level: 1 }, opening)).toBeVisible();
  expect(await screen.findByText('K7M4-Q2AB-9XRT')).toBeVisible();
  expect(screen.getByRole('region', { name: '孩子注册 KEY' })).toBeVisible();
  expect(await timeZoneCard()).toBeVisible();
});

it("fills a family's missing time zone from this device once, without asking", async () => {
  const { saves } = stubFamily({ timeZone: 'Asia/Shanghai', set: false });
  renderFamilyPage('/family');
  await vi.waitFor(() => expect(saves()).toEqual([{ timeZone: 'America/New_York', fill: true }]));
  expect(localStorage.getItem('education-family-time-zone')).toBe('America/New_York');
});

it('keeps the zone the server saved, in its spelling', async () => {
  device.zone = 'Asia/Calcutta';
  stubFamily({ timeZone: 'Asia/Shanghai', set: false }, false, () => 'Asia/Kolkata');
  renderFamilyPage('/family');
  await vi.waitFor(() =>
    expect(localStorage.getItem('education-family-time-zone')).toBe('Asia/Kolkata'),
  );
});

it('does not fill in the clock of a browser that hides where it is', async () => {
  device.zone = 'UTC';
  const { saves } = stubFamily({ timeZone: 'Asia/Shanghai', set: false });
  renderFamilyPage('/family/profile');
  await timeZoneCard();
  expect(saves()).toEqual([]);
});

it('leaves a time zone the family has set alone', async () => {
  const { saves } = stubFamily({ timeZone: 'Asia/Shanghai', set: true });
  renderFamilyPage('/family/profile');
  const card = await timeZoneCard();
  expect(await within(card).findByText(/这台设备在.+，现在/)).toBeVisible();
  expect(saves()).toEqual([]);
});

it("saves the zone the parent picks, the device's own with one press", async () => {
  const { saves } = stubFamily({ timeZone: 'Asia/Shanghai', set: true });
  renderFamilyPage('/family/profile');
  const card = await timeZoneCard();
  await userEvent.click(await within(card).findByRole('button', { name: /^改成/ }));
  expect(within(card).getByLabelText('时区')).toHaveValue('America/New_York');
  await userEvent.click(within(card).getByRole('button', { name: '保存' }));
  expect(await within(card).findByText('已保存')).toBeVisible();
  expect(saves()).toEqual([{ timeZone: 'America/New_York' }]);
  expect(within(card).queryByText(/这台设备在/)).toBeNull();
});

it('keeps the choice and asks again when saving fails', async () => {
  stubFamily({ timeZone: 'Asia/Shanghai', set: true }, true);
  renderFamilyPage('/family/profile');
  const card = await timeZoneCard();
  await userEvent.selectOptions(await within(card).findByLabelText('时区'), 'Europe/London');
  await userEvent.click(within(card).getByRole('button', { name: '保存' }));
  expect(await within(card).findByRole('alert')).toHaveTextContent('没保存上，再点一次。');
  expect(within(card).getByLabelText('时区')).toHaveValue('Europe/London');
  expect(within(card).getByRole('button', { name: '保存' })).toBeEnabled();
});
