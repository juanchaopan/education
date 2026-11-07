Chromium 可用 [本地录制辅助脚本](../../scripts/lesson-review-capture.mjs) 实录同一浏览器里的画面、旁白和 Web Audio 音效。需要 FFmpeg 和独立的 Playwright 会话，使用本地试题和测试数据。脚本只在录制会话中接入音频输出，不录麦克风。用播放器抽查输出视频确实能听到声音，并复核同步。声音缺失时要改用其他实录工具。

```js
import { prepareLessonCapture, recordLesson } from './scripts/lesson-review-capture.mjs';

await prepareLessonCapture(page);
await page.goto(previewUrl);
const evidence = await recordLesson(page, 'test-results/lesson-audit/problem-01', async () => {
  // 用浏览器从冷启动实际操作到结束。每个动作由题目自己的审查脚本描述。
  await runAsLearner(page);
});
```

输出包含 MP4、媒体事件时间线和本地中间文件。目录留在本地，录制脚本的通过只说明能生成证据。
