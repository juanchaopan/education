import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function captureAudio() {
  const NativeAudio = window.Audio;
  const AudioContext = window.AudioContext;
  const context = new AudioContext();
  const output = context.createMediaStreamDestination();
  const connect = window.AudioNode.prototype.connect;
  const events = [];
  const clock = () => (performance.timeOrigin + performance.now()) / 1000;
  window.AudioContext = function () {
    return context;
  };
  window.AudioNode.prototype.connect = function (target, ...args) {
    if (target === context.destination) connect.call(this, output);
    return connect.call(this, target, ...args);
  };
  window.Audio = function (...args) {
    const audio = new NativeAudio(...args);
    context.createMediaElementSource(audio).connect(context.destination);
    for (const name of ['playing', 'ended', 'pause']) {
      audio.addEventListener(name, () =>
        events.push({ name, at: clock(), time: audio.currentTime }),
      );
    }
    return audio;
  };
  window.lessonCapture = {
    start() {
      const parts = [];
      const recorder = new MediaRecorder(output.stream);
      const began = clock();
      recorder.ondataavailable = ({ data }) => parts.push(data);
      recorder.start();
      document.addEventListener('pointerdown', () => void context.resume(), {
        once: true,
        capture: true,
      });
      document.addEventListener('keydown', () => void context.resume(), {
        once: true,
        capture: true,
      });
      this.stop = () =>
        new Promise((done) => {
          const end = clock();
          recorder.onstop = () => {
            const reader = new FileReader();
            reader.onload = () => done({ audio: reader.result.split(',')[1], began, end, events });
            reader.readAsDataURL(new Blob(parts, { type: recorder.mimeType }));
          };
          recorder.stop();
        });
    },
  };
}

export async function prepareLessonCapture(page) {
  await page.addInitScript(captureAudio);
}

async function startScreencast(page) {
  const session = await page.context().newCDPSession(page);
  const frames = [];
  session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    void session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (metadata.timestamp) frames.push({ data, at: metadata.timestamp });
  });
  await session.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 86,
    maxWidth: 1080,
    maxHeight: 640,
  });
  return { session, frames };
}

async function writeFrames(dir, frames, began, end) {
  const first = Math.max(
    0,
    frames.findLastIndex((frame) => frame.at <= began),
  );
  const selected = frames.slice(first).filter((frame) => frame.at < end);
  if (!selected.length) throw new Error('Lesson recording has no frames in the recorded interval');
  selected[0].at = began;
  for (const [index, frame] of selected.entries()) {
    await writeFile(join(dir, 'frame-' + index + '.jpg'), Buffer.from(frame.data, 'base64'));
  }
  const playlist = [];
  let index = 0;
  for (let tick = 0; tick / 25 < end - began; tick++) {
    const at = began + tick / 25;
    while (selected[index + 1]?.at <= at) index++;
    playlist.push("file 'frame-" + index + ".jpg'", 'duration 0.04');
  }
  playlist.push("file 'frame-" + index + ".jpg'");
  await writeFile(join(dir, 'frames.ffconcat'), playlist.join('\n') + '\n');
}

function muxLesson(dir) {
  const video = join(dir, 'lesson-review.mp4');
  const ffmpeg = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-safe',
      '0',
      '-f',
      'concat',
      '-i',
      'frames.ffconcat',
      '-i',
      'browser-audio.webm',
      '-vf',
      'fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-shortest',
      video,
    ],
    { cwd: dir, encoding: 'utf8' },
  );
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
  if (!audio || !frames.length)
    throw new Error('Lesson recording is missing picture or audio data');
  await writeFrames(dir, frames, began, end);
  await writeFile(join(dir, 'browser-audio.webm'), Buffer.from(audio, 'base64'));
  const timeline = join(dir, 'playback-events.json');
  await writeFile(timeline, JSON.stringify({ began, end, events }, null, 2));
  const video = muxLesson(dir);
  if (failure) throw failure;
  return { video, timeline };
}
