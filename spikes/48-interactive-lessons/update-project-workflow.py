
from pathlib import Path
import sys
d=Path(sys.argv[1])
p=Path('AGENTS.md')
s=p.read_text(encoding='utf-8-sig')
anchor='所有改动通过 PR 合并。'
insert='在本项目里，同一条请求的 \`/change\` 加题目 PDF 表示按 [逐题设计互动教学与验收手册](docs/design/interactive-lesson-authoring.md) 从读题做到可操作预览、有声实录、冷启动自审和复验。覆盖全部可读题，常规取舍直接做，只有实质性歧义、缺失资料或需授权时才停相应题。\n\n'
s=s.replace(anchor,insert+anchor,1)
p.write_text(s,encoding='utf-8')
p=Path('docs/design/interactive-lesson-authoring.md')
s=p.read_text(encoding='utf-8-sig')
s=s.replace('新题先完成内容与教法评审，再进入开发。','新题先完成内容与教法自审，再进入开发。')
s=s.replace('## 可复用的逐题自查卡',(d/'pdf-workflow-section.md').read_text(encoding='utf-8-sig').strip()+'\n\n## 可复用的逐题自查卡')
s=s.replace('时间轮拖过关键时刻也能记录，卡住可沿轨道找到下一次。','直接推车，快拖也在关键观察点停下。')
s=s.replace('E8 变化题能观察理由，受提示结果单独记录','E8 变化题能观察理由，受提示结果单独记录\nE11 附自然语速的连续有声录屏和逐段冷启动审查。快慢、误点和卡住已实测，改动有重录证据')
p.write_text(s,encoding='utf-8')

