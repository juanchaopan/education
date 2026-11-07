import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { controls } from './render';

// WCAG 2.2 level A and AA, which include colour contrast, names and labels,
// and links that stand out from text by more than colour.
const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

export async function expectAccessible(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(wcag);
  const { violations } = await (include ? builder.include(include) : builder).analyze();
  const found = violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map((node) => node.target.join(' ')),
  }));
  expect(found).toEqual([]);
}

// The smallest target, in CSS pixels, any control may offer a finger: the
// enhanced WCAG target size. The --touch-target design token may ask for more.
const wcagTarget = 44;

// Visible controls on the page whose touch target is smaller than the
// --touch-target token. A control inside its label is hit through the label,
// so the label is measured. A link inside a sentence is exempt, as WCAG
// exempts inline targets; a link on its own line is not. Controls placed off
// screen until they are focused, such as the skip link, are left to the
// keyboard.
export function smallTargets(page: Page) {
  return page.evaluate(
    ({ selector, floor }) => {
      const rootStyle = getComputedStyle(document.documentElement);
      const token =
        parseFloat(rootStyle.getPropertyValue('--touch-target')) * parseFloat(rootStyle.fontSize);
      const size = Math.max(floor, token || 0);
      const inSentence = (control: HTMLElement) => {
        const parent = control.parentElement;
        return (
          control instanceof HTMLAnchorElement &&
          parent !== null &&
          parent.matches('p, li, span, dd, td') &&
          (parent.textContent ?? '').trim() !== (control.textContent ?? '').trim()
        );
      };
      const onScreen = (control: HTMLElement) => {
        const box = control.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.right > 0 && box.left < window.innerWidth;
      };
      return [...document.querySelectorAll<HTMLElement>(selector)]
        .filter((control) => onScreen(control) && !inSentence(control))
        .map((control) => {
          const target = control.closest('label') ?? control;
          const { width, height } = target.getBoundingClientRect();
          const name = (target.textContent || control.getAttribute('aria-label') || control.id)
            .trim()
            .slice(0, 24);
          return { name, width: Math.round(width), height: Math.round(height) };
        })
        .filter(({ width, height }) => width < size || height < size);
    },
    { selector: controls, floor: wcagTarget },
  );
}

// Whether the page scrolls sideways, which means content does not reflow.
export function scrollsSideways(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}
