import type { ReactNode } from 'react';

// The site's own icon set, drawn on a 24-unit grid with a 2-unit round-capped
// stroke in the current text colour; `Icon` supplies the frame and the stroke.
// Every icon is named for what it stands for, so the drawing behind a name can
// change in one place without touching the pages that show it.
export const glyphs = {
  back: <path d="M15 18l-6-6 6-6" />,
  chevron: <path d="m9.5 6 6 6-6 6" />,
  // Opening a small list beneath the control it belongs to.
  expand: <path d="m6 9.5 6 6 6-6" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M9 6v12M15 6v12" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" stroke="none" />,
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
    </>
  ),
  // Speaking once more: the microphone inside a turning arrow.
  sayAgain: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.8 3.8v3.7h-3.7" />
      <rect x="10.6" y="8" width="2.8" height="5.2" rx="1.4" />
      <path d="M9 12.4a3 3 0 0 0 6 0M12 15.4v1.4" />
    </>
  ),
  replay: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
      <path d="M3.5 3.5v5h5" />
    </>
  ),
  captions: (
    <>
      <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-8.5L7 20.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z" />
      <path d="M7 9.5h10M7 13h6" />
    </>
  ),
  captionsOff: (
    <>
      <path d="M8 5h12a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-.6 1.2M15.5 17h-4L7 20.5V17H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5" />
      <path d="M3 3l18 18" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.5 6.5a7.8 7.8 0 0 1 0 11" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  send: <path d="M20.5 3.5 10.5 13.5M20.5 3.5l-6 17-4-7-7-4z" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
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
  chart: <path d="M3.5 20.5h17M6.5 17v-5M11 17V7M15.5 17v-7M20 17V4.5" />,
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
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />,
  // A row of books standing on a shelf, for the library of books.
  library: <path d="M4 4.5v15M8.5 4.5v15M13 6l3.5 13.5M17 5.5l3.5 13M3 20h18" />,
  // A closed book, for a book in general and a subject without its own icon.
  book: (
    <>
      <path d="M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z" />
      <path d="M5 18a2 2 0 0 1 2-2h11.5M9 8.5h6" />
    </>
  ),
  // The subjects: four arithmetic signs for maths, an open book for Chinese
  // and a speech bubble holding "Aa" for English.
  math: <path d="M7 3.5v7M3.5 7h7M14.5 4.5l5 5M19.5 4.5l-5 5M3.5 17h7M13.5 15h6.5M13.5 19.5h6.5" />,
  chinese: (
    <>
      <path d="M3 5.5c3.2-1 6.2-.8 9 1.3 2.8-2.1 5.8-2.3 9-1.3v13c-3.2-1-6.2-.8-9 1.3-2.8-2.1-5.8-2.3-9-1.3z" />
      <path d="M12 6.8v13M6 9.5c1.5-.3 2.8 0 3.5.6M14.5 10c.7-.6 2-.9 3.5-.6" />
    </>
  ),
  english: (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-4.5 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M8 13l2-5.5 2 5.5M8.7 11.2h2.6M14.5 8v5M14.5 10.6c.4-.8 1-1.1 1.7-1.1.9 0 1.5.7 1.5 1.7V13" />
    </>
  ),
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
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2.5 21a6.5 6.5 0 0 1 13 0M16 4.2a4 4 0 0 1 0 7.6M18 14.5a6.5 6.5 0 0 1 3.5 6.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V13M12 16.4v.1" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.6v.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.5 7 8.5 6.5L20.5 7" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" />
    </>
  ),
  logout: (
    <>
      <path d="M13.5 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h7.5" />
      <path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" />
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
