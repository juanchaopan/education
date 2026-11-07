
import asyncio,json,base64
from pathlib import Path
from edge_tts import Communicate
p=Path(__file__).resolve().parent
data=json.loads((p/'continuity-lines.json').read_text(encoding='utf-8-sig'))
limit=asyncio.Semaphore(4)
async def generate(lesson,key,text):
    async with limit:
        clip=p/(lesson+'-'+key+'.mp3')
        for i in range(3):
            try:
                await Communicate(text,'zh-CN-XiaoxiaoNeural',rate='-13%',pitch='+4Hz').save(str(clip))
                if clip.stat().st_size>1200:return lesson,key,base64.b64encode(clip.read_bytes()).decode()
            except Exception:
                if i==2:raise
            await asyncio.sleep(1)
        raise RuntimeError(key)
async def main():
    items=await asyncio.gather(*(generate(lesson,k,v) for lesson,rows in data.items() for k,v in rows.items()))
    for lesson in data:
        for suffix,values in [('lines',data[lesson]),('clips',{k:v for l,k,v in items if l==lesson})]:
            dest=p/(lesson+'-'+suffix+'.json')
            current=json.loads(dest.read_text(encoding='utf-8-sig'))
            current.update(values)
            dest.write_text(json.dumps(current,ensure_ascii=False),encoding='utf-8')
asyncio.run(main())


