import { spawnSync } from 'node:child_process';

// edge-tts, which asks Microsoft Edge's online read-aloud service to say the
// words: a pinned release run through uv, which installs it and the Python it
// names on first use. It needs the network while recording; children only
// ever hear the saved MP3 files. Its settings in lesson-voice.json: the voice
// `name`, its `rate` and `pitch` as edge-tts takes them (for example "-14%"
// and "+5Hz"), and the `package` and `python` uv runs. The service answers
// with a 24 kHz, 48 kbit/s mono MP3, which is saved as it comes.
export const edgeTts = {
  // What a listener hears change: another voice, speed or pitch.
  heard: ({ name, rate, pitch }) => ({ name, rate, pitch }),

  // Says the words in the UTF-8 file `text` into the MP3 file `target`.
  speak(settings, text, target) {
    const result = spawnSync(
      'uvx',
      [
        ...['--python', settings.python, '--from', settings.package, 'edge-tts'],
        ...['--file', text, '--voice', settings.name],
        `--rate=${settings.rate}`,
        `--pitch=${settings.pitch}`,
        ...['--write-media', target],
      ],
      { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } },
    );
    if (result.error) throw new Error(`Could not run uvx: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`edge-tts failed:\n${result.stderr}`);
  },
};
