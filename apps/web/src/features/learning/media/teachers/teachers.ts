import type { Face } from '../../components/lesson-stage/stage-look';
import { catalog, type Age } from '../library';

// One character who tells lessons: its name, which the captions and the
// question panel use, the school years it suits, its manner as the lines
// should keep it, where its face is in the picture, for the round portrait
// beside its subtitles, and the prompt it was generated from, as
// docs/design/lesson-media.md gives it. Where it stands is the lesson's
// choice, since that depends on the scene.
type TeacherEntry = Readonly<{
  name: string;
  file: string;
  ages: readonly [Age, ...Age[]];
  personality: string;
  face: Face;
  prompt: string;
}>;

const entries = {
  rabbit: {
    name: '小兔',
    file: 'rabbit.webp',
    ages: ['low'],
    personality:
      '菜园里的小园丁，好奇、爱动手，说话轻快温和；常常指着东西请孩子看一看、动一动，不急着说出答案。',
    face: { x: 0.225, y: 0.322, size: 0.488 },
    prompt:
      "Transparent full-body character sprite for a polished family animated movie about a sunlit vegetable garden. One small expressive cream-white rabbit gardener, with two tall asymmetrical ears, black curious eyes, peach nose, green-blue denim overalls, small apricot-yellow neckerchief, short plump body with tiny paws. Standing and leaning forward slightly with one hand pointing conversationally toward the viewer's right, eyes looking right. Visible whole body with clear silhouette and ear tips, centered, subject uses 90 percent of vertical image. 3D animated feature-quality character with soft hand-painted texture and warm rim light, appealing proportions, whimsical, high production values. No platform, no scene, no shadows outside silhouette, no other objects or text. True transparent background.",
  },
  squirrel: {
    name: '小松鼠',
    file: 'squirrel.webp',
    ages: ['low'],
    personality:
      '林子里的小管家，热心、爱数东西，说话慢慢的；常请孩子一起数一数、分一分，答错了也笑着再来一次。',
    face: { x: 0.459, y: 0.234, size: 0.43 },
    prompt:
      "Transparent full-body character sprite for a polished family animated movie. One small expressive red squirrel, with a big fluffy curled tail, tufted ears, round black curious eyes, a cream belly and tiny paws, wearing a little moss-green knitted vest and a small butter-yellow scarf. Standing and leaning forward slightly with one paw pointing conversationally toward the viewer's right, eyes looking right, a warm encouraging smile. Visible whole body including the tip of the tail and the ear tufts, clear silhouette, centered, subject uses 90 percent of the vertical image. 3D animated feature-quality character with soft hand-painted texture and warm rim light, appealing proportions, gentle and cute for ages 6 to 8, high production values. No platform, no scene, no shadows outside the silhouette, no other objects or text. True transparent background.",
  },
  raccoon: {
    name: '小浣熊',
    file: 'raccoon.webp',
    ages: ['middle'],
    personality:
      '手巧的小工匠，爱拆爱装、好问为什么，说话爽快；常让孩子先动手量一量、试一试，再一起想道理。',
    face: { x: 0.293, y: 0.02, size: 0.508 },
    prompt:
      "Transparent full-body character sprite for a polished family animated movie. One expressive young raccoon tinkerer, with a soft grey coat, a dark mask around bright curious eyes, a ringed bushy tail and nimble little hands, wearing a rolled-sleeve sky-blue shirt and a mustard canvas work apron with empty pockets, small round goggles pushed up on the forehead. Standing and leaning forward slightly with one hand pointing conversationally toward the viewer's right, eyes looking right, an eager, curious grin. Visible whole body including the tip of the tail and the ears, clear silhouette, centered, subject uses 90 percent of the vertical image. 3D animated feature-quality character with soft hand-painted texture and warm rim light, appealing, slightly more grown-up proportions for ages 8 to 10, high production values. No platform, no scene, no tools, no shadows outside the silhouette, no other objects or text. True transparent background.",
  },
  owl: {
    name: '猫头鹰博士',
    file: 'owl.webp',
    ages: ['high'],
    personality:
      '沉稳的天文学家，说话清楚、有条理；常问孩子是怎么想的，帮孩子把想法画成图、写成式子，不替孩子算。',
    face: { x: 0.186, y: 0.02, size: 0.469 },
    prompt:
      "Transparent full-body character sprite for a polished family animated movie. One wise, friendly tawny owl astronomer, with soft brown-and-cream patterned feathers, large warm amber eyes behind small round brass-rimmed glasses, and short ear tufts, wearing a deep teal scholar's waistcoat with a tiny brass star pin. Standing upright and leaning forward slightly with one wing raised and its feather tips pointing conversationally toward the viewer's right like a hand, eyes looking right, a calm, thoughtful smile. Visible whole body including the feet and tail feathers, clear silhouette, centered, subject uses 90 percent of the vertical image. 3D animated feature-quality character with soft hand-painted texture and cool silver rim light, refined and not babyish, appealing for ages 10 to 12, high production values. No platform, no scene, no books, no shadows outside the silhouette, no other objects or text. True transparent background.",
  },
} as const satisfies Record<string, TeacherEntry>;

export type TeacherId = keyof typeof entries;

// Every teacher in the library, by id, each with the address of its picture.
export const teachers = catalog<TeacherId, TeacherEntry>(
  entries,
  import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' }),
);

export type LibraryTeacher = (typeof teachers)[TeacherId];
