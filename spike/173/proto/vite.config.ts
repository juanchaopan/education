// 原型页的 Vite 配置：直接引用 apps/web 的舞台、菜园道具和题目脚本，标题字体用网站自己的插件生成。
// 依赖从上层目录的 node_modules 解析，所以把它加进可读目录；预构建缓存放在 SPIKE_CACHE 指定的临时目录。
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { titleFont } from '../../../apps/web/vite/title-font.ts';

const at = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  root: at('.'),
  cacheDir: process.env.SPIKE_CACHE,
  plugins: [
    react(),
    titleFont({
      sourceDirectory: at('../../../apps/web/src'),
      output: at('../../../apps/web/src/styles/generated/title-font.woff2'),
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 6173,
    strictPort: true,
    fs: { strict: false },
  },
});
