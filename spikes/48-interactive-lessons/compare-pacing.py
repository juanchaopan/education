
from pathlib import Path
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(sys.argv[1])
for name in ['pencil-video-audit','pencil-video-final']:
    p=root/name
    a=json.loads((p/'playback-events.json').read_text(encoding='utf-8'))
    s=json.loads((p/'scene-events.json').read_text(encoding='utf-8'))
    events={}
    for e in s:
        if e['link'].startswith('0,'):
            events.setdefault(e['link'],round(e['at']-a['began'],2))
    print(name,events,'wait after red-yellow',round(events['0,3']-events['0,2'],1))
    print('duration',round(a['end']-a['began'],1),'play starts',sum(e['name']=='playing' for e in a['events']),'ends',sum(e['name']=='ended' for e in a['events']))

