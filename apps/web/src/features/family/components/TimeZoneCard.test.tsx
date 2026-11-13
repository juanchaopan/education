import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { TimeZoneCard, type TimeZoneCardProps } from './TimeZoneCard';
import { offsetLabel, zoneOptions } from './time-zone-names';

const now = new Date('2026-11-12T12:15:00Z');
const zones = ['Asia/Shanghai', 'America/New_York', 'UTC'];

function card(props: Partial<TimeZoneCardProps> = {}) {
  const handlers = { onChoose: vi.fn(), onSave: vi.fn(), onRetry: vi.fn() };
  render(
    <TimeZoneCard
      current="Asia/Shanghai"
      device="Asia/Shanghai"
      options={zoneOptions(zones, now)}
      now={now}
      save="idle"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

it("names the family's zone with the time and the part of the day there", () => {
  card();
  const region = screen.getByRole('region', { name: '家庭时区' });
  expect(region).toHaveTextContent('现在 20:15 · 晚上');
  expect(region).toHaveTextContent('每天的学习从这个时区的 0 点算起');
  expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
});

it('lists every zone from the westernmost clock, with its offset and name', () => {
  card();
  const labels = within(screen.getByLabelText('时区'))
    .getAllByRole('option')
    .map((option) => option.textContent);
  expect(labels[0]).toMatch(/^UTC−05:00 .+ · America\/New_York$/);
  expect(labels[1]).toMatch(/^UTC\+00:00 .+ · UTC$/);
  expect(labels[2]).toMatch(/^UTC\+08:00 .+ · Asia\/Shanghai$/);
});

it("offers this device's zone when it differs, and passes the choice on", async () => {
  const { onChoose } = card({ device: 'America/New_York' });
  expect(screen.getByText(/这台设备在.+，现在 7:15。/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /^改成/ }));
  expect(onChoose).toHaveBeenCalledWith('America/New_York');
});

it('saves a new choice and says how it went', async () => {
  const { onSave, onChoose } = card({ choice: 'America/New_York' });
  await userEvent.selectOptions(screen.getByLabelText('时区'), 'UTC');
  expect(onChoose).toHaveBeenCalledWith('UTC');
  await userEvent.click(screen.getByRole('button', { name: '保存' }));
  expect(onSave).toHaveBeenCalledOnce();
});

it('holds the controls while saving, then shows saved or asks to try again', () => {
  card({ choice: 'UTC', save: 'saving' });
  expect(screen.getByRole('button', { name: '正在保存…' })).toBeDisabled();
  expect(screen.getByLabelText('时区')).toBeDisabled();
});

it('marks a saved zone and asks again after a failure', () => {
  card({ save: 'saved' });
  expect(screen.getByRole('status')).toHaveTextContent('已保存');
});

it('asks to save again when saving failed', () => {
  card({ choice: 'UTC', save: 'failed' });
  expect(screen.getByRole('alert')).toHaveTextContent('没保存上，再点一次。');
});

it('offers to read the zone again when it could not be read', async () => {
  const { onRetry } = card({ current: undefined, failed: true });
  await userEvent.click(screen.getByRole('button', { name: '重试' }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it('writes offsets with a true minus sign and minutes', () => {
  expect(offsetLabel(-210)).toBe('UTC−03:30');
  expect(offsetLabel(345)).toBe('UTC+05:45');
});
