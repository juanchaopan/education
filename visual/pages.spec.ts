import { expect, test } from '@playwright/test';
import { expectAccessible } from './accessibility';
import { openPageState, pageStates } from './pages';
import { expectScreenshot, holdStill } from './render';

for (const state of pageStates) {
  test(`${state.name} looks like its reviewed baseline and passes WCAG checks`, async ({
    page,
  }) => {
    await holdStill(page);
    const unexpected = await openPageState(page, state);
    await expectScreenshot(page, `${state.name}.png`);
    await expectAccessible(page);
    expect(unexpected).toEqual([]);
  });
}
