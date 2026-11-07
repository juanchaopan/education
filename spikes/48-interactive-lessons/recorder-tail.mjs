
async function startScreencast(page) {
  const session = await page.context().newCDPSession(page);
  const frames = [];
  session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    void session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (metadata.timestamp) frames.push({ data, at: metadata.timestamp });
  });
  await session.send('Page.startScreencast', {
    format: 'jpeg', quality: 86, maxWidth: 1080, maxHeight: 640,
  });
  return { session, frames };
}

async function writeFrames(dir, frames, began, end) {
  const first = Math.max(0, frames.findLastIndex((frame) => frame.at <= began));
  const selected = frames.slice(first).filter((frame) => frame.at < end);
  if (!selected.length) throw new Error('Lesson recording has no frames in the recorded interval');
  selected[0].at = began;
  const playlist = [];
  for (const [index, frame] of selected.entries()) {
    const name = 'frame-' + index + '.jpg';
    await writeFile(join(dir, name), Buffer.from(frame.data, 'base64'));
    const duration = Math.max(0.001, (selected[index + 1]?.at ?? end) - frame.at);
    playlist.push("file '" + name + "'", 'duration ' + duration.toFixed(5));
  }
  playlist.push("file 'frame-" + (selected.length - 1) + ".jpg'");
  await writeFile(join(dir, 'frames.ffconcat'), playlist.join('\n') + '\n');
}

function muxLesson(dir) {
  const video = join(dir, 'lesson-review.mp4');
  const ffmpeg = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-safe', '0', '-f', 'concat', '-i', 'frames.ffconcat',
    '-i', 'browser-audio.webm', '-vf', 'fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', '-shortest', video,
  ], { cwd: dir, encoding: 'utf8' });
  if (ffmpeg.error || ffmpeg.status !== 0) throw new Error(ffmpeg.error?.message ?? ffmpeg.stderr);
  return video;
}

export async function recordLesson(page, outputDirectory, interact) {
  const dir = resolve(outputDirectory);
  await mkdir(dir, { recursive: true });
  const { session, frames } = await startScreencast(page);
  let result;
  let failure;
  try {
    await page.evaluate(() => window.lessonCapture.start());
    try {
      await interact();
    } catch (error) {
      failure = error;
    }
    result = await page.evaluate(() => window.lessonCapture.stop());
  } finally {
    await session.send('Page.stopScreencast').catch(() => {});
    await session.detach();
  }
  const { audio, began, end, events } = result;
  if (!audio || !frames.length) throw new Error('Lesson recording is missing picture or audio data');
  await writeFrames(dir, frames, began, end);
  await writeFile(join(dir, 'browser-audio.webm'), Buffer.from(audio, 'base64'));
  const timeline = join(dir, 'playback-events.json');
  await writeFile(timeline, JSON.stringify({ began, end, events }, null, 2));
  const video = muxLesson(dir);
  if (failure) throw failure;
  return { video, timeline };
}

