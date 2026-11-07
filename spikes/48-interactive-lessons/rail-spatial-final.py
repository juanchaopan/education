
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("const fmt=v=>String(Number(v.toFixed(1))).replace('-','−');\n",'')
s=s.replace("ready=true;introPhase='push';update(0);audio('driveIntro');return;","ready=true;introPhase='push';update(0);return;")
s=s.replace("$('observations').hidden=found.size!==2;","$('observations').hidden=found.size!==2||locked;")
p.write_text(s,encoding='utf-8')

