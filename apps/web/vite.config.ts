import react from '@vitejs/plugin-react';
import { releaseRevision } from '@education/contracts';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { dayNightTheme } from './vite/day-night-theme.ts';

// The release a deployment builds, the same commit its /version.json reports.
// The page names it in a meta tag, so an open page can tell that a newer
// release is out. Local builds have none, and their pages never look for one.
function releaseName(revision = process.env.RELEASE_SHA): Plugin {
  return {
    name: 'education-release',
    transformIndexHtml: () =>
      revision && releaseRevision.test(revision)
        ? [{ tag: 'meta', attrs: { name: 'education-release', content: revision } }]
        : [],
  };
}

export default defineConfig({
  plugins: [react(), releaseName(), dayNightTheme()],
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:3001' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'vite/**/*.test.ts'],
  },
});
