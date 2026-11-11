import { fileURLToPath } from 'node:url';

// Module hooks that let Node load a lesson's TypeScript script the way the
// site's bundler does, without the bundler. A recording import gives the path
// of the file it names, whether or not that file has been recorded yet, so a
// tool learns where each line's recording belongs. A relative import written
// without its extension, as the site's code writes them, finds its `.ts` file.
// Node strips the types of `.ts` files only, so a script and what it imports
// are plain TypeScript, without JSX.

const recording = /\.mp3$/;
const relative = /^\.{1,2}\//;

export async function resolve(specifier, context, nextResolve) {
  if (recording.test(specifier))
    return { url: new URL(specifier, context.parentURL).href, shortCircuit: true };
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!relative.test(specifier) || error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return nextResolve(`${specifier}.ts`, context);
  }
}

export async function load(url, context, nextLoad) {
  if (!recording.test(url)) return nextLoad(url, context);
  const source = `export default ${JSON.stringify(fileURLToPath(url))};`;
  return { format: 'module', source, shortCircuit: true };
}
