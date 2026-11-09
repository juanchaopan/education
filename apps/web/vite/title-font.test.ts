import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { sourceTexts, titleCharacters } from './title-font.ts';

let folder: string | undefined;

afterEach(async () => {
  if (folder) await rm(folder, { recursive: true, force: true });
  folder = undefined;
});

it('keeps each Chinese character once, in a stable order, after printable ASCII', () => {
  const characters = titleCharacters(['一棵青菜有多重？', '青菜，多重']);
  expect(characters.startsWith(' !"#')).toBe(true);
  expect(characters.endsWith('~一多有棵菜重青，？')).toBe(true);
  expect(titleCharacters(['青菜，多重', '一棵青菜有多重？'])).toBe(characters);
});

it('ignores text that is neither Chinese nor ASCII', () => {
  expect(titleCharacters(['café ✳ 😀'])).toBe(titleCharacters([]));
});

it('reads the source files a page is built from and leaves out tests', async () => {
  folder = await mkdtemp(path.join(tmpdir(), 'title-font-'));
  await mkdir(path.join(folder, 'pages'));
  await writeFile(path.join(folder, 'pages', 'Page.tsx'), 'const title = "题库";');
  await writeFile(path.join(folder, 'copy.ts'), 'export const word = "探索";');
  await writeFile(path.join(folder, 'Page.test.tsx'), 'it("测试");');
  await writeFile(path.join(folder, 'notes.md'), '笔记');
  const texts = await sourceTexts(folder);
  expect(texts.sort()).toEqual(['const title = "题库";', 'export const word = "探索";'].sort());
});
