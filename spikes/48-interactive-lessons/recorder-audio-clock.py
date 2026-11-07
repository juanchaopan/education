
from pathlib import Path
p=Path('scripts/lesson-review-capture.mjs')
s=p.read_text(encoding='utf-8-sig')
a=s.index("      document.addEventListener(")
b=s.index("      this.stop",a)
s=s[:a]+'''      let audioBegan;
      const resume = () => {
        void context.resume().then(() => {
          audioBegan ??= clock();
        });
      };
      for (const event of ['pointerdown', 'keydown']) {
        document.addEventListener(event, resume, { once: true, capture: true });
      }
'''+s[b:]
s=s.replace("audio: reader.result.split(',')[1], began, end, events","audio: reader.result.split(',')[1], began, audioBegan: audioBegan ?? began, end, events")
s=s.replace("async function writeFrames(dir, frames, began, end) {","async function writeFrames(dir, frames, began, end) {\n  frames.sort((a, b) => a.at - b.at);")
s=s.replace("function muxLesson(dir) {","function muxLesson(dir, audioOffset) {")
s=s.replace("      'browser-audio.webm',\n      '-vf',","      'browser-audio.webm',\n      '-af',\n      'adelay=' + audioOffset + ':all=1,apad',\n      '-vf',")
s=s.replace("const { audio, began, end, events } = result;","const { audio, began, audioBegan, end, events } = result;")
s=s.replace("JSON.stringify({ began, end, events }, null, 2)","JSON.stringify({ began, audioBegan, end, events }, null, 2)")
s=s.replace("const video = muxLesson(dir);","const video = muxLesson(dir, Math.max(0, Math.round((audioBegan - began) * 1000)));")
p.write_text(s,encoding='utf-8')

