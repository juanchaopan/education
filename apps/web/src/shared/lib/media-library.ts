// The school years a picture suits: the lower (grades 1–2), middle (3–4) and
// upper (5–6) years of primary school.
export type Age = 'low' | 'middle' | 'high';

export const ageNames: Readonly<Record<Age, string>> = {
  low: '低年级（1–2）',
  middle: '中年级（3–4）',
  high: '高年级（5–6）',
};

// A library's entries keyed by id, each with its id and the address of its
// picture file, found among the library folder's files by name, so a listed
// picture is the very file beside the list. Only the address is taken; the
// picture itself downloads when a page shows it. The backdrop, teacher and
// cover libraries all list their pictures this way.
export function catalog<Id extends string, Entry extends Readonly<{ file: string }>>(
  entries: Readonly<Record<Id, Entry>>,
  files: Readonly<Record<string, string>>,
) {
  return Object.fromEntries(
    Object.entries<Entry>(entries).map(([id, entry]) => {
      const image = files[`./${entry.file}`];
      if (image === undefined) throw new Error(`${entry.file} is not in the library`);
      return [id, { ...entry, id, image }];
    }),
  ) as Readonly<Record<Id, Entry & Readonly<{ id: Id; image: string }>>>;
}
