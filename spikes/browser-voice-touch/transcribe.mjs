import { readFile } from "node:fs/promises";

const key = process.env.SPIKE_OPENAI_API_KEY;
if (!key) throw new Error("SPIKE_OPENAI_API_KEY is missing");

const phrases = [
  "我把十二平均分成三份，每份是四。",
  "二十五减去七等于十八。",
  "我先画一个三角形，再画两个圆。",
];
const formats = { webm: "audio/webm", m4a: "audio/mp4" };
const durations = JSON.parse(await readFile(new URL("fixtures/durations.json", import.meta.url), "utf8"));

for (const [index, phrase] of phrases.entries()) {
  for (const [ext, type] of Object.entries(formats)) {
    const name = (index + 1) + "." + ext;
    const audio = await readFile(new URL("fixtures/" + name, import.meta.url));
    const body = new FormData();
    body.set("model", "gpt-transcribe");
    body.set("languages[]", "zh-cn");
    body.set("file", new Blob([audio], { type }), name);
    const start = performance.now();
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      signal: AbortSignal.timeout(20000),
      body,
    });
    const result = await response.json();
    console.log(JSON.stringify({
      ext, seconds: durations[name], bytes: audio.length, elapsedMs: Math.round(performance.now() - start),
      status: response.status, expected: phrase,
      transcript: result.text, languages: result.languages, error: result.error?.code,
    }));
    if (!response.ok) process.exitCode = 1;
  }
}

