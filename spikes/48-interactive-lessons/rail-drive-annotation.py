
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("    '<path class=\"track\" d=\"M162 196H1082 M162 286H1082 M162 415H1082\"/>'+ticks+", """    '<path class="track" d="M162 196H1082 M162 286H1082 M162 415H1082"/>'+ticks+
    text('speedM',996,182,'黄车每秒走 2 格','lane-key amber-text')+
    text('speedN',996,272,'蓝车每秒走 1 格','lane-key azure-text')+""")
s=s.replace("  time=limit(value,0,16);","  time=Math.round(limit(value,0,16)*10)/10;")
s=s.replace("  $('clock').textContent=fmt(time)+' 秒';","""  $('clock').textContent=fmt(time)+' 秒';
  $('speedM').textContent=level?'2 格/秒 × t 秒＝2t 格':'黄车每秒走 2 格';
  $('speedN').textContent=level?'1 格/秒 × t 秒＝1t 格':'蓝车每秒走 1 格';""")
s=s.replace("target===0?430:620","target===0?520:950")
p.write_text(s,encoding='utf-8')

