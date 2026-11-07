
from pathlib import Path
import sys
d=Path(sys.argv[1])
p=Path('AGENTS.md')
s=p.read_text(encoding='utf-8-sig').replace(chr(92)+chr(96),chr(96))
p.write_text(s,encoding='utf-8')
p=Path('docs/design/interactive-lesson-authoring.md')
s=p.read_text(encoding='utf-8-sig')
line='E11 附自然语速的连续有声录屏和逐段冷启动审查。快慢、误点和卡住已实测，改动有重录证据'
s=s.replace(line+'\n','').replace('每项填写：状态',line+'\n每项填写：状态',1)
needle='每个关键时间戳可用这一行记录：'
sample=(d/'recorder-doc.md').read_text(encoding='utf-8-sig').strip()
s=s.replace(needle,sample+'\n\n'+needle)
p.write_text(s,encoding='utf-8')

