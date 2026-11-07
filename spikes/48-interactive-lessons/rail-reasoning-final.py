
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("function sweep(target,rewind=false){\n  if(!rewind&&!canDrive())return;","function sweep(target){\n  if(!canDrive())return;")
s=s.replace("  const apply=rewind?value=>{stopAt=null;update(value);return false;}:move;\n  if(reduced.matches){apply(target);return;}\n  const duration=rewind?520:950;","  if(reduced.matches){move(target);return;}\n  const duration=950;")
s=s.replace('const stopped=apply(start+(target-start)*progress);','const stopped=move(start+(target-start)*progress);')
s=s.replace('  runs++;milestone=0;', '  animation++;runs++;milestone=0;')
s=s.replace("['ArrowRight','ArrowLeft','Enter',' '].includes(event.key)","['ArrowRight','Enter',' '].includes(event.key)")
s=s.replace("sweep(limit(Math.round(time)+(event.key==='ArrowLeft'?-1:1),0,16));","sweep(limit(Math.round(time)+1,0,14));")
s=s.replace("推黄车，方向键移动，点一下走一秒","推黄车，按右方向键或点一下走一秒")
s=s.replace("    thought='看原来的十格，去掉金色的已追回部分，剩下的就是现在还差的。';","    thought='在起点那段十格里，去掉金色的已追回部分。';")
p.write_text(s,encoding='utf-8')

