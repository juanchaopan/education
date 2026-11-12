import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

// LXGW WenKai at the title weight, and its SIL Open Font License, which the
// site ships beside the font it builds from it.
const sourceFont =
  require.resolve('@fontsource/lxgw-wenkai/files/lxgw-wenkai-latin-700-normal.woff2');
const licence = require.resolve('@fontsource/lxgw-wenkai/LICENSE');

// The characters Chinese text is written in, as code point ranges: the
// middle dot, the quotation marks, dashes and ellipsis it shares with other
// scripts, Chinese punctuation, the CJK ideographs with extension A, and the
// full-width forms. Printable ASCII is always kept, for digits and Latin
// letters.
const chineseRanges = [
  [0x00b7, 0x00b7],
  [0x2010, 0x2027],
  [0x3000, 0x303f],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xff00, 0xffef],
];
const ascii = Array.from({ length: 95 }, (_, offset) => String.fromCharCode(32 + offset)).join('');

function isChinese(character: string) {
  const code = character.codePointAt(0) ?? 0;
  return chineseRanges.some(([first, last]) => code >= first && code <= last);
}

// Every character the titles can show, once each and in a stable order, so
// the same texts always give the same font.
export function titleCharacters(texts: Iterable<string>) {
  const found = new Set<string>();
  for (const text of texts)
    for (const character of text) if (isChinese(character)) found.add(character);
  return ascii + [...found].sort().join('');
}

// The text of every source file the site is built from; tests never reach a
// page, so they are left out.
export async function sourceTexts(directory: string) {
  const files = await readdir(directory, { recursive: true });
  const sources = files.filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
  return Promise.all(sources.map((file) => readFile(path.join(directory, file), 'utf8')));
}

// The titles of the problem catalogue and the grade, subject and category
// names of its books, which reach the page from the API rather than from the
// source.
async function catalogueTexts() {
  const { problemRegistry } = await import('@education/problems/server');
  return [
    ...problemRegistry.current.map((problem) => problem.title),
    ...problemRegistry.books.flatMap(({ grade, subject, category }) => [grade, subject, category]),
  ];
}

// The words of every lesson's content, such as the teacher's lines shown in
// the subtitle, which the site loads from the problem package rather than
// from its own source: the built content modules beside the content types'
// module.
async function lessonContentTexts() {
  const module = fileURLToPath(import.meta.resolve('@education/problems/lesson-content'));
  const folder = path.join(path.dirname(module), 'lessons');
  const files = (await readdir(folder)).filter((file) => file.endsWith('.js'));
  return Promise.all(files.map((file) => readFile(path.join(folder, file), 'utf8')));
}

// Writes the title font for `characters`, unless the font already on disk was
// built from exactly those characters.
async function writeTitleFont(characters: string, output: string) {
  const record = `${output}.chars`;
  if (existsSync(output) && existsSync(record) && (await readFile(record, 'utf8')) === characters)
    return;
  const font = await subsetFont(await readFile(sourceFont), characters, { targetFormat: 'woff2' });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, font);
  await writeFile(record, characters);
}

type Options = { sourceDirectory: string; output: string };

// Builds the self-hosted title font when a build or the dev server starts:
// LXGW WenKai cut down to the characters the site's own text, its lessons'
// content and its problem catalogue use, so no page loads the whole typeface
// or any font from elsewhere. Unit tests never draw text, so they skip it.
export function titleFont({ sourceDirectory, output }: Options): Plugin {
  return {
    name: 'education-title-font',
    async buildStart() {
      if (process.env.VITEST) return;
      const texts = await Promise.all([
        sourceTexts(sourceDirectory),
        lessonContentTexts(),
        catalogueTexts(),
      ]);
      await writeTitleFont(titleCharacters(texts.flat()), output);
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'fonts/LXGW-WenKai-OFL.txt',
        source: await readFile(licence, 'utf8'),
      });
    },
  };
}
