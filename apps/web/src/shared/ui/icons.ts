// Every icon is named for what it stands for, so the drawing behind a name can
// change in one place without touching the pages that show it.
export const glyphs = {
  spark: '✳',
  home: '⌂',
  flower: '✿',
  waiting: '◌',
  cloud: '☁',
  twinkle: '✦',
  glimmer: '✧',
} as const;

export type IconName = keyof typeof glyphs;
export const iconNames = Object.keys(glyphs) as IconName[];
