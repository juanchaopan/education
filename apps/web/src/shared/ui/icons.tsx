import type { ReactNode } from 'react';

// The site's own icon set, drawn on a 24-unit grid with a 2-unit round-capped
// stroke in the current text colour; `Icon` supplies the frame and the stroke.
// Every icon is named for what it stands for, so the drawing behind a name can
// change in one place without touching the pages that show it.
export const glyphs = {
  back: <path d="M15 18l-6-6 6-6" />,
  chevron: <path d="m9.5 6 6 6-6 6" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
    </>
  ),
  replay: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
      <path d="M3.5 3.5v5h5" />
    </>
  ),
  bulb: (
    <path d="M9 17.5h6M10 21h4M12 3a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7h6c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 3z" />
  ),
  star: <path d="M12 2.8l2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9z" />,
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 9.8-9.8M17.5 5.5l3 3M14.5 8.5l2 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 21.5s7.5-3.6 7.5-9.5V5.5L12 2.8 4.5 5.5V12c0 5.9 7.5 9.5 7.5 9.5z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  download: <path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4 20.5h16" />,
  trash: <path d="M3.5 6.5h17M9 6.5V4h6v2.5M6 6.5l1 14h10l1-14" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M5 15.5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5" />
    </>
  ),
  home: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />,
  sprout: (
    <>
      <path d="M12 21v-8.5" />
      <path d="M12 12.5C12 8 9 5.5 4.5 5.5 4.5 10 7.5 12.5 12 12.5z" />
      <path d="M12 10.5c0-3.5 2.5-6 7.5-6 0 4-2.5 6-7.5 6z" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V13M12 16.4v.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.5A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.8M11 5.6A15 15 0 0 1 22 9.5" />
      <circle cx="12" cy="20" r=".6" fill="currentColor" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;
export const iconNames = Object.keys(glyphs) as IconName[];
