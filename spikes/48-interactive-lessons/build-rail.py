
import base64
from pathlib import Path
root=Path(__file__).resolve().parent
read=lambda file:(root/file).read_text(encoding='utf-8-sig')
css=read('rail.css').replace('__PLATE__','data:image/webp;base64,'+base64.b64encode((root/'rail-plate.webp').read_bytes()).decode('ascii'))
js=read('rail-story.js')
html=read('rail-template.html').replace('__STYLE__',css).replace('__CLIPS__',read('rail-clips.json')).replace('__LINES__',read('rail-lines.json')).replace('__SCRIPT__',js)
(root/'rail-story.html').write_text(html,encoding='utf-8')

