import type { Box } from '../../components/lesson-stage/stage-look';
import { catalog, pictureFiles, type Age } from '../library';

// The shape of the clean, darker clearing a backdrop leaves for a lesson's
// props: a table in the lower middle, a band across the middle, or most of
// the frame.
export type Clearing = 'table' | 'band' | 'open';

export const clearingNames: Readonly<Record<Clearing, string>> = {
  table: '下方中间桌面',
  band: '中间横带',
  open: '整片开阔',
};

// One painted 16:9 backdrop, chosen by its tags: the place, its time of day
// and light, the school years it suits, its clearing and where that lies in
// the 1200×675 world, the part of the picture kept in view when the frame
// crops it, the subjects and kinds of problem it fits, and the prompt it was
// generated from.
type BackdropEntry = Readonly<{
  file: string;
  setting: string;
  light: string;
  ages: readonly [Age, ...Age[]];
  clearing: Clearing;
  clearZone: Box;
  focus: string;
  fits: readonly [string, ...string[]];
  prompt: string;
}>;

const entries = {
  'garden-morning': {
    file: 'garden-morning.webp',
    setting: '菜园',
    light: '清晨暖光',
    ages: ['low'],
    clearing: 'table',
    clearZone: { x: 300, y: 200, width: 800, height: 350 },
    focus: 'center 56%',
    fits: ['称重和等量', '替换和比较'],
    prompt:
      "Create a full-bleed animated feature-film background plate for a Chinese children's educational mini scene, horizontal wide 16:9. A lush vegetable garden at golden morning with tactile sculpted 3D clay and painted wood, exceptionally art directed, honey light, layered foreground (huge leaves in the extreme lower corners, little nasturtium flowers and dew drops), middle ground (a large round/oval empty harvest workbench in honey wood spanning the entire central lower third, surface clearly visible, seen at a low three-quarter angle), and deep background (pastel hills, greenhouse, fruit tree, cheerful vegetable rows, a turquoise potting shed to the left, tiny butterflies, drifting mist). Keep the workbench surface empty and the center above it relatively uncluttered, as a readable darkish teal-green clearing for compositing an interactive balance scale. Leave headroom. No characters, no scale, no loose produce on the workbench, no type, no UI, no split panels, no marks. Moody teal shadows, apricot sun, saturated but beautiful. Looks like an opening establishing shot from a carefully lit 3D family animated short.",
  },
} as const satisfies Record<string, BackdropEntry>;

export type BackdropId = keyof typeof entries;

// Every backdrop in the library, by id, each with the address of its picture.
export const backdrops = catalog<BackdropId, BackdropEntry>(
  entries,
  pictureFiles(
    import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' }),
  ),
);

export type LibraryBackdrop = (typeof backdrops)[BackdropId];
