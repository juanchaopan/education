import { readFile } from 'node:fs/promises';

export async function readRevision(): Promise<string | undefined> {
  try {
    const value: unknown = JSON.parse(
      await readFile(new URL('../release.json', import.meta.url), 'utf8'),
    );
    const revision = (value as { revision?: unknown }).revision;
    if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision)) {
      throw new Error('Invalid build revision');
    }
    return revision;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
