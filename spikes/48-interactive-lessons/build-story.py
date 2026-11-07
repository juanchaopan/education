
import json,base64
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
read=lambda file: (root/file).read_text(encoding='utf-8-sig')
rabbit=Image.open(root/'garden-rabbit.png')
print('Rabbit alpha',rabbit.getchannel('A').getextrema(),rabbit.getchannel('A').getpixel((0,0)))
def data(file,mime):
    return 'data:'+mime+';base64,'+base64.b64encode((root/file).read_bytes()).decode('ascii')
css=read('story.css').replace('__PLATE__',data('garden-plate.webp','image/webp'))
js=read('story.js').replace('__RABBIT__',data('garden-rabbit.webp','image/webp'))
html=read('story-template.html').replace('__STYLE__',css).replace('__CLIPS__',read('story-clips.json')).replace('__LINES__',read('story-lines.json')).replace('__SCRIPT__',js)
(root/'garden-story.html').write_text(html,encoding='utf-8')

