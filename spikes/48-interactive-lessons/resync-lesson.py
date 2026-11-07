
from pathlib import Path
from bisect import bisect_right
import subprocess,sys
p=Path(sys.argv[1])
t=0
timeline=[]
contents=(p/'frames.ffconcat').read_text().splitlines()
for i in range(0,len(contents)-1,2):
    name=contents[i]
    duration=float(contents[i+1].split()[1])
    timeline.append((t,name))
    t+=duration
times=[item[0] for item in timeline]
out=[]
for tick in range(int(t*25)):
    out.extend((timeline[bisect_right(times,tick/25)-1][1], 'duration 0.04'))
out.append(out[-2])
(p/'sync.ffconcat').write_text('\n'.join(out)+'\n')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i','sync.ffconcat','-i','browser-audio.webm','-vf','fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-shortest','review-synced.mp4'],cwd=p,check=True)

