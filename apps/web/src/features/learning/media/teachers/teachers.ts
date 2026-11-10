import { catalog, type Age } from '../library';

// One character who tells lessons: its name, which the captions and the
// question panel use, the school years it suits, its manner as the lines
// should keep it, and the prompt it was generated from. Where it stands is
// the lesson's choice, since that depends on the scene.
type TeacherEntry = Readonly<{
  name: string;
  file: string;
  ages: readonly [Age, ...Age[]];
  personality: string;
  prompt: string;
}>;

const entries = {
  rabbit: {
    name: '小兔',
    file: 'rabbit.webp',
    ages: ['low'],
    personality:
      '菜园里的小园丁，好奇、爱动手，说话轻快温和；常常指着东西请孩子看一看、动一动，不急着说出答案。',
    prompt:
      "Transparent full-body character sprite for a polished family animated movie about a sunlit vegetable garden. One small expressive cream-white rabbit gardener, with two tall asymmetrical ears, black curious eyes, peach nose, green-blue denim overalls, small apricot-yellow neckerchief, short plump body with tiny paws. Standing and leaning forward slightly with one hand pointing conversationally toward the viewer's right, eyes looking right. Visible whole body with clear silhouette and ear tips, centered, subject uses 90 percent of vertical image. 3D animated feature-quality character with soft hand-painted texture and warm rim light, appealing proportions, whimsical, high production values. No platform, no scene, no shadows outside silhouette, no other objects or text. True transparent background.",
  },
} as const satisfies Record<string, TeacherEntry>;

export type TeacherId = keyof typeof entries;

// Every teacher in the library, by id, each with the address of its picture.
export const teachers = catalog<TeacherId, TeacherEntry>(
  entries,
  import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' }),
);

export type LibraryTeacher = (typeof teachers)[TeacherId];
