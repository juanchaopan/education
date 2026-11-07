
from pathlib import Path
p=Path('scripts/lesson-review-capture.mjs')
s=p.read_text(encoding='utf-8-sig')
a=s.index('  const playlist = [];')
b=s.index("  await writeFile(join(dir, 'frames.ffconcat')",a)
s=s[:a]+'''  for (const [index, frame] of selected.entries()) {
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
'''+s[b:]
p.write_text(s,encoding='utf-8')

