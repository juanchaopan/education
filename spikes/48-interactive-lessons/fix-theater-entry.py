
from pathlib import Path
d=Path(__file__).resolve().parent
p=d/'story-template.html'
s=p.read_text(encoding='utf-8-sig')
a=s.index('<div class="film-title">')
b=s.index('<div class="film-meta"',a)
s=s[:a]+'''<div class="film-title"><small>小小探索家 · 菜园小剧场</small><h1>一棵青菜有多重？</h1><button type="button" id="entry" aria-label="进入菜园小剧场"><i aria-hidden="true">▶</i> 开始短片</button></div>
'''+s[b:]
s=s.replace('<button id="entry" aria-label="进入菜园小剧场"></button>','<noscript><p class="no-script">请用 Chrome 或 Edge 打开此短片。</p></noscript>')
p.write_text(s,encoding='utf-8')
for name in ['story.js','pencil-story.js']:
 p=d/name
 s=p.read_text(encoding='utf-8-sig')
 s=s.replace("entry.addEventListener('click',()=>{","film.addEventListener('click',()=>{\n  if(film.dataset.shot!=='opening')return;")
 p.write_text(s,encoding='utf-8')

