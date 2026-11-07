
from pathlib import Path
import json,sys
p=Path(sys.argv[1])/'pencil-video-verified'
a=json.loads((p/'playback-events.json').read_text(encoding='utf-8'))
s=json.loads((p/'scene-events.json').read_text(encoding='utf-8'))
d={}
for e in s:
 if e['link'].startswith('0,'):
  d.setdefault(e['link'],round(e['at']-a['began'],3))
print('red pairs',d)
print('audio offset',round(a['audioBegan']-a['began'],3),'duration',round(a['end']-a['began'],2))
print('audio start/end',sum(e['name']=='playing' for e in a['events']),sum(e['name']=='ended' for e in a['events']))
print('red yellow to red green',round(d['0,3']-d['0,2'],2))
print('red rest expected',next(round(e['at']-a['began'],2) for e in s if e['words'].startswith('红笔留在原位。看')))

