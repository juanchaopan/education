
from pathlib import Path
import sys
d=Path(sys.argv[1])
p=d/'pencil-story.js'
s=p.read_text(encoding='utf-8-sig')
a=s.index("  const turn=++stamp;")
b=s.index("\n}\nfunction activate",a)
s=s[:a]+'''  const turn=++stamp;
  const continuePairs=()=>{
    if(stamp!==turn)return;
    if(cursor>=7)void nextRow();
    else void animateRemaining();
  };
  if(row===0)void speak('redRest',continuePairs);
  else void voiceQueue.then(continuePairs);'''+s[b:]
p.write_text(s,encoding='utf-8')
for p in [Path('scripts/lesson-review-capture.mjs'),d/'lesson-review-capture.mjs']:
 s=p.read_text(encoding='utf-8-sig')
 s=s.replace("'-c:v',\n    'libx264',","'-c:v',\n    'libx264',\n    '-preset',\n    'ultrafast',").replace("'-c:v', 'libx264',","'-c:v', 'libx264', '-preset', 'ultrafast',")
 p.write_text(s,encoding='utf-8')

