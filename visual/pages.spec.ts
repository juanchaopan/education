import { expect, test } from '@playwright/test';
import { expectAccessible } from './accessibility';
import { openPageState, pageStates } from './pages';

for (const state of pageStates) {
  test(`${state.name} looks like its reviewed baseline and passes WCAG checks`, async ({
    page,
  }) => {
    const unexpected = await openPageState(page, state);
    await expect(page).toHaveScreenshot(`${state.name}.png`, { fullPage: true });
    await expectAccessible(page);
    expect(unexpected).toEqual([]);
  });
}
