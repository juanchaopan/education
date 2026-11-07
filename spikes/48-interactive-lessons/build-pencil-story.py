
import base64
from pathlib import Path
root=Path(__file__).resolve().parent
read=lambda file: (root/file).read_text(encoding='utf-8-sig')
encoded='data:image/webp;base64,'+base64.b64encode((root/'pencil-plate.webp').read_bytes()).decode('ascii')
css=(read('story.css')+'\n'+read('pencil-story.css')).replace('__PLATE__',encoded)
js=read('pencil-story.js')
js=js.replace("    show(names[row]+names[cursor]+'，第 '+work.length+' 对。'+names[row]+'笔还留在原位。');","    if (player.paused) show(names[row]+names[cursor]+'，第 '+work.length+' 对。'+names[row]+'笔还留在原位。');")

html=read('story-template.html').replace('菜园小剧场','彩铅小剧场').replace('一棵青菜有多重？','给彩铅找搭档').replace('轻点画面，听小兔说','轻点桌面，开始找搭档').replace('菜园天平互动短片','彩铅配对互动短片').replace('可互动的菜园道具','可互动的彩铅和配对卡').replace('__STYLE__',css).replace('__CLIPS__',read('pencil-clips.json')).replace('__LINES__',read('pencil-lines.json')).replace('__SCRIPT__',js)
(root/'pencil-story.html').write_text(html,encoding='utf-8')

