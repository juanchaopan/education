import type { Page } from '@playwright/test';
import { gardenApi } from './child-at-the-answer.js';

type DraftWrite = { action?: string; content?: { stepId?: string } };

// Waits until the server has taken a save of the garden lesson's draft, at
// `stepId` when one is given: the place a child coming back resumes at. The
// page tells the child about a save only for a moment, so a test waits for
// the save itself.
export function draftSaved(page: Page, stepId?: string) {
  return page.waitForResponse((response) => {
    const request = response.request();
    if (
      request.method() !== 'POST' ||
      !response.url().endsWith(`${gardenApi}/draft`) ||
      !response.ok()
    )
      return false;
    const write = request.postDataJSON() as DraftWrite;
    return write.action === 'save' && (stepId === undefined || write.content?.stepId === stepId);
  });
}
