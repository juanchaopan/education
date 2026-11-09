import type { Box } from '../components/lesson-stage/stage-look';

// The school years a picture suits: the lower (grades 1–2), middle (3–4) and
// upper (5–6) years of primary school.
export type Age = 'low' | 'middle' | 'high';

export const ageNames: Readonly<Record<Age, string>> = {
  low: '低年级（1–2）',
  middle: '中年级（3–4）',
  high: '高年级（5–6）',
};

// Each lesson draws on the same 1200×675 world, and every library picture is
// laid over the whole of it.
export const world: Box = { x: 0, y: 0, width: 1200, height: 675 };

// Whether a box lies wholly inside another.
export function inside(box: Box, frame: Box) {
  return (
    box.x >= frame.x &&
    box.y >= frame.y &&
    box.x + box.width <= frame.x + frame.width &&
    box.y + box.height <= frame.y + frame.height
  );
}

// The addresses of a library's picture files, found by file name, so a
// listed picture is the very file beside the list. Only the address is
// taken; the picture itself downloads when a lesson shows it.
export function pictureFiles(found: Readonly<Record<string, string>>) {
  return (file: string) => {
    const address = found[`./${file}`];
    if (address === undefined) throw new Error(`${file} is not in the library`);
    return address;
  };
}

// A library's entries with their ids and picture addresses, keyed by id.
export function catalog<Id extends string, Entry extends Readonly<{ file: string }>>(
  entries: Readonly<Record<Id, Entry>>,
  picture: (file: string) => string,
) {
  return Object.fromEntries(
    Object.entries<Entry>(entries).map(([id, entry]) => [
      id,
      { ...entry, id, image: picture(entry.file) },
    ]),
  ) as Readonly<Record<Id, Entry & Readonly<{ id: Id; image: string }>>>;
}
