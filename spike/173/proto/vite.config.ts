// 原型页的 Vite 配置：直接引用 apps/web 的舞台、菜园道具和题目脚本。标题字体只用在片头，
// 原型不显示片头，所以不生成字体。依赖从上层目录的 node_modules 解析，所以放开可读目录；
// 预构建缓存放在 SPIKE_CACHE 指定的临时目录。
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  cacheDir: process.env.SPIKE_CACHE,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 6173,
    strictPort: true,
    fs: { strict: false },
  },
});
