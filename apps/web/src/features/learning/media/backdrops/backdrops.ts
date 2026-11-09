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
  'art-studio-evening': {
    file: 'art-studio-evening.webp',
    setting: '画室',
    light: '傍晚紫橙灯光',
    ages: ['low', 'middle'],
    clearing: 'open',
    clearZone: { x: 150, y: 270, width: 890, height: 350 },
    focus: 'center 60%',
    fits: ['配对和计数', '排列和分类'],
    prompt:
      'Wide 16:9 background for an interactive animated short for primary school children about arranging colored pencils. Warm inviting whimsical 3D animated film art studio, seen from a slightly high camera looking down at a large apricot maple artist worktable which fills the lower two thirds, clean broad clear central work surface, pale cream colored mat or paper texture in the central area only if subtle, richly detailed out at the extreme left and right edges with ceramic paint cups, curling scraps of colored paper, wooden toy star, spool, soft purple lamp, and a lavender wall with simple craft shapes far in the background. Tactile rounded clay/wood materials, soft gradient shadows, gorgeous purple/orange evening studio lighting, cheerful, child-scale. Leave the central 75% across the table entirely empty for large movable pencil sprites and later a teaching diagram. No pencils, no characters, no writing, no numbers, no labels, no UI. Family animated feature film production quality with appealing strong depth and atmospheric perspective.',
  },
  'railway-workshop-dusk': {
    file: 'railway-workshop-dusk.webp',
    setting: '火车工作间',
    light: '蓝调时分灯光',
    ages: ['high'],
    clearing: 'open',
    clearZone: { x: 140, y: 265, width: 860, height: 330 },
    focus: 'center 60%',
    fits: ['数轴和行程', '方程'],
    prompt:
      'Wide 16:9 background plate for a polished 2.5D interactive animated mathematics short for ages 10–12. A miniature railway engineering workshop at blue hour, rendered in tactile painted 3D wood and brass. Seen straight on from a slightly elevated cinematic camera. Warm pools of lamp light, teal walls, a huge round out-of-focus clock high in the far background, a few gears, drafting tools, brass rails and miniature decorative structures at the very edges. The central 80% is a clear broad deep petrol-blue horizontal workbench/dark matte blueprint surface with strong visual depth, spanning most of the middle and lower screen, deliberately uncluttered for overlaying two high contrast tracks, animated model trains and movable equation blocks. Muted behind central area so the teaching diagram reads, visually rich edges, magenta sunset rim light, rich dark teal and gold palette. No lettering, no symbols, no number lines, no actual trains, no graph and no split-panel or HUD.',
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
