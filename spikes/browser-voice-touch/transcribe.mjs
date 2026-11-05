import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const key = process.env.SPIKE_OPENAI_API_KEY;
if (!key) throw new Error("SPIKE_OPENAI_API_KEY is missing");

const phrases = [
  "我把十二平均分成三份，每份是四。",
  "二十五减去七等于十八。",
  "我先画一个三角形，再画两个圆。",
];
const formats = [
  { ext: "webm", type: "audio/webm", codec: "libopus" },
  { ext: "m4a", type: "audio/mp4", codec: "aac" },
];
const dir = await mkdtemp(join(tmpdir(), "spike-28-"));
const wav = join(dir, "phrase.wav");

try {
  for (const phrase of phrases) {
    execFileSync("espeak-ng", ["-v", "cmn", "-s", "140", "-w", wav, phrase]);
    for (const { ext, type, codec } of formats) {
      const name = join(dir, "phrase." + ext);
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", wav, "-c:a", codec, name]);
      const audio = await readFile(name);
      const seconds = Number(execFileSync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", name,
      ], { encoding: "utf8" }).trim());
      const body = new FormData();
      body.set("model", "gpt-transcribe");
      body.set("languages[]", "zh-cn");
      body.set("file", new Blob([audio], { type }), "phrase." + ext);
      const start = performance.now();
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key },
        signal: AbortSignal.timeout(20000),
        body,
      });
      const result = await response.json();
      console.log(JSON.stringify({
        ext, seconds, bytes: audio.length, elapsedMs: Math.round(performance.now() - start),
        status: response.status, expected: phrase,
        transcript: result.text, languages: result.languages, error: result.error?.code,
      }));
      if (!response.ok) process.exitCode = 1;
    }
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

