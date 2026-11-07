import asyncio,json,base64
from pathlib import Path
from edge_tts import Communicate
root=Path(__file__).resolve().parent
lines=json.loads((root/'pencil-lines.json').read_text(encoding='utf-8-sig'))
folder=root/'pencil-clips'
folder.mkdir(exist_ok=True)
limit=asyncio.Semaphore(3)
async def clip(key,text):
    async with limit:
        out=folder/(key+'.mp3')
        for attempt in range(3):
            try:
                await Communicate(text,'zh-CN-XiaoxiaoNeural',rate='-14%',pitch='+5Hz').save(str(out))
                if out.stat().st_size>2000:
                    print(key,out.stat().st_size,flush=True)
                    return (key,base64.b64encode(out.read_bytes()).decode('ascii'))
            except Exception:
                if attempt==2: raise
                await asyncio.sleep(1.2)
        raise RuntimeError(key)
async def main():
    result=await asyncio.gather(*(clip(k,t) for k,t in lines.items()))
    (root/'pencil-clips.json').write_text(json.dumps(dict(result)),encoding='utf-8')
asyncio.run(main())


