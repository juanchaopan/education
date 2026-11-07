
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("    '<g id=\"motionObject\"", """    '<g id="gapBreakdown" class="gap-breakdown"><path d="M '+x(-1)+' 387 H '+x(5)+'" stroke="#f6c579" stroke-width="9"/><path d="M '+x(5)+' 387 H '+x(9)+'" stroke="#94d5ca" stroke-width="9"/>'+txt((x(-1)+x(5))/2,377,'追回 6 格','#ffdc9a',16)+txt((x(5)+x(9))/2,377,'还差 4 格','#bcebe2',16)+'</g>'+
    '<g id="motionObject" """.replace('Object"  ','Object" '))
s=s.replace("  $('motionObject').classList.toggle", "  $('gapBreakdown').classList.toggle('shown',mode==='teach'&&step===2);\n  $('motionObject').classList.toggle")
s=s.replace("  $('guide').hidden=mode!=='explore'||marks.size===2;", "  $('guide').hidden=mode!=='explore'||marks.size===2;\n  $('guide').disabled=busy;")
p.write_text(s,encoding='utf-8')

