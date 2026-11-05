import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import init from "@echogarden/espeak-ng-emscripten/espeak-ng.js";

const target = process.argv[2];
if (!target) throw new Error("Provide a fixture directory");
await mkdir(target, { recursive: true });
const { eSpeakNGWorker } = await init();
const speaker = new eSpeakNGWorker();
speaker.set_voice("cmn");
speaker.set_rate(140);
const phrases = [
  "我把十二平均分成三份，每份是四。",
  "二十五减去七等于十八。",
  "我先画一个三角形，再画两个圆。",
];
for (const [index, phrase] of phrases.entries()) {
  const chunks = [];
  speaker.synthesize(phrase, (samples) => {
    if (samples?.length) chunks.push(Buffer.from(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)));
  });
  const pcm = Buffer.concat(chunks);
  if (pcm.length < 1000) throw new Error("Missing synthesized fixture");
  for (const [ext, codec] of [["webm", "libopus"], ["m4a", "aac"]]) {
    const filename = join(target, (index + 1) + "." + ext);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", "22050", "-ac", "1", "-i", "pipe:0", "-c:a", codec, filename], { input: pcm });
    const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filename], { encoding: "utf8" }).trim());
    console.log(filename, seconds);
  }
}

